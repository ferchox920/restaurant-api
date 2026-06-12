# Sprint 11 - Local Production Validation

## Objetivo

Registrar la validacion local de estilo productivo ejecutada durante el cierre de Sprint 11, sin hacer deploy real ni usar secretos reales.

## Comandos ejecutados

```bash
npm run prisma:generate
npm run build
npm test
docker build -t restaurant-admin-api .
```

## Resultados

### `npm run prisma:generate`

Resultado: fallo local.

Resumen del error observado en Windows:

```text
EPERM: operation not permitted, rename '...node_modules\.prisma\client\query_engine-windows.dll.node.tmp...' -> '...node_modules\.prisma\client\query_engine-windows.dll.node'
```

Notas:

- el schema Prisma fue cargado correctamente;
- tambien aparece un warning por `package.json#prisma` deprecado hacia Prisma 7;
- el fallo parece ligado al entorno local Windows y a un lock sobre el engine generado;
- no se conecto a ninguna base remota.

### `npm run build`

Resultado: exitoso.

### `npm test`

Resultado: exitoso.

Estado observado:

- `34` test suites pasando;
- `236` tests pasando.

### `docker build -t restaurant-admin-api .`

Resultado: no ejecutable completamente en esta sesion.

Error observado:

```text
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
The system cannot find the file specified.
```

Interpretacion:

- Docker CLI esta instalado;
- el daemon o Docker Desktop Linux Engine no estaba levantado al momento de la validacion;
- por esa razon no se pudo construir la imagen ni correr contenedor local.

## Validacion runtime local fuera de Docker

Se valido la app compilada localmente con `node dist/main.js` y variables locales seguras.

Resultados:

- `GET /health` -> `200`
- `GET /health/readiness` -> `503` sin base disponible
- `GET /api` -> `200`
- `GET /docs` -> `200`
- `GET /api/users` sin token -> `401`

Interpretacion:

- liveness, metadata publica y Swagger quedaron operativos;
- readiness responde fallo seguro cuando la base no esta disponible;
- los endpoints protegidos rechazan acceso sin JWT.

## Validacion manual de idempotencia del seed

No se agrego una suite automatizada dedicada al seed en Sprint 11.

Validacion manual recomendada en una base local o demo aislada:

1. aplicar migraciones;
2. ejecutar `npm run prisma:seed`;
3. registrar cantidad de usuarios, categorias, canales, productos, costos vigentes, precios vigentes y stock;
4. ejecutar `npm run prisma:seed` por segunda vez;
5. confirmar que:
   - no se duplican usuarios;
   - no se duplican categorias;
   - no se duplican canales;
   - no se duplican productos;
   - no se crean nuevos costos vigentes si ya existe uno;
   - no se crean nuevos precios vigentes si ya existe uno;
   - el stock no aumenta por rerun del seed;
   - no aparecen movimientos de inventario de seed repetidos.

## Limitaciones

- no se realizo deploy real;
- no se ejecutaron migraciones contra una base remota;
- no se construyo imagen Docker por falta de daemon activo;
- no se pudo validar `403` por rol insuficiente contra runtime real sin una base local confiable con usuario de bajo privilegio.

## Recomendaciones

- reintentar `npm run prisma:generate` cerrando procesos que puedan bloquear `node_modules\.prisma\client`;
- migrar luego la configuracion `package.json#prisma` a `prisma.config.ts` antes de Prisma 7;
- levantar Docker Desktop antes de repetir la validacion de imagen;
- repetir la validacion completa en staging/demo con base real del entorno antes del deploy productivo.
