# Restaurat API

API administrativa para gestion operativa de restaurantes construida con `NestJS`, `TypeScript`, `PostgreSQL` y `Prisma`.

## Estado actual del MVP

El proyecto llega a Sprint 10 con foco en cierre tecnico y documental del MVP. La API ya permite:

- autenticar usuarios internos con JWT;
- gestionar usuarios;
- gestionar categorias;
- gestionar canales de venta;
- gestionar mesas del local;
- abrir y cancelar ordenes de mesa;
- gestionar productos;
- definir costos historicos por producto;
- definir precios historicos por producto y canal;
- manejar inventario de producto finalizado;
- crear tickets de venta `DRAFT`;
- agregar lineas con snapshots historicos;
- confirmar ventas y descontar stock;
- anular ventas confirmadas y revertir stock;
- consultar auditoria general;
- consultar reportes operativos basicos.

## Modulos implementados

- `auth`
- `users`
- `categories`
- `sales-channels`
- `tables`
- `table-orders`
- `products`
- `inventory`
- `sales`
- `audit`
- `reports`
- `health`

## Fuera del MVP

Este MVP no incluye:

- frontend;
- pagos;
- caja;
- facturacion fiscal;
- reembolsos;
- anulaciones parciales;
- exportacion Excel/PDF;
- dashboard visual;
- insumos;
- recetas;
- proveedores;
- compras;
- multi-sucursal;
- reportes financieros avanzados.

## Stack tecnico

- `NestJS`
- `TypeScript`
- `PostgreSQL`
- `Prisma`
- `JWT`
- `Swagger`
- `Docker`
- `Railway` como destino futuro de despliegue, sin deploy aplicado todavia

## Puesta en marcha local

### Requisitos

- `Node.js`
- `npm`
- `PostgreSQL`

### Variables de entorno

Tomar `.env.example` como base.

Variables minimas de runtime:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `SWAGGER_ENABLED`
- `CORS_ENABLED`
- `CORS_ORIGIN`

Variables usadas por el seed inicial:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_FIRST_NAME`
- `ADMIN_LAST_NAME`

Variables opcionales para usuarios demo adicionales:

- `MANAGER_EMAIL`
- `MANAGER_PASSWORD`
- `CASHIER_EMAIL`
- `CASHIER_PASSWORD`
- `AUDITOR_EMAIL`
- `AUDITOR_PASSWORD`

Notas de configuracion:

- `PORT` usa `3000` como default seguro si no se informa.
- `DATABASE_URL` y `JWT_SECRET` siguen siendo obligatorias.
- `SWAGGER_ENABLED` puede apagarse en produccion.
- `CORS_ENABLED=false` mantiene CORS desactivado.
- Si `CORS_ENABLED=true` en `production`, `CORS_ORIGIN` debe ser un origen explicito y no `*`.
- `.env.example` usa credenciales demo no productivas.

## Variables de entorno para produccion

Estas variables deben configurarse explicitamente antes de desplegar en Railway o cualquier entorno publico.

| Variable                                                                                                      | Obligatoria                                                          | Proposito                                                                            | Ejemplo seguro                                                                      | Local vs produccion                                                                                            |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `PORT`                                                                                                        | No                                                                   | Puerto HTTP de la API. Si falta, usa `3000`.                                         | `3000`                                                                              | En Railway puede ser inyectado por la plataforma.                                                              |
| `TRUST_PROXY_HOPS`                                                                                            | No                                                                   | Cantidad de proxies confiables delante de la API para resolver la IP real.           | `1`                                                                                 | Usar `0` en local y configurar la cantidad real en el proveedor de hosting.                                    |
| `NODE_ENV`                                                                                                    | Si                                                                   | Determina el entorno de ejecucion. Solo acepta `development`, `test` o `production`. | `production`                                                                        | En produccion debe ser `production`.                                                                           |
| `DATABASE_URL`                                                                                                | Si                                                                   | Cadena de conexion a PostgreSQL usada por Prisma.                                    | `postgresql://app_user:strong_password@db-host:5432/restaurant_admin?schema=public` | Local apunta a PostgreSQL propio; en Railway debe usarse la URL entregada por la plataforma.                   |
| `JWT_SECRET`                                                                                                  | Si                                                                   | Secreto usado para firmar JWT.                                                       | `use_a_long_random_secret_value_here`                                               | En produccion debe ser unico, largo y no reutilizado.                                                          |
| `JWT_EXPIRES_IN`                                                                                              | Si                                                                   | Duracion de expiracion del access token.                                             | `1d`                                                                                | Puede mantenerse igual entre local y produccion si la politica no cambia.                                      |
| `SWAGGER_ENABLED`                                                                                             | Si                                                                   | Publica o no la documentacion en `/docs`.                                            | `false`                                                                             | En produccion publica se recomienda `false`.                                                                   |
| `CORS_ENABLED`                                                                                                | Si                                                                   | Activa o desactiva CORS.                                                             | `true`                                                                              | En local puede permanecer `false` o abrirse para pruebas; en produccion debe decidirse explicitamente.         |
| `CORS_ORIGIN`                                                                                                 | No en general, pero requerido si `CORS_ENABLED=true` en `production` | Lista CSV de origenes permitidos o un origen unico.                                  | `https://admin.example.com`                                                         | En local puede ser `http://localhost:3000`; en produccion no debe quedar vacio ni `*` si CORS esta habilitado. |
| `ADMIN_EMAIL`                                                                                                 | Si                                                                   | Usuario inicial del seed.                                                            | `admin@example.com`                                                                 | En produccion debe reemplazarse por una cuenta operativa real.                                                 |
| `ADMIN_PASSWORD`                                                                                              | Si                                                                   | Password inicial del seed.                                                           | `replace_with_demo_admin_password`                                                  | En produccion no usar credenciales demo y rotarlas despues del alta inicial.                                   |
| `ADMIN_FIRST_NAME`                                                                                            | Si                                                                   | Nombre del usuario admin inicial.                                                    | `System`                                                                            | Puede variar segun operacion.                                                                                  |
| `ADMIN_LAST_NAME`                                                                                             | Si                                                                   | Apellido del usuario admin inicial.                                                  | `Admin`                                                                             | Puede variar segun operacion.                                                                                  |
| `MANAGER_EMAIL`, `MANAGER_PASSWORD`, `CASHIER_EMAIL`, `CASHIER_PASSWORD`, `AUDITOR_EMAIL`, `AUDITOR_PASSWORD` | No                                                                   | Usuarios demo opcionales del seed.                                                   | vacio                                                                               | En produccion se recomienda dejarlas vacias y crear usuarios reales por API.                                   |

Notas productivas:

- Si `DATABASE_URL` o `JWT_SECRET` faltan, la app falla al iniciar.
- En produccion, `JWT_SECRET` debe tener al menos 32 caracteres.
- Si `CORS_ENABLED=true` en `NODE_ENV=production`, `CORS_ORIGIN` debe contener dominios explicitos.
- No se valida una variable `DATABASE_SSL`; en Railway debe usarse la conexion PostgreSQL provista por la plataforma.

### Comandos principales

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
npm run build
npm run test
```

### Comandos productivos

```bash
npm run build
npm run start:prod
npm run prisma:migrate:deploy
npm run prisma:seed
```

Tambien quedan disponibles los aliases:

```bash
npm run db:migrate:deploy
npm run db:seed
```

En Railway, las migraciones deben ejecutarse como paso operativo separado y no desde `start:prod`.

### Docker local para PostgreSQL

El repositorio incluye `docker-compose.yml` para levantar PostgreSQL local:

```bash
docker compose up -d
```

La base de ejemplo queda expuesta en `localhost:5433`.

## Endpoints tecnicos

- `GET /api`
- `GET /health`
- `GET /docs` cuando `SWAGGER_ENABLED=true`

### `GET /api`

Endpoint publico de metadata basica del servicio. No requiere autenticacion y no reemplaza al health check.

Response esperada:

```json
{
  "service": "restaurant-admin-api",
  "version": "0.1.0",
  "status": "ok",
  "docs": "/docs",
  "health": "/health",
  "environment": "development"
}
```

### `GET /health`

Endpoint de liveness. No requiere autenticacion.

### `GET /health/readiness`

Endpoint de readiness con verificacion simple de base de datos. No requiere autenticacion y responde error seguro si la conexion no esta disponible.

## CORS y hardening basico

- CORS no se habilita por defecto.
- Si `CORS_ENABLED=true`, la app habilita CORS con `CORS_ORIGIN`.
- `CORS_ORIGIN` acepta un origen unico o una lista CSV.
- En `development` y `test`, si CORS esta habilitado y `CORS_ORIGIN` queda vacio, la app acepta cualquier origen.
- En `production`, `CORS_ENABLED=true` requiere `CORS_ORIGIN` especifico.
- Sprint 11 agrega `helmet` y limita payloads JSON/urlencoded a `1mb`.
- La API limita cada IP a 100 solicitudes por minuto y el login a 5 intentos por minuto.
- Si la API se publica detras de un proxy, `TRUST_PROXY_HOPS` debe reflejar la topologia real para que el limite use la IP del cliente.

## Paginacion

Los listados operativos y los historiales aceptan `limit` y `offset`. El valor predeterminado de `limit` es `50` y el maximo permitido es `100`.

## Endpoints principales por modulo

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`

### Users

- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/deactivate`
- `PATCH /api/users/:id/reactivate`

### Categories

- `POST /api/categories`
- `GET /api/categories`
- `GET /api/categories/:id`
- `PATCH /api/categories/:id`
- `PATCH /api/categories/:id/deactivate`
- `PATCH /api/categories/:id/reactivate`

### Sales Channels

- `POST /api/sales-channels`
- `GET /api/sales-channels`
- `GET /api/sales-channels/:id`
- `PATCH /api/sales-channels/:id`
- `PATCH /api/sales-channels/:id/deactivate`
- `PATCH /api/sales-channels/:id/reactivate`

### Tables

- `POST /api/tables`
- `GET /api/tables`
- `GET /api/tables/:id`
- `PATCH /api/tables/:id`
- `PATCH /api/tables/:id/deactivate`
- `PATCH /api/tables/:id/reactivate`

### Table Orders

- `GET /api/table-orders`
- `POST /api/tables/:tableId/orders/open`
- `GET /api/tables/:tableId/orders/current`
- `GET /api/table-orders/:id`
- `POST /api/table-orders/:id/items`
- `PATCH /api/table-orders/:id/items/:itemId`
- `DELETE /api/table-orders/:id/items/:itemId`
- `POST /api/table-orders/:id/cancel`
- `POST /api/table-orders/:id/close`

### Products

- `POST /api/products`
- `GET /api/products`
- `GET /api/products/:id`
- `PATCH /api/products/:id`
- `PATCH /api/products/:id/deactivate`
- `PATCH /api/products/:id/reactivate`
- `POST /api/products/:id/costs`
- `GET /api/products/:id/costs`
- `GET /api/products/:id/costs/current`
- `POST /api/products/:id/prices`
- `GET /api/products/:id/prices`
- `GET /api/products/:id/prices/current`

### Inventory

- `GET /api/inventory`
- `GET /api/inventory/products/:productId`
- `GET /api/inventory/movements`
- `GET /api/inventory/products/:productId/movements`
- `POST /api/inventory/products/:productId/stock-in`
- `POST /api/inventory/products/:productId/adjust`
- `POST /api/inventory/products/:productId/waste`
- `POST /api/inventory/products/:productId/return-in`
- `PATCH /api/inventory/products/:productId/minimum-stock`

### Sales

- `POST /api/sales/tickets`
- `GET /api/sales/tickets`
- `GET /api/sales/tickets/:ticketId`
- `PATCH /api/sales/tickets/:ticketId`
- `POST /api/sales/tickets/:ticketId/cancel`
- `POST /api/sales/tickets/:ticketId/items`
- `PATCH /api/sales/tickets/:ticketId/items/:itemId`
- `DELETE /api/sales/tickets/:ticketId/items/:itemId`
- `POST /api/sales/tickets/:ticketId/confirm`
- `POST /api/sales/tickets/:ticketId/void`

### Audit

- `GET /api/audit-logs`
- `GET /api/audit-logs/:id`

### Reports

- `GET /api/reports/stock`
- `GET /api/reports/sales-by-channel`
- `GET /api/reports/sales-by-product`
- `GET /api/reports/sales-by-user`
- `GET /api/reports/inventory-movements`

## Seed minimo funcional

`prisma/seed.ts` crea o conserva de forma idempotente:

- usuario inicial `ADMIN` desde variables obligatorias;
- categorias base;
- canales de venta base;
- usuarios demo `MANAGER`, `CASHIER` y `AUDITOR` solo si sus variables opcionales estan configuradas;
- productos demo:
  - `Hamburguesa clasica`
  - `Papas fritas`
  - `Coca-Cola 500ml`
  - `Cargo de delivery`
- costos demo por producto;
- precios demo por canal para `Mostrador`, `PedidosYa`, `Uber Eats` y `WhatsApp`;
- mesas demo `M01`, `M02`, `M03`, `Barra 01` y `Terraza 01`;
- stock inicial consistente para productos inventariables:
  - hamburguesa `10`
  - papas `10`
  - coca-cola `20`

El seed no crea ventas confirmadas. Si las variables opcionales de usuarios demo no existen, esos usuarios no se crean y pueden cargarse luego por API con `ADMIN`.

Politica de uso del seed:

- el seed demo es apto para `local` y para entornos `demo/staging`;
- en produccion no debe ejecutarse por defecto salvo decision explicita;
- volver a ejecutar el seed no debe inflar stock ni duplicar usuarios, categorias, canales, productos ni precios/costos vigentes;
- las credenciales demo deben reemplazarse antes de cualquier uso real.

## Flujo demo resumido

1. Levantar PostgreSQL local.
2. Configurar `.env`.
3. Ejecutar migraciones y `npm run prisma:seed`.
4. Iniciar la API y abrir Swagger.
5. Hacer login con el usuario `ADMIN` del seed.
6. Usar datos demo ya sembrados o crear los faltantes por API.
7. Crear ticket `DRAFT`, agregar items y confirmar venta.
8. Verificar `SALE_OUT` en inventario y auditoria.
9. Consultar reportes operativos.
10. Anular una venta confirmada y verificar `VOID_REVERSAL`.

## Estado de build y tests

- `npm run build`: pasando
- `npm run test`: pasando
- cobertura smoke agregada para:
  - `GET /api`
  - `GET /health`
  - `POST /api/auth/login`

## Swagger y contrato publico

- Todos los endpoints de negocio usan prefijo `/api`.
- `GET /health` y `GET /health/readiness` permanecen fuera del prefijo como endpoints operativos publicos.
- `GET /api` expone metadata publica simple.
- Swagger se publica en `/docs` y debe ser usable como contrato de referencia del MVP.

## Docker y readiness para Railway

- `Dockerfile` multi-stage disponible.
- `.dockerignore` evita incluir secretos y artefactos innecesarios.
- `docker-compose.yml` facilita levantar PostgreSQL local.
- El proyecto queda preparado para configurar Railway sin ejecutar deploy real desde este repositorio.
- Antes de iniciar la app en Railway, ejecutar migraciones por separado con `npm run prisma:migrate:deploy`.
- Guia especifica: [Deploy en Railway](/D:/PersonalProyect/restaurat-api/docs/21-railway-deploy-guide.md)
- Checklist operativo: [Post-deploy checklist](/D:/PersonalProyect/restaurat-api/docs/22-post-deploy-checklist.md)
- Politica de demo: [Demo environment notes](/D:/PersonalProyect/restaurat-api/docs/23-demo-environment-notes.md)
- Validacion local: [Local production validation](/D:/PersonalProyect/restaurat-api/docs/24-local-production-validation.md)

## Credenciales demo sugeridas

Ejemplo de variables no productivas para entorno local:

- `ADMIN_EMAIL=admin@example.com`
- `ADMIN_PASSWORD=replace_with_demo_admin_password`
- `MANAGER_EMAIL`, `CASHIER_EMAIL`, `AUDITOR_EMAIL`: opcionales

Comando de seed:

```bash
npm run prisma:seed
```

## Documentacion adicional

- [Especificacion funcional MVP](/D:/PersonalProyect/restaurat-api/docs/00-mvp-functional-spec.md)
- [Flujo principal](/D:/PersonalProyect/restaurat-api/docs/07-main-business-flow.md)
- [Sprint 9 - Reportes operativos](/D:/PersonalProyect/restaurat-api/docs/16-sprint-9-operational-reports.md)
- [Sprint 10 - MVP Release Readiness](/D:/PersonalProyect/restaurat-api/docs/17-sprint-10-mvp-release-readiness.md)
- [Guia demo end-to-end](/D:/PersonalProyect/restaurat-api/docs/18-mvp-demo-flow.md)
- [Plan tecnico e2e](/D:/PersonalProyect/restaurat-api/docs/19-e2e-test-plan.md)
- [Deploy en Railway](/D:/PersonalProyect/restaurat-api/docs/21-railway-deploy-guide.md)
- [Checklist operativo post-deploy](/D:/PersonalProyect/restaurat-api/docs/22-post-deploy-checklist.md)
- [Notas de entorno demo](/D:/PersonalProyect/restaurat-api/docs/23-demo-environment-notes.md)
- [Validacion local productiva](/D:/PersonalProyect/restaurat-api/docs/24-local-production-validation.md)
