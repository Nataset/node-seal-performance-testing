(async () => {
    const fs = require('fs');
    const SEAL = require('node-seal');
    const seal = await SEAL();

    const performances = {
        BFV: [],
        BGV: [],
        CKKS: [],
    };

    const timeKeyFunction = (record, name, callBack) => {
        const startTime = performance.now();
        const returnValue = callBack();
        const endTime = performance.now();
        record['keys'][name]
            ? (record['keys'][name]['time'] = endTime - startTime)
            : (record['keys'][name] = { time: endTime - startTime });
        return returnValue;
    };

    const timeOperatorFunction = (record, name, callBack) => {
        const startTime = performance.now();
        const returnValue = callBack();
        const endTime = performance.now();
        record['operators'][name]
            ? (record['operators'][name]['time'] = endTime - startTime)
            : (record['operators'][name] = { time: endTime - startTime });

        return returnValue;
    };

    const getSize = value => {
        const valueBase64 = value.save();
        return valueBase64.length / 1e6;
    };

    const printParameters = context => {
        const contextData = context.keyContextData;
        let schemeName = null;

        switch (contextData.parms.scheme) {
            case seal.SchemeType.bfv:
                schemeName = 'BFV';
                break;
            case seal.SchemeType.ckks:
                schemeName = 'CKKS';
                break;
            case seal.SchemeType.bgv:
                schemeName = 'BGV';
                break;
            default:
                throw new Error('unsupported scheme');
        }

        console.log('/');
        console.log('| Encryption parameters:');
        console.log(`| Scheme: ${schemeName}:`);
        console.log(`| PolyModulusDegree: ${contextData.parms.polyModulusDegree}`);

        let bitCount = '(';
        contextData.parms.coeffModulus.forEach((coeff, i) => {
            bitCount += ` ${seal.Modulus(coeff).bitCount}`;
            if (contextData.parms.coeffModulus.length - 1 != i) {
                bitCount += ` +`;
            }
        });
        bitCount += ' )';

        console.log(`| CoeffModulus size: ${contextData.totalCoeffModulusBitCount} ${bitCount}`);

        const parmsValue = {
            scheme: schemeName,
            polyModulus: contextData.parms.polyModulusDegree,
            coeffModulus: contextData.totalCoeffModulusBitCount,
        };

        if (contextData.parms.scheme == seal.SchemeType.bfv) {
            console.log(`| PlainModulus: ${contextData.parms.plainModulus.value}`);
            parmsValue.plainModulus = Number(contextData.parms.plainModulus.value);
        }
        console.log('\\');

        return parmsValue;
    };

    const BFVPerformanceTest = context => {
        const record = {
            polyModulus: 0,
            coeffModulus: 0,
            keys: {},
            operators: {},
        };

        const parmsValue = printParameters(context);

        record.polyModulus = parmsValue.polyModulus;
        record.coeffModulus = parmsValue.coeffModulus;

        const parms = context.firstContextData.parms;
        const plainModulus = parms.plainModulus;

        const timeKeyFunctionBFV = (name, callBack) => timeKeyFunction(record, name, callBack);
        const timeOperatorFunctionBFV = (name, callBack) =>
            timeOperatorFunction(record, name, callBack);

        process.stdout.write('\nGenerating secret key: ');
        const { keyGenerator, secretKey } = timeKeyFunctionBFV('Secret key', () => {
            const keyGenerator = seal.KeyGenerator(context);
            const secretKey = keyGenerator.secretKey();
            return { keyGenerator, secretKey };
        });
        console.log(`Done [${record.keys['Secret key'].time.toFixed(2)}ms]`);
        record.keys['Secret key'].size = getSize(secretKey);

        process.stdout.write('Generating public key: ');
        const publicKey = timeKeyFunctionBFV('Public key', () => keyGenerator.createPublicKey());
        console.log(`Done [${record.keys['Public key'].time.toFixed(2)}ms]`);
        record.keys['Public key'].size = getSize(publicKey);

        let relinKeys = null;
        let galoisKeys = null;

        if (context.usingKeyswitching) {
            process.stdout.write('Generating relinearization keys: ');
            relinKeys = timeKeyFunctionBFV('Relinear keys', () => keyGenerator.createRelinKeys());
            console.log(`Done [${record.keys['Relinear keys'].time.toFixed(2)}ms]`);
            record.keys['Relinear keys'].size = getSize(relinKeys);

            process.stdout.write('Generating Galois keys: ');
            galoisKeys = timeKeyFunctionBFV('Galois keys', () => keyGenerator.createGaloisKeys());
            console.log(`Done [${record.keys['Galois keys'].time.toFixed(2)}ms]`);
            // when polyModulus equal to 16384, it can not save Galois keys to Base64
            if (record.polyModulus != 16384) record.keys['Galois keys'].size = getSize(galoisKeys);
        }

        const encryptor = seal.Encryptor(context, publicKey);
        const decryptor = seal.Decryptor(context, secretKey);
        const evaluator = seal.Evaluator(context);
        const encoder = seal.BatchEncoder(context);

        // How many test we will run
        const count = 10;
        let dotCount = 0;

        // Create array to test on
        let podValues = Int32Array.from({ length: encoder.slotCount }, () =>
            Math.floor(Math.random() * Number(plainModulus.value)),
        );

        process.stdout.write('\nRunning tests\r');
        for (let i = 0; i < count; i++) {
            // [Encoding]
            let plainText = timeOperatorFunctionBFV('Encode', () => encoder.encode(podValues));
            record.operators['Encode'].size = 'Plain: ' + getSize(plainText).toFixed(3);

            // [Decoding]
            timeOperatorFunctionBFV('Decode', () => encoder.decode(plainText, false));

            // [Encryption]
            const encrypted = timeOperatorFunctionBFV('Encrypt', () =>
                encryptor.encrypt(plainText),
            );
            record.operators['Encrypt'].size = 'Cipher: ' + getSize(encrypted).toFixed(3);

            // [Decryption]
            const plainTextResult = timeOperatorFunctionBFV('Decrypt', () =>
                decryptor.decrypt(encrypted),
            );
            record.operators['Decrypt'].size = 'Plain: ' + getSize(plainTextResult).toFixed(3);

            // [Add]
            const podValues1 = Int32Array.from({ length: encoder.slotCount }, (_, index) => index);
            const plainText1 = encoder.encode(podValues1);
            const podValues2 = Int32Array.from(
                { length: encoder.slotCount },
                (_, index) => index + 1,
            );
            const plainText2 = encoder.encode(podValues2);
            const encrypted1 = encryptor.encrypt(plainText1);
            const encrypted2 = encryptor.encrypt(plainText2);
            timeOperatorFunctionBFV('Add', () => {
                evaluator.add(encrypted1, encrypted1, encrypted1);
                evaluator.add(encrypted2, encrypted2, encrypted2);
                evaluator.add(encrypted1, encrypted2, encrypted1);
            });
            record.operators['Add'].size = 'Cipher: ' + getSize(encrypted1).toFixed(3);

            // [Multiply]
            encrypted1.reserve(context, 3);
            timeOperatorFunctionBFV('Multi', () => {
                evaluator.multiply(encrypted1, encrypted2, encrypted1);
            });
            record.operators['Multi'].size = 'Cipher: ' + getSize(encrypted1).toFixed(3);

            // [Multiply Plain]
            timeOperatorFunctionBFV('Multi Plain', () => {
                evaluator.multiplyPlain(encrypted2, plainText1, encrypted2);
            });
            record.operators['Multi Plain'].size = 'Cipher: ' + getSize(encrypted2).toFixed(3);

            // [Square]
            timeOperatorFunctionBFV('Square', () => {
                evaluator.square(encrypted2, encrypted2);
            });
            record.operators['Square'].size = 'Cipher: ' + getSize(encrypted2).toFixed(3);

            if (context.usingKeyswitching) {
                // [Relinearize]
                timeOperatorFunctionBFV('Relinearize', () =>
                    evaluator.relinearize(encrypted1, relinKeys, encrypted1),
                );
                record.operators['Relinearize'].size = 'Cipher: ' + getSize(encrypted1).toFixed(3);

                // [Rotate Rows]
                timeOperatorFunctionBFV('Rotate Rows', () => {
                    evaluator.rotateRows(encrypted1, 1, galoisKeys, encrypted1);
                    evaluator.rotateRows(encrypted1, -1, galoisKeys, encrypted1);
                });
                record.operators['Rotate Rows'].size = 'Cipher' + getSize(encrypted1).toFixed(3);

                // [Rotate Columns]
                timeOperatorFunctionBFV('Rotate Columns', () =>
                    evaluator.rotateColumns(encrypted1, galoisKeys, encrypted1),
                );
                record.operators['Rotate Columns'].size = 'Cipher' + getSize(encrypted1).toFixed(3);
            }

            dotCount++;
            dotCount %= 10;
            let loading = '';
            for (let n = 0; n < 10; n++) {
                n < dotCount ? (loading += '.') : (loading += ' ');
            }
            process.stdout.write(`Running tests ${loading}\r`);
        }
        console.log('\n');
        Object.keys(record.operators).forEach(operator => {
            record.operators[operator].time = record.operators[operator].time / count;
            console.log(`Average ${operator}: ${record.operators[operator].time.toFixed(2)}ms`);
        });

        performances.BFV.push(record);
        console.log('\n----------------------------------------------------------');
    };

    const BGVPerformanceTest = () => {
        const record = {
            polyModulus: 0,
            coeffModulus: 0,
            keys: {},
            operators: {},
        };

        const parmsValue = printParameters(context);

        record.polyModulus = parmsValue.polyModulus;
        record.coeffModulus = parmsValue.coeffModulus;

        const parms = context.firstContextData.parms;
        const plainModulus = parms.plainModulus;

        const timeKeyFunctionBGV = (name, callBack) => timeKeyFunction(record, name, callBack);
        const timeOperatorFunctionBGV = (name, callBack) =>
            timeOperatorFunction(record, name, callBack);

        process.stdout.write('\nGenerating secret key: ');
        const { keyGenerator, secretKey } = timeKeyFunctionBGV('Secret key', () => {
            const keyGenerator = seal.KeyGenerator(context);
            const secretKey = keyGenerator.secretKey();
            return { keyGenerator, secretKey };
        });
        console.log(`Done [${record.keys['Secret key'].time.toFixed(2)}ms]`);
        record.keys['Secret key'].size = getSize(secretKey);

        process.stdout.write('Generating public key: ');
        const publicKey = timeKeyFunctionBGV('Public key', () => keyGenerator.createPublicKey());
        console.log(`Done [${record.keys['Public key'].time.toFixed(2)}ms]`);
        record.keys['Public key'].size = getSize(publicKey);

        let relinKeys = null;
        let galoisKeys = null;

        if (context.usingKeyswitching) {
            process.stdout.write('Generating relinearization keys: ');
            relinKeys = timeKeyFunctionBGV('Relinear keys', () => keyGenerator.createRelinKeys());
            console.log(`Done [${record.keys['Relinear keys'].time.toFixed(2)}ms]`);
            record.keys['Relinear keys'].size = getSize(relinKeys);

            process.stdout.write('Generating Galois keys: ');
            galoisKeys = timeKeyFunctionBGV('Galois keys', () => keyGenerator.createGaloisKeys());
            console.log(`Done [${record.keys['Galois keys'].time.toFixed(2)}ms]`);
            // when polyModulus equal to 16384, it can not save Galois keys to Base64
            if (record.polyModulus != 16384) record.keys['Galois keys'].size = getSize(galoisKeys);
        }

        const encryptor = seal.Encryptor(context, publicKey);
        const decryptor = seal.Decryptor(context, secretKey);
        const evaluator = seal.Evaluator(context);
        const encoder = seal.BatchEncoder(context);

        // How many test we will run
        const count = 10;
        let dotCount = 0;

        // Create array to test on
        let podValues = Int32Array.from({ length: encoder.slotCount }, () =>
            Math.floor(Math.random() * Number(plainModulus.value)),
        );

        process.stdout.write('\nRunning tests\r');
        for (let i = 0; i < count; i++) {
            // [Encoding]
            let plainText = timeOperatorFunctionBGV('Encode', () => encoder.encode(podValues));
            record.operators['Encode'].size = 'Plain: ' + getSize(plainText).toFixed(3);

            // [Decoding]
            timeOperatorFunctionBGV('Decode', () => encoder.decode(plainText, false));

            // [Encryption]
            const encrypted = timeOperatorFunctionBGV('Encrypt', () =>
                encryptor.encrypt(plainText),
            );
            record.operators['Encrypt'].size = 'Cipher: ' + getSize(encrypted).toFixed(3);

            // [Decryption]
            const plainTextResult = timeOperatorFunctionBGV('Decrypt', () =>
                decryptor.decrypt(encrypted),
            );
            record.operators['Decrypt'].size = 'Plain: ' + getSize(plainTextResult).toFixed(3);

            // [Add]
            const podValues1 = Int32Array.from({ length: encoder.slotCount }, (_, index) => index);
            const plainText1 = encoder.encode(podValues1);
            const podValues2 = Int32Array.from(
                { length: encoder.slotCount },
                (_, index) => index + 1,
            );
            const plainText2 = encoder.encode(podValues2);
            const encrypted1 = encryptor.encrypt(plainText1);
            const encrypted2 = encryptor.encrypt(plainText2);
            timeOperatorFunctionBGV('Add', () => {
                evaluator.add(encrypted1, encrypted1, encrypted1);
                evaluator.add(encrypted2, encrypted2, encrypted2);
                evaluator.add(encrypted1, encrypted2, encrypted1);
            });
            record.operators['Add'].size = 'Cipher: ' + getSize(encrypted1).toFixed(3);

            // [Multiply]
            encrypted1.reserve(context, 3);
            timeOperatorFunctionBGV('Multi', () => {
                evaluator.multiply(encrypted1, encrypted2, encrypted1);
            });
            record.operators['Multi'].size = 'Cipher: ' + getSize(encrypted1).toFixed(3);

            // [Multiply Plain]
            timeOperatorFunctionBGV('Multi Plain', () => {
                evaluator.multiplyPlain(encrypted2, plainText, encrypted2);
            });
            record.operators['Multi Plain'].size = 'Cipher: ' + getSize(encrypted2).toFixed(3);

            // [Square]
            timeOperatorFunctionBGV('Square', () => {
                evaluator.square(encrypted2, encrypted2);
            });
            record.operators['Square'].size = 'Cipher: ' + getSize(encrypted2).toFixed(3);

            if (context.usingKeyswitching) {
                // [Relinearize]
                timeOperatorFunctionBGV('Relinearize', () =>
                    evaluator.relinearize(encrypted1, relinKeys, encrypted1),
                );
                record.operators['Relinearize'].size = 'Cipher: ' + getSize(encrypted1).toFixed(3);

                // [Rotate Rows]
                timeOperatorFunctionBGV('Rotate Rows', () => {
                    evaluator.rotateRows(encrypted1, 1, galoisKeys, encrypted1);
                    evaluator.rotateRows(encrypted1, -1, galoisKeys, encrypted1);
                });
                record.operators['Rotate Rows'].size = 'Cipher' + getSize(encrypted1).toFixed(3);

                // [Rotate Columns]
                timeOperatorFunctionBGV('Rotate Columns', () =>
                    evaluator.rotateColumns(encrypted1, galoisKeys, encrypted1),
                );
                record.operators['Rotate Columns'].size = 'Cipher' + getSize(encrypted1).toFixed(3);
            }

            dotCount++;
            dotCount %= 10;
            let loading = '';
            for (let n = 0; n < 10; n++) {
                n < dotCount ? (loading += '.') : (loading += ' ');
            }
            process.stdout.write(`Running tests ${loading}\r`);
        }
        console.log('\n');
        Object.keys(record.operators).forEach(operator => {
            record.operators[operator].time = record.operators[operator].time / count;
            console.log(`Average ${operator}: ${record.operators[operator].time.toFixed(2)}ms`);
        });

        performances.BGV.push(record);
        console.log('\n----------------------------------------------------------');
    };

    const CKKSPerformanceTest = context => {
        const record = {
            polyModulus: 0,
            coeffModulus: 0,
            keys: {},
            operators: {},
        };

        const parmsValue = printParameters(context);

        record.polyModulus = parmsValue.polyModulus;
        record.coeffModulus = parmsValue.coeffModulus;

        const parms = context.firstContextData.parms;

        const timeKeyFunctionCKKS = (name, callBack) => timeKeyFunction(record, name, callBack);
        const timeOperatorFunctionCKKS = (name, callBack) =>
            timeOperatorFunction(record, name, callBack);

        process.stdout.write('\nGenerating secret key: ');
        const { keyGenerator, secretKey } = timeKeyFunctionCKKS('Secret key', () => {
            const keyGenerator = seal.KeyGenerator(context);
            const secretKey = keyGenerator.secretKey();
            return { keyGenerator, secretKey };
        });
        console.log(`Done [${record.keys['Secret key'].time.toFixed(2)}ms]`);
        record.keys['Secret key'].size = getSize(secretKey);

        process.stdout.write('Generating public key: ');
        const publicKey = timeKeyFunctionCKKS('Public key', () => keyGenerator.createPublicKey());
        console.log(`Done [${record.keys['Public key'].time.toFixed(2)}ms]`);
        record.keys['Public key'].size = getSize(publicKey);

        let relinKeys = null;
        let galoisKeys = null;

        if (context.usingKeyswitching) {
            process.stdout.write('Generating relinearization keys: ');
            relinKeys = timeKeyFunctionCKKS('Relinear keys', () => keyGenerator.createRelinKeys());
            console.log(`Done [${record.keys['Relinear keys'].time.toFixed(2)}ms]`);
            record.keys['Relinear keys'].size = getSize(relinKeys);

            process.stdout.write('Generating Galois keys: ');
            galoisKeys = timeKeyFunctionCKKS('Galois keys', () => keyGenerator.createGaloisKeys());
            console.log(`Done [${record.keys['Galois keys'].time.toFixed(2)}ms]`);
            // when polyModulus equal to 16384, it can not save Galois keys to Base64
            if (record.polyModulus != 16384) record.keys['Galois keys'].size = getSize(galoisKeys);
        }

        const encryptor = seal.Encryptor(context, publicKey);
        const decryptor = seal.Decryptor(context, secretKey);
        const evaluator = seal.Evaluator(context);
        const encoder = seal.CKKSEncoder(context);

        // How many test we will run
        const count = 10;
        let dotCount = 0;

        // Create array to test on
        let podValues = Float64Array.from({ length: encoder.slotCount }, (_, i) => 1.001 * i);

        process.stdout.write('\nRunning tests\r');
        for (let i = 0; i < count; i++) {
            const last = parms.coeffModulus.length;
            const coeffBitCount = seal.Modulus(parms.coeffModulus[last - 1]).bitCount;
            const scale = Math.sqrt(coeffBitCount);

            // [Encoding]
            let plainText = timeOperatorFunctionCKKS('Encode', () =>
                encoder.encode(podValues, scale),
            );
            record.operators['Encode'].size = 'Plain: ' + getSize(plainText).toFixed(3);

            // [Decoding]
            timeOperatorFunctionCKKS('Decode', () => encoder.decode(plainText));

            // [Encryption]
            const encrypted = timeOperatorFunctionCKKS('Encrypt', () =>
                encryptor.encrypt(plainText),
            );
            record.operators['Encrypt'].size = 'Cipher: ' + getSize(encrypted).toFixed(3);

            // [Decryption]
            const plainTextResult = timeOperatorFunctionCKKS('Decrypt', () =>
                decryptor.decrypt(encrypted),
            );
            record.operators['Decrypt'].size = 'Plain: ' + getSize(plainTextResult).toFixed(3);

            // [Add]
            const plainText1 = encoder.encode(Float64Array.from([i + 1]), Math.pow(2, 13));
            const encrypted1 = encryptor.encrypt(plainText1);
            const plainText2 = encoder.encode(Float64Array.from([i + 1]), Math.pow(2, 13));
            const encrypted2 = encryptor.encrypt(plainText2);

            timeOperatorFunctionCKKS('Add', () => {
                evaluator.add(encrypted1, encrypted1, encrypted1);
                evaluator.add(encrypted2, encrypted2, encrypted2);
                evaluator.add(encrypted1, encrypted2, encrypted1);
            });
            record.operators['Add'].size = 'Cipher: ' + getSize(encrypted1).toFixed(3);

            // [Multiply]
            encrypted1.reserve(context, 3);
            timeOperatorFunctionCKKS('Multi', () => {
                evaluator.multiply(encrypted1, encrypted2, encrypted1);
            });
            record.operators['Multi'].size = 'Cipher: ' + getSize(encrypted1).toFixed(3);

            // [Multiply Plain]
            timeOperatorFunctionCKKS('Multi Plain', () => {
                evaluator.multiplyPlain(encrypted2, plainText1, encrypted2);
            });
            record.operators['Multi Plain'].size = 'Cipher: ' + getSize(encrypted2).toFixed(3);

            // [Square]
            timeOperatorFunctionCKKS('Square', () => {
                evaluator.square(encrypted2, encrypted2);
            });
            record.operators['Square'].size = 'Cipher: ' + getSize(encrypted2).toFixed(3);

            if (context.usingKeyswitching) {
                // [Relinearize]
                timeOperatorFunctionCKKS('Relinearize', () =>
                    evaluator.relinearize(encrypted1, relinKeys, encrypted1),
                );
                record.operators['Relinearize'].size = 'Cipher: ' + getSize(encrypted1).toFixed(3);

                // [Rescale]
                timeOperatorFunctionCKKS('Rescale', () =>
                    evaluator.rescaleToNext(encrypted1, encrypted1),
                );
                record.operators['Rescale'].size = 'Cipher: ' + getSize(encrypted1).toFixed(3);

                // [Rotate Vector]
                timeOperatorFunctionCKKS('Rotate Vector', () => {
                    evaluator.rotateVector(encrypted1, 1, galoisKeys, encrypted1);
                    evaluator.rotateVector(encrypted1, -1, galoisKeys, encrypted1);
                });
                record.operators['Rotate Vector'].size =
                    'Cipher: ' + getSize(encrypted1).toFixed(3);

                // [Complex Conjugate]
                timeOperatorFunctionCKKS('Complex Conjugate', () =>
                    evaluator.complexConjugate(encrypted1, galoisKeys, encrypted1),
                );
                record.operators['Complex Conjugate'].size =
                    'Cipher: ' + getSize(encrypted1).toFixed(3);
            }

            dotCount++;
            dotCount %= 10;
            let loading = '';
            for (let n = 0; n < 10; n++) {
                n < dotCount ? (loading += '.') : (loading += ' ');
            }
            process.stdout.write(`Running tests ${loading}\r`);
        }
        console.log('\n');
        Object.keys(record.operators).forEach(operator => {
            record.operators[operator].time = record.operators[operator].time / count;
            console.log(`Average ${operator}: ${record.operators[operator].time.toFixed(2)}ms`);
        });

        performances.CKKS.push(record);
        console.log('\n----------------------------------------------------------');
    };

    const BFVPerformanceRun = () => {
        const schemeType = seal.SchemeType.bfv;
        const parms = seal.EncryptionParameters(schemeType);

        polyModulusDegree = 2048;
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(polyModulusDegree));
        parms.setPlainModulus(seal.Modulus(786433));
        context = seal.Context(parms);
        BFVPerformanceTest(context);

        polyModulusDegree = 4096;
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(polyModulusDegree));
        parms.setPlainModulus(seal.Modulus(786433));
        context = seal.Context(parms);
        BFVPerformanceTest(context);

        polyModulusDegree = 8192;
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(polyModulusDegree));
        parms.setPlainModulus(seal.Modulus(786433));
        context = seal.Context(parms);
        BFVPerformanceTest(context);

        polyModulusDegree = 16384;
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(polyModulusDegree));
        parms.setPlainModulus(seal.Modulus(786433));
        context = seal.Context(parms);
        BFVPerformanceTest(context);
    };

    const BGVPerformanceRun = () => {
        const schemeType = seal.SchemeType.bgv;
        const parms = seal.EncryptionParameters(schemeType);

        polyModulusDegree = 2048;
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(polyModulusDegree));
        parms.setPlainModulus(seal.Modulus(786433));
        context = seal.Context(parms);
        BGVPerformanceTest(context);

        polyModulusDegree = 4096;
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(polyModulusDegree));
        parms.setPlainModulus(seal.Modulus(786433));
        context = seal.Context(parms);
        BGVPerformanceTest(context);

        polyModulusDegree = 8192;
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(polyModulusDegree));
        parms.setPlainModulus(seal.Modulus(786433));
        context = seal.Context(parms);
        BGVPerformanceTest(context);

        polyModulusDegree = 16384;
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(polyModulusDegree));
        parms.setPlainModulus(seal.Modulus(786433));
        context = seal.Context(parms);
        BGVPerformanceTest(context);
    };

    const CKKSPerformanceRun = () => {
        const schemeType = seal.SchemeType.ckks;
        const parms = seal.EncryptionParameters(schemeType);

        polyModulusDegree = 2048;
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(polyModulusDegree));
        context = seal.Context(parms);
        CKKSPerformanceTest(context);

        polyModulusDegree = 4096;
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(polyModulusDegree));
        context = seal.Context(parms);
        CKKSPerformanceTest(context);

        polyModulusDegree = 8192;
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(polyModulusDegree));
        context = seal.Context(parms);
        CKKSPerformanceTest(context);

        polyModulusDegree = 16384;
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(polyModulusDegree));
        context = seal.Context(parms);
        CKKSPerformanceTest(context);
    };

    const writeToMD = () => {
        console.log('writing result table to result.md file');
        process.stdout.write('\nplease wait ');
        const stream = fs.createWriteStream('result.md');
        stream.once('open', function (fd) {
            stream.write(
                `## BFV and CKKS Performance Test\n### Test specs:\n- MacBook Air (M1, 2020)\n- MacOS Monterey 12.3.1\n- Ram 8 GB\n`,
            );
            performances.BFV.forEach((_, i) => {
                const current_BFV = performances.BFV[i];
                const current_BGV = performances.BGV[i];
                const current_CKKS = performances.CKKS[i];
                const allKey = {};
                const allOperator = {};

                process.stdout.write('.');

                Object.keys(current_BFV?.keys).forEach(key => {
                    allKey[key] = true;
                });
                Object.keys(current_BGV?.keys).forEach(key => {
                    allKey[key] = true;
                });
                Object.keys(current_CKKS?.keys).forEach(key => {
                    allKey[key] = true;
                });
                Object.keys(current_BFV?.operators).forEach(operator => {
                    allOperator[operator] = true;
                });
                Object.keys(current_BGV?.operators).forEach(operator => {
                    allOperator[operator] = true;
                });
                Object.keys(current_CKKS?.operators).forEach(operator => {
                    allOperator[operator] = true;
                });

                stream.write(
                    `\n### PolyModulus: ${current_BFV.polyModulus}, CoeffModulus: ${current_BFV.coeffModulus}\n`,
                );
                stream.write(
                    '|  | BFV(ms) | BGV(ms) | CKKS(ms) | BFV(MB) | BGV(MB) | CKKS(MB) |\n',
                );
                stream.write(`| --- | --- | --- | --- | --- | --- | --- |\n`);

                Object.keys(allKey).forEach(key => {
                    stream.write(
                        `| ${key} | ${current_BFV.keys[key]?.time.toFixed(2)} \
| ${current_BGV.keys[key]?.time?.toFixed(3)} \
| ${current_CKKS.keys[key]?.time.toFixed(3)} \
| ${current_BFV.keys[key]?.size?.toFixed(3)} \
| ${current_BGV.keys[key]?.size?.toFixed(3)} \
| ${current_CKKS.keys[key]?.size?.toFixed(3)} \
|\n`,
                    );
                });
                Object.keys(allOperator).forEach(operator => {
                    stream.write(
                        `| ${operator} | ${current_BFV.operators[operator]?.time?.toFixed(2)} \
| ${current_BGV.operators[operator]?.time?.toFixed(3)} \
| ${current_CKKS.operators[operator]?.time?.toFixed(3)} \
| ${current_BFV.operators[operator]?.size} \
| ${current_BGV.operators[operator]?.size} \
| ${current_CKKS.operators[operator]?.size} \
|\n`,
                    );
                });
                stream.write('\n');
                process.stdout.write('.');
            });
            stream.end();
            console.log('\nDone');
        });
    };

    const replaceUndefined = () => {
        fs.readFile('result.md', 'utf8', function (err, data) {
            if (err) {
                return console.log(err);
            }
            var result = data.replace(/undefined/g, ' ');

            fs.writeFile('result.md', result, 'utf8', function (err) {
                if (err) return console.log(err);
            });
        });
    };

    function main() {
        BFVPerformanceRun();
        BGVPerformanceRun();
        CKKSPerformanceRun();
        writeToMD();
        replaceUndefined();
    }

    main();
})();
