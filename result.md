## BFV and CKKS Performance Test

### Test specs:

-   MacBook Air (M1, 2020)
-   MacOS Monterey 12.3.1
-   Ram 8 GB

### PolyModulus: 2048, CoeffModulus Degrees: 54

| function       | BFV(ms) | CKKS(ms) |
| -------------- | ------- | -------- |
| genSkTime      | 1.48    | 0.38     |
| genPkTime      | 0.37    | 0.35     |
| encodeTime     | 0.13    | 0.14     |
| decodeTime     | 0.10    | 0.10     |
| encryptTime    | 0.87    | 0.48     |
| decryptTime    | 0.22    | 0.04     |
| addTime        | 0.06    | 0.05     |
| multiTime      | 1.99    | 0.07     |
| multiPlainTime | 0.25    | 0.03     |
| squareTime     | 1.46    | 0.06     |

### PolyModulus: 4096, CoeffModulus Degrees: 109

| function             | BFV(ms)   | CKKS(ms)  |
| -------------------- | --------- | --------- |
| genSkTime            | 0.64      | 0.63      |
| genPkTime            | 1.06      | 1.07      |
| genRelinTime         | 2.47      | 2.52      |
| genGkTime            | 48.70     | 47.40     |
| encodeTime           | 0.14      | 0.36      |
| decodeTime           | 0.18      | 0.46      |
| encryptTime          | 2.58      | 2.37      |
| decryptTime          | 0.67      | 0.13      |
| addTime              | 0.19      | 0.20      |
| multiTime            | 7.03      | 0.28      |
| multiPlainTime       | 1.05      | 0.12      |
| squareTime           | 5.04      | 0.23      |
| relinTime            | 1.47      | 1.48      |
| rotateRowsTime       | 2.88      | undefined |
| rotateColumnsTime    | 1.43      | undefined |
| rescaleTime          | undefined | 0.42      |
| rotateVectorTime     | undefined | 1.46      |
| complexConjugateTime | undefined | 0.74      |

### PolyModulus: 8192, CoeffModulus Degrees: 218

| function             | BFV(ms)   | CKKS(ms)  |
| -------------------- | --------- | --------- |
| genSkTime            | 1.82      | 1.94      |
| genPkTime            | 3.03      | 3.11      |
| genRelinTime         | 12.57     | 12.98     |
| genGkTime            | 291.23    | 303.97    |
| encodeTime           | 0.25      | 1.23      |
| decodeTime           | 0.31      | 2.06      |
| encryptTime          | 7.35      | 7.85      |
| decryptTime          | 2.45      | 0.46      |
| addTime              | 0.76      | 0.79      |
| multiTime            | 27.24     | 1.19      |
| multiPlainTime       | 4.34      | 0.51      |
| squareTime           | 19.97     | 0.96      |
| relinTime            | 7.32      | 7.69      |
| rotateRowsTime       | 14.52     | undefined |
| rotateColumnsTime    | 7.24      | undefined |
| rescaleTime          | undefined | 1.83      |
| rotateVectorTime     | undefined | 10.20     |
| complexConjugateTime | undefined | 5.06      |

### PolyModulus: 16384, CoeffModulus Degrees: 438

| function             | BFV(ms)   | CKKS(ms)  |
| -------------------- | --------- | --------- |
| genSkTime            | 5.88      | 7.50      |
| genPkTime            | 10.53     | 10.76     |
| genRelinTime         | 84.86     | 83.37     |
| genGkTime            | 2137.49   | 2144.67   |
| encodeTime           | 0.52      | 4.71      |
| decodeTime           | 0.58      | 9.95      |
| encryptTime          | 23.75     | 26.84     |
| decryptTime          | 9.48      | 1.73      |
| addTime              | 3.03      | 3.06      |
| multiTime            | 119.03    | 4.49      |
| multiPlainTime       | 18.55     | 1.96      |
| squareTime           | 88.70     | 3.65      |
| relinTime            | 45.11     | 45.91     |
| rotateRowsTime       | 89.49     | undefined |
| rotateColumnsTime    | 44.64     | undefined |
| rescaleTime          | undefined | 7.26      |
| rotateVectorTime     | undefined | 72.88     |
| complexConjugateTime | undefined | 36.46     |
