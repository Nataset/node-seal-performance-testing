## BFV and CKKS Performance Test

### Test specs:

-   MacBook Air (M1, 2020)
-   MacOS Monterey 12.3.1
-   Ram 8 GB

### PolyModulus: 2048, CoeffModulus: 54

|             | BFV(ms) | BGV(ms) | CKKS(ms) | BFV(MB)       | BGV(MB)       | CKKS(MB)      |
| ----------- | ------- | ------- | -------- | ------------- | ------------- | ------------- |
| Secret key  | 0.51    | 0.366   | 0.772    | 0.021         | 0.021         | 0.021         |
| Public key  | 0.46    | 0.357   | 0.425    | 0.041         | 0.041         | 0.041         |
| Encode      | 0.01    | 0.006   | 0.011    | Plain: 0.009  | Plain: 0.009  | Plain: 0.018  |
| Decode      | 0.01    | 0.007   | 0.013    |               |               |               |
| Encrypt     | 0.08    | 0.045   | 0.045    | Cipher: 0.041 | Cipher: 0.041 | Cipher: 0.041 |
| Decrypt     | 0.02    | 0.036   | 0.003    | Plain: 0.009  | Plain: 0.009  | Plain: 0.021  |
| Add         | 0.01    | 0.005   | 0.005    | Cipher: 0.041 | Cipher: 0.041 | Cipher: 0.041 |
| Multi       | 0.20    | 0.039   | 0.007    | Cipher: 0.062 | Cipher: 0.062 | Cipher: 0.062 |
| Multi Plain | 0.02    | 0.026   | 0.003    | Cipher: 0.041 | Cipher: 0.041 | Cipher: 0.041 |
| Square      | 0.14    | 0.027   | 0.006    | Cipher: 0.062 | Cipher: 0.062 | Cipher: 0.062 |

### PolyModulus: 4096, CoeffModulus: 109

|                   | BFV(ms) | BGV(ms) | CKKS(ms) | BFV(MB)       | BGV(MB)       | CKKS(MB)      |
| ----------------- | ------- | ------- | -------- | ------------- | ------------- | ------------- |
| Secret key        | 0.73    | 0.602   | 0.586    | 0.094         | 0.094         | 0.094         |
| Public key        | 1.06    | 1.132   | 1.079    | 0.179         | 0.179         | 0.179         |
| Relinear keys     | 2.38    | 2.374   | 2.369    | 0.369         | 0.369         | 0.369         |
| Galois keys       | 47.09   | 47.533  | 46.653   | 8.093         | 8.094         | 8.094         |
| Encode            | 0.01    | 0.014   | 0.035    | Plain: 0.018  | Plain: 0.018  | Plain: 0.044  |
| Decode            | 0.01    | 0.013   | 0.043    |               |               |               |
| Encrypt           | 0.26    | 0.181   | 0.253    | Cipher: 0.118 | Cipher: 0.118 | Cipher: 0.118 |
| Decrypt           | 0.07    | 0.057   | 0.011    | Plain: 0.018  | Plain: 0.018  | Plain: 0.062  |
| Add               | 0.02    | 0.020   | 0.019    | Cipher: 0.118 | Cipher: 0.118 | Cipher: 0.118 |
| Multi             | 0.69    | 0.177   | 0.028    | Cipher: 0.177 | Cipher: 0.176 | Cipher: 0.176 |
| Multi Plain       | 0.10    | 0.107   | 0.012    | Cipher: 0.118 | Cipher: 0.118 | Cipher: 0.118 |
| Square            | 0.50    | 0.114   | 0.023    | Cipher: 0.177 | Cipher: 0.176 | Cipher: 0.176 |
| Relinearize       | 0.15    | 0.152   | 0.149    | Cipher: 0.118 | Cipher: 0.118 | Cipher: 0.118 |
| Rotate Rows       | 0.28    | 0.313   |          | Cipher0.118   | Cipher0.118   |               |
| Rotate Columns    | 0.14    | 0.150   |          | Cipher0.118   | Cipher0.118   |               |
| Rescale           |         |         | 0.041    |               |               | Cipher: 0.062 |
| Rotate Vector     |         |         | 0.146    |               |               | Cipher: 0.062 |
| Complex Conjugate |         |         | 0.079    |               |               | Cipher: 0.062 |

### PolyModulus: 8192, CoeffModulus: 218

|                   | BFV(ms) | BGV(ms) | CKKS(ms) | BFV(MB)       | BGV(MB)       | CKKS(MB)      |
| ----------------- | ------- | ------- | -------- | ------------- | ------------- | ------------- |
| Secret key        | 1.69    | 1.688   | 1.595    | 0.361         | 0.361         | 0.361         |
| Public key        | 3.02    | 3.083   | 2.957    | 0.723         | 0.722         | 0.723         |
| Relinear keys     | 12.23   | 12.578  | 12.084   | 2.890         | 2.890         | 2.890         |
| Galois keys       | 290.19  | 296.687 | 288.548  | 69.414        | 69.416        | 69.413        |
| Encode            | 0.02    | 0.027   | 0.128    | Plain: 0.036  | Plain: 0.036  | Plain: 0.278  |
| Decode            | 0.03    | 0.028   | 0.200    |               |               |               |
| Encrypt           | 0.72    | 0.578   | 0.795    | Cipher: 0.577 | Cipher: 0.577 | Cipher: 0.577 |
| Decrypt           | 0.24    | 0.226   | 0.047    | Plain: 0.036  | Plain: 0.036  | Plain: 0.288  |
| Add               | 0.08    | 0.075   | 0.077    | Cipher: 0.577 | Cipher: 0.577 | Cipher: 0.577 |
| Multi             | 2.70    | 0.688   | 0.112    | Cipher: 0.865 | Cipher: 0.865 | Cipher: 0.865 |
| Multi Plain       | 0.43    | 0.441   | 0.051    | Cipher: 0.577 | Cipher: 0.577 | Cipher: 0.577 |
| Square            | 1.98    | 0.506   | 0.087    | Cipher: 0.865 | Cipher: 0.865 | Cipher: 0.865 |
| Relinearize       | 0.73    | 0.769   | 0.754    | Cipher: 0.577 | Cipher: 0.577 | Cipher: 0.577 |
| Rotate Rows       | 1.45    | 1.539   |          | Cipher0.577   | Cipher0.577   |               |
| Rotate Columns    | 0.74    | 0.763   |          | Cipher0.577   | Cipher0.577   |               |
| Rescale           |         |         | 0.200    |               |               | Cipher: 0.432 |
| Rotate Vector     |         |         | 1.004    |               |               | Cipher: 0.432 |
| Complex Conjugate |         |         | 0.493    |               |               | Cipher: 0.432 |

### PolyModulus: 16384, CoeffModulus: 438

|                   | BFV(ms) | BGV(ms)  | CKKS(ms) | BFV(MB)       | BGV(MB)       | CKKS(MB)      |
| ----------------- | ------- | -------- | -------- | ------------- | ------------- | ------------- |
| Secret key        | 5.75    | 5.539    | 5.562    | 1.371         | 1.371         | 1.371         |
| Public key        | 10.86   | 10.966   | 10.750   | 2.743         | 2.743         | 2.742         |
| Relinear keys     | 86.59   | 86.776   | 83.725   | 21.942        | 21.941        | 21.941        |
| Galois keys       | 2150.14 | 2213.196 | 2191.161 |               |               |               |
| Encode            | 0.05    | 0.053    | 0.465    | Plain: 0.072  | Plain: 0.072  | Plain: 1.209  |
| Decode            | 0.05    | 0.059    | 1.014    |               |               |               |
| Encrypt           | 2.29    | 1.948    | 2.764    | Cipher: 2.435 | Cipher: 2.435 | Cipher: 2.435 |
| Decrypt           | 0.94    | 0.912    | 0.175    | Plain: 0.072  | Plain: 0.072  | Plain: 1.217  |
| Add               | 0.31    | 1.514    | 0.347    | Cipher: 2.435 | Cipher: 2.435 | Cipher: 2.435 |
| Multi             | 11.78   | 3.862    | 0.514    | Cipher: 3.652 | Cipher: 3.653 | Cipher: 3.653 |
| Multi Plain       | 1.85    | 1.912    | 0.208    | Cipher: 2.435 | Cipher: 2.435 | Cipher: 2.435 |
| Square            | 9.80    | 2.057    | 0.402    | Cipher: 3.652 | Cipher: 3.652 | Cipher: 3.652 |
| Relinearize       | 4.68    | 4.666    | 4.786    | Cipher: 2.435 | Cipher: 2.435 | Cipher: 2.435 |
| Rotate Rows       | 8.98    | 9.296    |          | Cipher2.435   | Cipher2.435   |               |
| Rotate Columns    | 4.44    | 4.649    |          | Cipher2.435   | Cipher2.435   |               |
| Rescale           |         |          | 0.782    |               |               | Cipher: 2.127 |
| Rotate Vector     |         |          | 7.867    |               |               | Cipher: 2.127 |
| Complex Conjugate |         |          | 3.929    |               |               | Cipher: 2.127 |
