(async () => {
    const fs = require('fs');
    const SEAL = require('node-seal');
    const seal = await SEAL();

    const performances = {
        BFV: [],
        CKKS: [],
    };

    const timeKeyFunction = (record, name, callBack) => {
        const startTime = performance.now();
        const returnValue = callBack();
        const endTime = performance.now();
        record['times']['key'][name] = endTime - startTime;
        return returnValue;
    };

    const timeOperatorFunction = (record, name, callBack) => {
        const startTime = performance.now();
        const returnValue = callBack();
        const endTime = performance.now();
        record['times']['operator'][name]
            ? (record['times']['operator'][name] += endTime - startTime)
            : (record['times']['operator'][name] = endTime - startTime);
        return returnValue;
    };

    const printParameters = (context, seal) => {
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
            times: {
                key: {},
                operator: {},
            },
        };

        const times = record.times;
        const parmsValue = printParameters(context, seal);

        record.polyModulus = parmsValue.polyModulus;
        record.coeffModulus = parmsValue.coeffModulus;

        const parms = context.firstContextData.parms;
        const plainModulus = parms.plainModulus;

        const timeKeyFunctionBFV = (name, callBack) => timeKeyFunction(record, name, callBack);
        const timeOperatorFunctionBFV = (name, callBack) =>
            timeOperatorFunction(record, name, callBack);

        process.stdout.write('\nGenerating secret key: ');
        const { keyGenerator, secretKey } = timeKeyFunctionBFV('genSkTime', () => {
            const keyGenerator = seal.KeyGenerator(context);
            const secretKey = keyGenerator.secretKey();
            return { keyGenerator, secretKey };
        });
        console.log(`Done [${times.key.genSkTime.toFixed(2)}ms]`);

        process.stdout.write('Generating public key: ');
        const publicKey = timeKeyFunctionBFV('genPkTime', () => keyGenerator.createPublicKey());
        console.log(`Done [${times.key.genPkTime.toFixed(2)}ms]`);

        let relinKeys = null;
        let galoisKeys = null;

        if (context.usingKeyswitching) {
            process.stdout.write('Generating relinearization keys: ');
            relinKeys = timeKeyFunctionBFV('genRelinTime', () => keyGenerator.createRelinKeys());
            console.log(`Done [${times.key.genRelinTime.toFixed(2)}ms]`);

            process.stdout.write('Generating Galois keys: ');
            galoisKeys = timeKeyFunctionBFV('genGkTime', () => keyGenerator.createGaloisKeys());
            console.log(`Done [${times.key.genGkTime.toFixed(2)}ms]`);
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
            let plainText = timeOperatorFunctionBFV('encodeTime', () => encoder.encode(podValues));

            timeOperatorFunctionBFV('decodeTime', () => encoder.decode(plainText, false));

            const encrypted = timeOperatorFunctionBFV('encryptTime', () =>
                encryptor.encrypt(plainText),
            );

            timeOperatorFunctionBFV('decryptTime', () => decryptor.decrypt(encrypted));

            const podValues1 = Int32Array.from({ length: encoder.slotCount }, (_, index) => index);
            const plainText1 = encoder.encode(podValues1);
            const podValues2 = Int32Array.from(
                { length: encoder.slotCount },
                (_, index) => index + 1,
            );
            const plainText2 = encoder.encode(podValues2);

            const encrypted1 = encryptor.encrypt(plainText1);
            const encrypted2 = encryptor.encrypt(plainText2);

            timeOperatorFunctionBFV('addTime', () => {
                evaluator.add(encrypted1, encrypted1, encrypted1);
                evaluator.add(encrypted2, encrypted2, encrypted2);
                evaluator.add(encrypted1, encrypted2, encrypted1);
            });

            encrypted1.reserve(context, 3);
            timeOperatorFunctionBFV('multiTime', () => {
                evaluator.multiply(encrypted1, encrypted2, encrypted1);
            });

            timeOperatorFunctionBFV('multiPlainTime', () => {
                evaluator.multiplyPlain(encrypted2, plainText1, encrypted2);
            });

            timeOperatorFunctionBFV('squareTime', () => {
                evaluator.square(encrypted2, encrypted2);
            });

            if (context.usingKeyswitching) {
                timeOperatorFunctionBFV('relinTime', () =>
                    evaluator.relinearize(encrypted1, relinKeys, encrypted1),
                );

                timeOperatorFunctionBFV('rotateRowsTime', () => {
                    evaluator.rotateRows(encrypted1, 2, galoisKeys, encrypted1);
                    evaluator.rotateRows(encrypted1, -2, galoisKeys, encrypted1);
                });

                timeOperatorFunctionBFV('rotateColumnsTime', () =>
                    evaluator.rotateColumns(encrypted1, galoisKeys, encrypted1),
                );
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
        Object.keys(times.operator).forEach(key => {
            times.operator[key] = times.operator[key] / count;
            console.log(`Average ${key}: ${times.operator[key].toFixed(2)}ms`);
        });

        performances.BFV.push(record);
        console.log('\n----------------------------------------------------------');
    };

    const CKKSPerformanceTest = context => {
        const record = {
            polyModulus: 0,
            coeffModulus: 0,
            times: {
                key: {},
                operator: {},
            },
        };
        const times = record.times;
        const parmsValue = printParameters(context, seal);

        record.polyModulus = parmsValue.polyModulus;
        record.coeffModulus = parmsValue.coeffModulus;

        const parms = context.firstContextData.parms;

        const timeKeyFunctionCKKS = (name, callBack) => timeKeyFunction(record, name, callBack);
        const timeOperatorFunctionCKKS = (name, callBack) =>
            timeOperatorFunction(record, name, callBack);

        process.stdout.write('\nGenerating secret key: ');
        const { keyGenerator, secretKey } = timeKeyFunctionCKKS('genSkTime', () => {
            const keyGenerator = seal.KeyGenerator(context);
            const secretKey = keyGenerator.secretKey();
            return { keyGenerator, secretKey };
        });
        console.log(`Done [${times.key.genSkTime.toFixed(2)}ms]`);

        process.stdout.write('Generating public key: ');
        const publicKey = timeKeyFunctionCKKS('genPkTime', () => keyGenerator.createPublicKey());
        console.log(`Done [${times.key.genPkTime.toFixed(2)}ms]`);

        let relinKeys = null;
        let galoisKeys = null;

        if (context.usingKeyswitching) {
            process.stdout.write('Generating relinearization keys: ');
            relinKeys = timeKeyFunctionCKKS('genRelinTime', () => keyGenerator.createRelinKeys());
            console.log(`Done [${times.key.genRelinTime.toFixed(2)}ms]`);

            process.stdout.write('Generating Galois keys: ');
            galoisKeys = timeKeyFunctionCKKS('genGkTime', () => keyGenerator.createGaloisKeys());
            console.log(`Done [${times.key.genGkTime.toFixed(2)}ms]`);
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
            let plainText = timeOperatorFunctionCKKS('encodeTime', () =>
                encoder.encode(podValues, scale),
            );

            // [Decoding]
            timeOperatorFunctionCKKS('decodeTime', () => encoder.decode(plainText));

            // [Encryption]
            const encrypted = timeOperatorFunctionCKKS('encryptTime', () =>
                encryptor.encrypt(plainText),
            );

            // [Decryption]
            timeOperatorFunctionCKKS('decryptTime', () => decryptor.decrypt(encrypted));

            // [Add]
            const plainText1 = encoder.encode(Float64Array.from([i + 1]), Math.pow(2, 13));
            const encrypted1 = encryptor.encrypt(plainText1);
            const plainText2 = encoder.encode(Float64Array.from([i + 1]), Math.pow(2, 13));
            const encrypted2 = encryptor.encrypt(plainText2);

            timeOperatorFunctionCKKS('addTime', () => {
                evaluator.add(encrypted1, encrypted1, encrypted1);
                evaluator.add(encrypted2, encrypted2, encrypted2);
                evaluator.add(encrypted1, encrypted2, encrypted1);
            });

            // [Multiply]
            encrypted1.reserve(context, 3);
            timeOperatorFunctionCKKS('multiTime', () => {
                evaluator.multiply(encrypted1, encrypted2, encrypted1);
            });

            // [Multiply Plain]
            timeOperatorFunctionCKKS('multiPlainTime', () => {
                evaluator.multiplyPlain(encrypted2, plainText1, encrypted2);
            });

            // [Square]
            timeOperatorFunctionCKKS('squareTime', () => {
                evaluator.square(encrypted2, encrypted2);
            });

            if (context.usingKeyswitching) {
                // [Relinearize]
                timeOperatorFunctionCKKS('relinTime', () =>
                    evaluator.relinearize(encrypted1, relinKeys, encrypted1),
                );

                // [Rescale]
                timeOperatorFunctionCKKS('rescaleTime', () =>
                    evaluator.rescaleToNext(encrypted1, encrypted1),
                );

                // [Rotate Vector]
                timeOperatorFunctionCKKS('rotateVectorTime', () => {
                    evaluator.rotateVector(encrypted1, 1, galoisKeys, encrypted1);
                    evaluator.rotateVector(encrypted1, -1, galoisKeys, encrypted1);
                });

                // [Complex Conjugate]
                timeOperatorFunctionCKKS('complexConjugateTime', () =>
                    evaluator.complexConjugate(encrypted1, galoisKeys, encrypted1),
                );
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
        Object.keys(times.operator).forEach(key => {
            times.operator[key] = times.operator[key] / count;
            console.log(`Average ${key}: ${times.operator[key].toFixed(2)}ms`);
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
            stream.write('## BFV and CKKS Performance Test');
            performances.BFV.forEach((_, i) => {
                const current_BFV = performances.BFV[i];
                const current_CKKS = performances.CKKS[i];
                const allKeyTime = {};
                const allOperatorTime = {};

                process.stdout.write('.');

                Object.keys(current_BFV.times.key).forEach(time => {
                    allKeyTime[time] = true;
                });
                Object.keys(current_CKKS.times.key).forEach(time => {
                    allKeyTime[time] = true;
                });
                Object.keys(current_BFV.times.operator).forEach(time => {
                    allOperatorTime[time] = true;
                });
                Object.keys(current_CKKS.times.operator).forEach(time => {
                    allOperatorTime[time] = true;
                });

                stream.write(
                    `\n### PolyModulus: ${current_BFV.polyModulus}, CoeffModulus Degrees: ${current_BFV.coeffModulus}\n`,
                );
                stream.write('| function | BFV(ms) | CKKS(ms) |\n');
                stream.write(`| --- | --- | --- |\n`);
                Object.keys(allKeyTime).forEach(time => {
                    stream.write(
                        `| ${time} | ${current_BFV.times.key[time]?.toFixed(
                            2,
                        )} | ${current_CKKS.times.key[time]?.toFixed(2)} |\n`,
                    );
                });
                Object.keys(allOperatorTime).forEach(time => {
                    stream.write(
                        `| ${time} | ${current_BFV.times.operator[time]?.toFixed(
                            2,
                        )} | ${current_CKKS.times.operator[time]?.toFixed(2)} |\n`,
                    );
                });
                stream.write('\n');
                process.stdout.write('.');
            });
            stream.end();
            console.log('\nDone');
        });
    };

    function main() {
        BFVPerformanceRun();
        CKKSPerformanceRun();
        writeToMD();
    }

    main();
})();
