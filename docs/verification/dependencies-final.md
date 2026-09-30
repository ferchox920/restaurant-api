# Dependencias: registro individual de la etapa final

Auditorías iniciales sobre los SHA de referencia, no resultados CI anteriores. Los totales de npm cuentan paquetes afectados; varios paquetes heredan el mismo advisory. Las entradas siguientes separan advisories únicos por paquete. Producción significa incluido por `npm audit --omit=dev`, incluso Prisma incorporado por peer dependency.

## @nestjs/platform-express — high; incluido en producción

Cadenas del lockfile inicial:

- root → @nestjs/platform-express@11.1.28
- root → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28
- root → @nestjs/swagger@11.4.5 → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28
- root → @nestjs/testing@11.1.26 → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28
- root → @nestjs/throttler@6.5.0 → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28
- root → @nestjs/testing@11.1.26 → @nestjs/platform-express@11.1.28

Aviso heredado de: multer. La corrección se detalla en ese paquete.

## @nestjs/swagger — high; incluido en producción

Cadenas del lockfile inicial:

- root → @nestjs/swagger@11.4.5

Aviso heredado de: js-yaml. La corrección se detalla en ese paquete.

## @prisma/config — high; incluido en producción

Cadenas del lockfile inicial:

- root → prisma@6.19.3 → @prisma/config@6.19.3
- root → @prisma/client@6.19.3 → prisma@6.19.3 → @prisma/config@6.19.3

Aviso heredado de: deepmerge-ts. La corrección se detalla en ese paquete.

## baseline-browser-mapping — moderate; solo desarrollo

Cadenas del lockfile inicial:

- root → jest@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → babel-jest@30.4.1 → babel-preset-jest@30.4.0 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2 → baseline-browser-mapping@2.10.34
- root → jest@30.4.2 → jest-cli@30.4.2 → jest-config@30.4.2 → babel-jest@30.4.1 → babel-preset-jest@30.4.0 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2 → baseline-browser-mapping@2.10.34
- root → ts-jest@29.4.11 → babel-jest@30.4.1 → babel-preset-jest@30.4.0 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2 → baseline-browser-mapping@2.10.34
- root → jest@30.4.2 → @jest/core@30.4.2 → jest-snapshot@30.4.1 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2 → baseline-browser-mapping@2.10.34
- root → ts-jest@29.4.11 → jest@30.4.2 → @jest/core@30.4.2 → jest-snapshot@30.4.1 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2 → baseline-browser-mapping@2.10.34
- root → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → jest-snapshot@30.4.1 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2 → baseline-browser-mapping@2.10.34
- root → ts-jest@29.4.11 → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → jest-snapshot@30.4.1 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2 → baseline-browser-mapping@2.10.34
- root → jest@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → jest-circus@30.4.2 → jest-snapshot@30.4.1 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2 → baseline-browser-mapping@2.10.34
- root → jest@30.4.2 → jest-cli@30.4.2 → jest-config@30.4.2 → jest-circus@30.4.2 → jest-snapshot@30.4.1 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2 → baseline-browser-mapping@2.10.34
- root → jest@30.4.2 → @jest/core@30.4.2 → jest-resolve-dependencies@30.4.2 → jest-snapshot@30.4.1 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2 → baseline-browser-mapping@2.10.34

### [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) — moderate

baseline-browser-mapping process termination on invalid input causes denial of service

Versiones oficiales: >= 2.0.0, < 2.11.0; corregida: 2.11.0.

Exposición en este proyecto (inspección del código y de la cadena): Herramientas de selección de navegadores durante desarrollo/build; no constituye un endpoint de la API.

## body-parser — low; incluido en producción

Cadenas del lockfile inicial:

- root → @nestjs/platform-express@11.1.28 → express@5.2.1 → body-parser@2.2.2
- root → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28 → express@5.2.1 → body-parser@2.2.2
- root → @nestjs/swagger@11.4.5 → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28 → express@5.2.1 → body-parser@2.2.2
- root → @nestjs/testing@11.1.26 → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28 → express@5.2.1 → body-parser@2.2.2
- root → @nestjs/throttler@6.5.0 → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28 → express@5.2.1 → body-parser@2.2.2
- root → @nestjs/testing@11.1.26 → @nestjs/platform-express@11.1.28 → express@5.2.1 → body-parser@2.2.2
- root → swagger-ui-express@5.0.1 → express@5.2.1 → body-parser@2.2.2

### [GHSA-v422-hmwv-36x6](https://github.com/advisories/GHSA-v422-hmwv-36x6) — low

body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement

Versiones oficiales: < 1.20.6; corregida: 1.20.6 / >= 2.0.0, < 2.3.0; corregida: 2.3.0.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento de cuerpos HTTP. La API recibe entrada no confiable; actualizar aunque los límites del servidor reduzcan la exposición.

## brace-expansion — high; solo desarrollo

Cadenas del lockfile inicial:

- root → jest@30.4.2 → @jest/core@30.4.2 → @jest/reporters@30.4.1 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → ts-jest@29.4.11 → jest@30.4.2 → @jest/core@30.4.2 → @jest/reporters@30.4.1 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → @jest/reporters@30.4.1 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → ts-jest@29.4.11 → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → @jest/reporters@30.4.1 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/parser@8.61.0 → @typescript-eslint/typescript-estree@8.61.0 → minimatch@10.2.5 → brace-expansion@5.0.6
- root → typescript-eslint@8.61.0 → @typescript-eslint/parser@8.61.0 → @typescript-eslint/typescript-estree@8.61.0 → minimatch@10.2.5 → brace-expansion@5.0.6
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/type-utils@8.61.0 → @typescript-eslint/typescript-estree@8.61.0 → minimatch@10.2.5 → brace-expansion@5.0.6
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/utils@8.61.0 → @typescript-eslint/typescript-estree@8.61.0 → minimatch@10.2.5 → brace-expansion@5.0.6
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/type-utils@8.61.0 → @typescript-eslint/utils@8.61.0 → @typescript-eslint/typescript-estree@8.61.0 → minimatch@10.2.5 → brace-expansion@5.0.6
- root → typescript-eslint@8.61.0 → @typescript-eslint/utils@8.61.0 → @typescript-eslint/typescript-estree@8.61.0 → minimatch@10.2.5 → brace-expansion@5.0.6
- root → typescript-eslint@8.61.0 → @typescript-eslint/typescript-estree@8.61.0 → minimatch@10.2.5 → brace-expansion@5.0.6
- root → eslint@9.39.4 → @eslint/config-array@0.21.2 → minimatch@3.1.5 → brace-expansion@1.1.15
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/utils@8.61.0 → @eslint-community/eslint-utils@4.9.1 → eslint@9.39.4 → @eslint/config-array@0.21.2 → minimatch@3.1.5 → brace-expansion@1.1.15
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/type-utils@8.61.0 → @typescript-eslint/utils@8.61.0 → @eslint-community/eslint-utils@4.9.1 → eslint@9.39.4 → @eslint/config-array@0.21.2 → minimatch@3.1.5 → brace-expansion@1.1.15
- root → typescript-eslint@8.61.0 → @typescript-eslint/utils@8.61.0 → @eslint-community/eslint-utils@4.9.1 → eslint@9.39.4 → @eslint/config-array@0.21.2 → minimatch@3.1.5 → brace-expansion@1.1.15
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → eslint@9.39.4 → @eslint/config-array@0.21.2 → minimatch@3.1.5 → brace-expansion@1.1.15
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/parser@8.61.0 → eslint@9.39.4 → @eslint/config-array@0.21.2 → minimatch@3.1.5 → brace-expansion@1.1.15
- root → typescript-eslint@8.61.0 → @typescript-eslint/parser@8.61.0 → eslint@9.39.4 → @eslint/config-array@0.21.2 → minimatch@3.1.5 → brace-expansion@1.1.15
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/type-utils@8.61.0 → eslint@9.39.4 → @eslint/config-array@0.21.2 → minimatch@3.1.5 → brace-expansion@1.1.15
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/utils@8.61.0 → eslint@9.39.4 → @eslint/config-array@0.21.2 → minimatch@3.1.5 → brace-expansion@1.1.15
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/type-utils@8.61.0 → @typescript-eslint/utils@8.61.0 → eslint@9.39.4 → @eslint/config-array@0.21.2 → minimatch@3.1.5 → brace-expansion@1.1.15
- root → @nestjs/cli@11.0.22 → glob@13.0.6 → minimatch@10.2.5 → brace-expansion@5.0.6
- root → jest@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → ts-jest@29.4.11 → jest@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → ts-jest@29.4.11 → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → jest@30.4.2 → jest-cli@30.4.2 → jest-config@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → ts-jest@29.4.11 → jest@30.4.2 → jest-cli@30.4.2 → jest-config@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → jest@30.4.2 → @jest/core@30.4.2 → jest-runtime@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → ts-jest@29.4.11 → jest@30.4.2 → @jest/core@30.4.2 → jest-runtime@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → jest-runtime@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → ts-jest@29.4.11 → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → jest-runtime@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → jest@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → jest-circus@30.4.2 → jest-runtime@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → ts-jest@29.4.11 → jest@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → jest-circus@30.4.2 → jest-runtime@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → jest-circus@30.4.2 → jest-runtime@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → ts-jest@29.4.11 → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → jest-circus@30.4.2 → jest-runtime@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → jest@30.4.2 → jest-cli@30.4.2 → jest-config@30.4.2 → jest-circus@30.4.2 → jest-runtime@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1
- root → ts-jest@29.4.11 → jest@30.4.2 → jest-cli@30.4.2 → jest-config@30.4.2 → jest-circus@30.4.2 → jest-runtime@30.4.2 → glob@10.5.0 → minimatch@9.0.9 → brace-expansion@2.1.1

### [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) — high

brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups

Versiones oficiales: >= 3.0.0, < 5.0.7; corregida: 5.0.7 / < 1.1.16; corregida: 1.1.16 / >= 2.0.0, < 2.1.2; corregida: 2.1.2.

Exposición en este proyecto (inspección del código y de la cadena): Expansión de patrones en herramientas de desarrollo; requiere entrada que alcance esas herramientas. No se identifica una ruta comercial que acepte patrones para esas funciones.

### [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) — high

brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash

Versiones oficiales: >= 4.0.0, < 5.0.8; corregida: 5.0.8 / >= 3.0.0, < 3.0.3; corregida: 3.0.3 / >= 2.0.0, < 2.1.3; corregida: 2.1.3 / < 1.1.17; corregida: 1.1.17.

Exposición en este proyecto (inspección del código y de la cadena): Expansión de patrones en herramientas de desarrollo; requiere entrada que alcance esas herramientas. No se identifica una ruta comercial que acepte patrones para esas funciones.

### [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) — high

brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation

Versiones oficiales: < 1.1.18; corregida: 1.1.18 / >= 2.0.0, < 2.1.4; corregida: 2.1.4 / >= 3.0.0, < 3.0.6; corregida: 3.0.6 / >= 4.0.0, < 5.0.9; corregida: 5.0.9.

Exposición en este proyecto (inspección del código y de la cadena): Expansión de patrones en herramientas de desarrollo; requiere entrada que alcance esas herramientas. No se identifica una ruta comercial que acepte patrones para esas funciones.

### [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) — moderate

brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service

Versiones oficiales: >= 4.0.0, < 5.0.12; corregida: 5.0.12 / >= 3.0.0, < 3.0.9; corregida: 3.0.9 / >= 2.0.0, < 2.1.7; corregida: 2.1.7 / < 1.1.21; corregida: 1.1.21.

Exposición en este proyecto (inspección del código y de la cadena): Expansión de patrones en herramientas de desarrollo; requiere entrada que alcance esas herramientas. No se identifica una ruta comercial que acepte patrones para esas funciones.

### [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) — high

brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion

Versiones oficiales: >= 4.0.0, < 5.0.11; corregida: 5.0.11 / >= 3.0.0, < 3.0.8; corregida: 3.0.8 / >= 2.0.0, < 2.1.6; corregida: 2.1.6 / < 1.1.20; corregida: 1.1.20.

Exposición en este proyecto (inspección del código y de la cadena): Expansión de patrones en herramientas de desarrollo; requiere entrada que alcance esas herramientas. No se identifica una ruta comercial que acepte patrones para esas funciones.

### [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) — high

brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion

Versiones oficiales: >= 4.0.0, < 5.0.10; corregida: 5.0.10 / >= 3.0.0, < 3.0.7; corregida: 3.0.7 / >= 2.0.0, < 2.1.5; corregida: 2.1.5 / < 1.1.19; corregida: 1.1.19.

Exposición en este proyecto (inspección del código y de la cadena): Expansión de patrones en herramientas de desarrollo; requiere entrada que alcance esas herramientas. No se identifica una ruta comercial que acepte patrones para esas funciones.

## browserslist — high; solo desarrollo

Cadenas del lockfile inicial:

- root → jest@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → babel-jest@30.4.1 → babel-preset-jest@30.4.0 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2
- root → ts-jest@29.4.11 → jest@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → babel-jest@30.4.1 → babel-preset-jest@30.4.0 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2
- root → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → babel-jest@30.4.1 → babel-preset-jest@30.4.0 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2
- root → jest@30.4.2 → jest-cli@30.4.2 → jest-config@30.4.2 → babel-jest@30.4.1 → babel-preset-jest@30.4.0 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2
- root → ts-jest@29.4.11 → jest@30.4.2 → jest-cli@30.4.2 → jest-config@30.4.2 → babel-jest@30.4.1 → babel-preset-jest@30.4.0 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2
- root → ts-jest@29.4.11 → babel-jest@30.4.1 → babel-preset-jest@30.4.0 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2
- root → jest@30.4.2 → @jest/core@30.4.2 → jest-snapshot@30.4.1 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2
- root → ts-jest@29.4.11 → jest@30.4.2 → @jest/core@30.4.2 → jest-snapshot@30.4.1 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2
- root → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → jest-snapshot@30.4.1 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2
- root → ts-jest@29.4.11 → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → jest-snapshot@30.4.1 → babel-preset-current-node-syntax@1.2.0 → @babel/plugin-syntax-async-generators@7.8.4 → @babel/core@7.29.7 → @babel/helper-compilation-targets@7.29.7 → browserslist@4.28.2

### [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) — high

Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM

Versiones oficiales: <= 4.28.6; corregida: 4.28.7.

Exposición en este proyecto (inspección del código y de la cadena): Configuración y cálculo de navegadores en herramientas de build; requiere datos o configuración que alcancen el cálculo vulnerable.

### [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) — high

Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats)

Versiones oficiales: <= 4.28.6; corregida: 4.28.7.

Exposición en este proyecto (inspección del código y de la cadena): Configuración y cálculo de navegadores en herramientas de build; requiere datos o configuración que alcancen el cálculo vulnerable.

## deepmerge-ts — high; incluido en producción

Cadenas del lockfile inicial:

- root → prisma@6.19.3 → @prisma/config@6.19.3 → deepmerge-ts@7.1.5
- root → @prisma/client@6.19.3 → prisma@6.19.3 → @prisma/config@6.19.3 → deepmerge-ts@7.1.5

### [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) — high

DeepmergeTS has stack exhaustion when merging recursive object graphs

Versiones oficiales: < 8.0.0; corregida: 8.0.0.

Exposición en este proyecto (inspección del código y de la cadena): Fusión de configuración Prisma. No hay un endpoint que permita enviar configuración Prisma; aun así aparece en el árbol de producción y se corrige mediante override acotado.

## fast-uri — high; solo desarrollo

Cadenas del lockfile inicial:

- root → @nestjs/cli@11.0.22 → @angular-devkit/schematics-cli@19.2.27 → @angular-devkit/schematics@19.2.27 → @angular-devkit/core@19.2.27 → ajv@8.18.0 → fast-uri@3.1.2
- root → @nestjs/cli@11.0.22 → @angular-devkit/schematics@19.2.27 → @angular-devkit/core@19.2.27 → ajv@8.18.0 → fast-uri@3.1.2
- root → @nestjs/cli@11.0.22 → @angular-devkit/schematics-cli@19.2.27 → @angular-devkit/core@19.2.27 → ajv@8.18.0 → fast-uri@3.1.2
- root → @nestjs/cli@11.0.22 → @angular-devkit/core@19.2.27 → ajv@8.18.0 → fast-uri@3.1.2
- root → @nestjs/cli@11.0.22 → webpack@5.106.2 → schema-utils@4.3.3 → ajv-formats@2.1.1 → ajv@8.18.0 → fast-uri@3.1.2
- root → @nestjs/cli@11.0.22 → webpack@5.106.2 → schema-utils@4.3.3 → ajv@8.18.0 → fast-uri@3.1.2
- root → @nestjs/schematics@11.1.0 → @angular-devkit/core@19.2.24 → ajv@8.18.0 → fast-uri@3.1.2
- root → @nestjs/cli@11.0.22 → @nestjs/schematics@11.1.0 → @angular-devkit/core@19.2.24 → ajv@8.18.0 → fast-uri@3.1.2
- root → @nestjs/schematics@11.1.0 → @angular-devkit/schematics@19.2.24 → @angular-devkit/core@19.2.24 → ajv@8.18.0 → fast-uri@3.1.2
- root → @nestjs/cli@11.0.22 → @nestjs/schematics@11.1.0 → @angular-devkit/schematics@19.2.24 → @angular-devkit/core@19.2.24 → ajv@8.18.0 → fast-uri@3.1.2

### [GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx) — high

fast-uri vulnerable to host confusion via literal backslash authority delimiter

Versiones oficiales: >= 2.3.1, <= 2.4.2; corregida: 2.4.3 / >= 3.0.0, <= 3.1.3; corregida: 3.1.4 / >= 4.0.0, <= 4.1.0; corregida: 4.1.1.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento de URI en validadores de herramientas de desarrollo; no se identifica exposición directa desde endpoints comerciales.

### [GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7) — high

fast-uri vulnerable to host confusion via backslash authority introducer

Versiones oficiales: < 2.4.4; corregida: 2.4.4 / >= 3.0.0, < 3.1.5; corregida: 3.1.5 / >= 4.0.0, < 4.1.2; corregida: 4.1.2.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento de URI en validadores de herramientas de desarrollo; no se identifica exposición directa desde endpoints comerciales.

### [GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc) — high

fast-uri vulnerable to server-side request forgery via malformed IPv6 normalization

Versiones oficiales: >= 2.3.1, < 2.4.5; corregida: 2.4.5 / >= 3.0.0, < 3.1.6; corregida: 3.1.6 / >= 4.0.0, < 4.1.3; corregida: 4.1.3.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento de URI en validadores de herramientas de desarrollo; no se identifica exposición directa desde endpoints comerciales.

### [GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf) — high

fast-uri vulnerable to server-side request forgery via repeated hostname percent-decoding

Versiones oficiales: >= 2.4.1, < 2.4.5; corregida: 2.4.5 / >= 3.1.2, < 3.1.6; corregida: 3.1.6 / >= 4.0.0, < 4.1.3; corregida: 4.1.3.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento de URI en validadores de herramientas de desarrollo; no se identifica exposición directa desde endpoints comerciales.

### [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp) — high

fast-uri vulnerable to host confusion via percent-encoded scheme normalization

Versiones oficiales: >= 2.3.1, < 2.4.5; corregida: 2.4.5 / >= 3.0.0, < 3.1.6; corregida: 3.1.6 / >= 4.0.0, < 4.1.3; corregida: 4.1.3.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento de URI en validadores de herramientas de desarrollo; no se identifica exposición directa desde endpoints comerciales.

### [GHSA-4c8g-83qw-93j6](https://github.com/advisories/GHSA-4c8g-83qw-93j6) — high

fast-uri vulnerable to host confusion via failed IDN canonicalization

Versiones oficiales: >= 4.0.0, < 4.0.1; corregida: 4.0.1 / >= 3.0.0, < 3.1.3; corregida: 3.1.3 / >= 2.3.1, < 2.4.2; corregida: 2.4.2.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento de URI en validadores de herramientas de desarrollo; no se identifica exposición directa desde endpoints comerciales.

### [GHSA-qw65-cvwx-89v3](https://github.com/advisories/GHSA-qw65-cvwx-89v3) — high

fast-uri vulnerable to authority injection via an unvalidated port in serialize

Versiones oficiales: < 2.4.6; corregida: 2.4.6 / >= 3.0.0, < 3.1.7; corregida: 3.1.7 / >= 4.0.0, < 4.1.4; corregida: 4.1.4.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento de URI en validadores de herramientas de desarrollo; no se identifica exposición directa desde endpoints comerciales.

### [GHSA-hrr3-gc8f-f4qj](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj) — moderate

fast-uri vulnerable to inconsistent host case normalization via percent-encoded octets

Versiones oficiales: < 2.4.7; corregida: 2.4.7 / >= 3.0.0, < 3.1.8; corregida: 3.1.8 / >= 4.0.0, < 4.1.5; corregida: 4.1.5.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento de URI en validadores de herramientas de desarrollo; no se identifica exposición directa desde endpoints comerciales.

## joi — high; incluido en producción

Cadenas del lockfile inicial:

- root → joi@17.13.4

### [GHSA-6w3j-5fw6-r9vr](https://github.com/advisories/GHSA-6w3j-5fw6-r9vr) — low

joi: Prototype pollution via a `__proto__` language key in custom messages

Versiones oficiales: >= 17.2.0, < 17.13.6; corregida: 17.13.6 / >= 18.0.0, < 18.2.5; corregida: 18.2.5.

Exposición en este proyecto (inspección del código y de la cadena): Validación de configuración de arranque. Las entradas son variables de entorno bajo control del operador, no payload comercial, pero se corrige el paquete de producción.

### [GHSA-gg4h-3hg2-grpc](https://github.com/advisories/GHSA-gg4h-3hg2-grpc) — low

joi: object().rename() with a template target can set the validated object's prototype

Versiones oficiales: >= 16.0.0, < 17.13.5; corregida: 17.13.5 / >= 18.0.0, < 18.2.4; corregida: 18.2.4.

Exposición en este proyecto (inspección del código y de la cadena): Validación de configuración de arranque. Las entradas son variables de entorno bajo control del operador, no payload comercial, pero se corrige el paquete de producción.

### [GHSA-6h2x-m376-mqjq](https://github.com/advisories/GHSA-6h2x-m376-mqjq) — high

joi: Quadratic regular-expression backtracking in `Joi.string().isoDate()`

Versiones oficiales: >= 17.2.0, < 17.13.7; corregida: 17.13.7 / >= 18.0.0, < 18.2.6; corregida: 18.2.6.

Exposición en este proyecto (inspección del código y de la cadena): Validación de configuración de arranque. Las entradas son variables de entorno bajo control del operador, no payload comercial, pero se corrige el paquete de producción.

## js-yaml — high; incluido en producción

Cadenas del lockfile inicial:

- root → jest@30.4.2 → @jest/core@30.4.2 → @jest/transform@30.4.1 → babel-plugin-istanbul@7.0.1 → @istanbuljs/load-nyc-config@1.1.0 → js-yaml@3.15.0
- root → ts-jest@29.4.11 → jest@30.4.2 → @jest/core@30.4.2 → @jest/transform@30.4.1 → babel-plugin-istanbul@7.0.1 → @istanbuljs/load-nyc-config@1.1.0 → js-yaml@3.15.0
- root → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → @jest/transform@30.4.1 → babel-plugin-istanbul@7.0.1 → @istanbuljs/load-nyc-config@1.1.0 → js-yaml@3.15.0
- root → ts-jest@29.4.11 → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → @jest/transform@30.4.1 → babel-plugin-istanbul@7.0.1 → @istanbuljs/load-nyc-config@1.1.0 → js-yaml@3.15.0
- root → jest@30.4.2 → @jest/core@30.4.2 → @jest/reporters@30.4.1 → @jest/transform@30.4.1 → babel-plugin-istanbul@7.0.1 → @istanbuljs/load-nyc-config@1.1.0 → js-yaml@3.15.0
- root → ts-jest@29.4.11 → jest@30.4.2 → @jest/core@30.4.2 → @jest/reporters@30.4.1 → @jest/transform@30.4.1 → babel-plugin-istanbul@7.0.1 → @istanbuljs/load-nyc-config@1.1.0 → js-yaml@3.15.0
- root → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → @jest/reporters@30.4.1 → @jest/transform@30.4.1 → babel-plugin-istanbul@7.0.1 → @istanbuljs/load-nyc-config@1.1.0 → js-yaml@3.15.0
- root → ts-jest@29.4.11 → jest@30.4.2 → jest-cli@30.4.2 → @jest/core@30.4.2 → @jest/reporters@30.4.1 → @jest/transform@30.4.1 → babel-plugin-istanbul@7.0.1 → @istanbuljs/load-nyc-config@1.1.0 → js-yaml@3.15.0
- root → jest@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → babel-jest@30.4.1 → @jest/transform@30.4.1 → babel-plugin-istanbul@7.0.1 → @istanbuljs/load-nyc-config@1.1.0 → js-yaml@3.15.0
- root → ts-jest@29.4.11 → jest@30.4.2 → @jest/core@30.4.2 → jest-config@30.4.2 → babel-jest@30.4.1 → @jest/transform@30.4.1 → babel-plugin-istanbul@7.0.1 → @istanbuljs/load-nyc-config@1.1.0 → js-yaml@3.15.0
- root → eslint@9.39.4 → @eslint/eslintrc@3.3.5 → js-yaml@4.3.0
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/utils@8.61.0 → @eslint-community/eslint-utils@4.9.1 → eslint@9.39.4 → @eslint/eslintrc@3.3.5 → js-yaml@4.3.0
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/type-utils@8.61.0 → @typescript-eslint/utils@8.61.0 → @eslint-community/eslint-utils@4.9.1 → eslint@9.39.4 → @eslint/eslintrc@3.3.5 → js-yaml@4.3.0
- root → typescript-eslint@8.61.0 → @typescript-eslint/utils@8.61.0 → @eslint-community/eslint-utils@4.9.1 → eslint@9.39.4 → @eslint/eslintrc@3.3.5 → js-yaml@4.3.0
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → eslint@9.39.4 → @eslint/eslintrc@3.3.5 → js-yaml@4.3.0
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/parser@8.61.0 → eslint@9.39.4 → @eslint/eslintrc@3.3.5 → js-yaml@4.3.0
- root → typescript-eslint@8.61.0 → @typescript-eslint/parser@8.61.0 → eslint@9.39.4 → @eslint/eslintrc@3.3.5 → js-yaml@4.3.0
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/type-utils@8.61.0 → eslint@9.39.4 → @eslint/eslintrc@3.3.5 → js-yaml@4.3.0
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/utils@8.61.0 → eslint@9.39.4 → @eslint/eslintrc@3.3.5 → js-yaml@4.3.0
- root → typescript-eslint@8.61.0 → @typescript-eslint/eslint-plugin@8.61.0 → @typescript-eslint/type-utils@8.61.0 → @typescript-eslint/utils@8.61.0 → eslint@9.39.4 → @eslint/eslintrc@3.3.5 → js-yaml@4.3.0

### [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) — high

JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported

Versiones oficiales: >= 4.0.0, < 4.3.1; corregida: 4.3.1 / >= 3.0.0, < 3.15.1; corregida: 3.15.1.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento YAML usado por Swagger y herramientas. Swagger es opcional y se desactiva en la demo; no se ofrece carga de YAML arbitrario. Se corrige igualmente.

### [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) — high

js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources

Versiones oficiales: >= 4.0.0, < 4.3.2; corregida: 4.3.2 / >= 3.0.0, < 3.15.2; corregida: 3.15.2.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento YAML usado por Swagger y herramientas. Swagger es opcional y se desactiva en la demo; no se ofrece carga de YAML arbitrario. Se corrige igualmente.

## multer — high; incluido en producción

Cadenas del lockfile inicial:

- root → @nestjs/platform-express@11.1.28 → multer@2.2.0
- root → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28 → multer@2.2.0
- root → @nestjs/swagger@11.4.5 → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28 → multer@2.2.0
- root → @nestjs/testing@11.1.26 → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28 → multer@2.2.0
- root → @nestjs/throttler@6.5.0 → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28 → multer@2.2.0
- root → @nestjs/testing@11.1.26 → @nestjs/platform-express@11.1.28 → multer@2.2.0

### [GHSA-wc9g-mqfw-jrwm](https://github.com/advisories/GHSA-wc9g-mqfw-jrwm) — high

multer vulnerable to Denial of Service via crafted multipart field names

Versiones oficiales: < 2.3.0; corregida: 2.3.0.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento multipart de Express/Nest. No se identifica controlador comercial de upload, pero está en el adaptador HTTP y se actualiza.

### [GHSA-qfvm-cv95-jqjf](https://github.com/advisories/GHSA-qfvm-cv95-jqjf) — high

multer vulnerable to Denial of Service via file descriptor leak on aborted uploads

Versiones oficiales: = 2.2.0; corregida: 2.3.0.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento multipart de Express/Nest. No se identifica controlador comercial de upload, pero está en el adaptador HTTP y se actualiza.

### [GHSA-qvfw-j98x-7q72](https://github.com/advisories/GHSA-qvfw-j98x-7q72) — low

multer vulnerable to file size limit bypass via async fileFilter race condition

Versiones oficiales: < 2.3.0; corregida: 2.3.0.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento multipart de Express/Nest. No se identifica controlador comercial de upload, pero está en el adaptador HTTP y se actualiza.

### [GHSA-535w-7cp7-47q4](https://github.com/advisories/GHSA-535w-7cp7-47q4) — high

multer vulnerable to Denial of Service via oversized array index in field names

Versiones oficiales: < 2.3.0; corregida: 2.3.0.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento multipart de Express/Nest. No se identifica controlador comercial de upload, pero está en el adaptador HTTP y se actualiza.

### [GHSA-3pph-fpjx-jg34](https://github.com/advisories/GHSA-3pph-fpjx-jg34) — moderate

multer vulnerable to Denial of Service via orphaned disk writes on aborted uploads

Versiones oficiales: >= 2.2.0, < 2.4.0; corregida: 2.4.0.

Exposición en este proyecto (inspección del código y de la cadena): Procesamiento multipart de Express/Nest. No se identifica controlador comercial de upload, pero está en el adaptador HTTP y se actualiza.

## prisma — high; incluido en producción

Cadenas del lockfile inicial:

- root → prisma@6.19.3
- root → @prisma/client@6.19.3 → prisma@6.19.3

Aviso heredado de: @prisma/config. La corrección se detalla en ese paquete.

## qs — moderate; incluido en producción

Cadenas del lockfile inicial:

- root → @nestjs/platform-express@11.1.28 → express@5.2.1 → body-parser@2.2.2 → qs@6.15.2
- root → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28 → express@5.2.1 → body-parser@2.2.2 → qs@6.15.2
- root → @nestjs/swagger@11.4.5 → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28 → express@5.2.1 → body-parser@2.2.2 → qs@6.15.2
- root → @nestjs/testing@11.1.26 → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28 → express@5.2.1 → body-parser@2.2.2 → qs@6.15.2
- root → @nestjs/throttler@6.5.0 → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28 → express@5.2.1 → body-parser@2.2.2 → qs@6.15.2
- root → @nestjs/testing@11.1.26 → @nestjs/platform-express@11.1.28 → express@5.2.1 → body-parser@2.2.2 → qs@6.15.2
- root → swagger-ui-express@5.0.1 → express@5.2.1 → body-parser@2.2.2 → qs@6.15.2
- root → @nestjs/platform-express@11.1.28 → express@5.2.1 → qs@6.15.2
- root → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28 → express@5.2.1 → qs@6.15.2
- root → @nestjs/swagger@11.4.5 → @nestjs/core@11.1.26 → @nestjs/platform-express@11.1.28 → express@5.2.1 → qs@6.15.2

### [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx) — moderate

qs array-limit bypass via bracket-key comma parsing

Versiones oficiales: >= 6.14.2, <= 6.15.3; corregida: 6.16.0.

Exposición en este proyecto (inspección del código y de la cadena): Análisis de parámetros y formularios HTTP; puede recibir entrada no confiable desde solicitudes.

### [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) — moderate

qs: Denial of Service via Attacker Controlled isBuffer

Versiones oficiales: >= 2.2.5, < 6.16.0; corregida: 6.16.0.

Exposición en este proyecto (inspección del código y de la cadena): Análisis de parámetros y formularios HTTP; puede recibir entrada no confiable desde solicitudes.


## Resolución y control

Se conservaron todas las herramientas y funciones. Se ejecutó `npm audit fix` sin `--force`. CI ejecuta `npm run audit:check`: conserva JSON y códigos de salida, rechaza todo aviso de cualquier severidad y diferencia errores de consulta. No hay excepciones globales ni advisories permitidos.

Versiones instaladas después de corregir (lockfile, no rangos declarados):

- @nestjs/platform-express: 11.2.7 (node_modules/@nestjs/platform-express)
- @nestjs/swagger: 11.4.7 (node_modules/@nestjs/swagger)
- @prisma/config: 6.19.3 (node_modules/@prisma/config)
- baseline-browser-mapping: 2.11.26 (node_modules/baseline-browser-mapping)
- body-parser: 2.3.0 (node_modules/body-parser)
- brace-expansion: 2.1.7 (node_modules/@jest/reporters/node_modules/brace-expansion); 5.0.12 (node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion); 1.1.21 (node_modules/brace-expansion); 5.0.12 (node_modules/glob/node_modules/brace-expansion); 2.1.7 (node_modules/jest-config/node_modules/brace-expansion); 2.1.7 (node_modules/jest-runtime/node_modules/brace-expansion)
- browserslist: 4.29.3 (node_modules/browserslist)
- deepmerge-ts: 8.0.2 (node_modules/deepmerge-ts)
- fast-uri: 3.1.8 (node_modules/fast-uri)
- joi: 17.13.8 (node_modules/joi)
- js-yaml: 3.15.2 (node_modules/@istanbuljs/load-nyc-config/node_modules/js-yaml); 5.4.2 (node_modules/@nestjs/swagger/node_modules/js-yaml); 4.3.2 (node_modules/js-yaml)
- multer: 2.4.0 (node_modules/multer)
- prisma: 6.19.3 (node_modules/prisma)
- qs: 6.16.0 (node_modules/qs)
