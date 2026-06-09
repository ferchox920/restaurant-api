# Restaurat API

API administrativa para gestion operativa de restaurantes, orientada inicialmente a productos terminados, stock, costos historicos, precios por canal y tickets de venta con trazabilidad.

## Objetivo del MVP

Construir una API backend que permita administrar la operacion comercial basica de un restaurante con foco en:

- Gestion de productos terminados.
- Control de stock basado en movimientos.
- Costos historizados por producto.
- Precios historizados por canal.
- Tickets de venta con estados definidos.
- Reversion de stock ante anulaciones.
- Trazabilidad de usuarios responsables y auditoria de acciones criticas.

## Alcance Actual

El alcance actual combina el diseno funcional del MVP con la implementacion tecnica realizada hasta Sprint 5. Hoy el proyecto incluye:

- Modelo conceptual del dominio.
- Reglas de negocio principales.
- Estados de ticket.
- Tipos de movimiento de inventario.
- Roles iniciales y permisos funcionales.
- Criterios de aceptacion.
- Flujo principal del sistema.
- Base tecnica NestJS con Prisma, Swagger, validacion global y health check.
- Usuarios internos, autenticacion JWT y autorizacion por roles.
- Catalogo base con categorias, canales de venta y productos.
- Costos historicos por producto.
- Precios historicos por producto y canal.
- Inventario de producto finalizado mediante movimientos historicos y proyeccion de stock actual.

Los tickets y ventas permanecen pendientes para los siguientes sprints.

## Funcionalidades Fuera del MVP

Quedan explicitamente fuera del MVP:

- Gestion de insumos.
- Gestion de recetas o formulas.
- Compras a proveedores.
- Multiples sucursales.
- Facturacion fiscal.
- Integraciones automaticas con plataformas externas.
- Frontend administrativo o punto de venta visual.

## Documentacion Disponible en `/docs`

- [00-mvp-functional-spec.md](D:/PersonalProyect/restaurat-api/docs/00-mvp-functional-spec.md): especificacion funcional general del MVP y resumen de decisiones del Sprint 0.
- [01-domain-entities.md](D:/PersonalProyect/restaurat-api/docs/01-domain-entities.md): entidades principales del dominio y relaciones conceptuales.
- [02-business-rules.md](D:/PersonalProyect/restaurat-api/docs/02-business-rules.md): reglas de negocio operativas del MVP.
- [03-ticket-states.md](D:/PersonalProyect/restaurat-api/docs/03-ticket-states.md): estados validos del ticket y transiciones permitidas.
- [04-inventory-movements.md](D:/PersonalProyect/restaurat-api/docs/04-inventory-movements.md): catalogo inicial de movimientos de inventario.
- [05-roles-and-permissions.md](D:/PersonalProyect/restaurat-api/docs/05-roles-and-permissions.md): roles iniciales y permisos funcionales.
- [06-acceptance-criteria.md](D:/PersonalProyect/restaurat-api/docs/06-acceptance-criteria.md): criterios de aceptacion del Sprint 0 y del MVP funcional.
- [07-main-business-flow.md](D:/PersonalProyect/restaurat-api/docs/07-main-business-flow.md): flujo principal del sistema de punta a punta.
- [08-sprint-1-technical-foundation.md](D:/PersonalProyect/restaurat-api/docs/08-sprint-1-technical-foundation.md): resumen tecnico de la base implementada en Sprint 1.
- [09-sprint-2-auth-users-roles.md](D:/PersonalProyect/restaurat-api/docs/09-sprint-2-auth-users-roles.md): resumen tecnico de usuarios, autenticacion JWT y autorizacion por rol implementados en Sprint 2.
- [10-sprint-3-catalog.md](D:/PersonalProyect/restaurat-api/docs/10-sprint-3-catalog.md): resumen tecnico del catalogo base con categorias, canales de venta y productos implementados en Sprint 3.

## Flujo Principal Resumido

1. Un usuario `ADMIN` crea categorias, canales de venta y productos.
2. Un usuario autorizado define costos historizados y precios por canal.
3. Un usuario autorizado carga stock mediante movimientos `STOCK_IN`.
4. Un usuario `CASHIER` crea un ticket en estado `DRAFT`.
5. El sistema resuelve precio por canal y costo vigente del producto.
6. El ticket conserva snapshots historicos de nombre, precio y costo.
7. Al confirmar el ticket, el sistema valida stock suficiente.
8. Si la validacion es correcta, genera movimientos `SALE_OUT`, descuenta stock y cambia el ticket a `CONFIRMED`.
9. Si una venta confirmada se anula, el sistema genera `VOID_REVERSAL` y devuelve stock sin borrar el historial previo.
10. El sistema permite consultar ventas, stock y movimientos con trazabilidad de usuario responsable.

## Stack Tecnologico Previsto

Sin implementacion todavia, el stack objetivo para Sprint 1 en adelante es:

- `NestJS`
- `TypeScript`
- `PostgreSQL`
- `Prisma`
- `JWT`
- `Swagger`
- `Railway`

## Estado Actual del Proyecto

- `Sprint 0`: diseno funcional y contrato del sistema.
- `Sprint 1`: base tecnica inicial del backend implementada.
- `Sprint 2`: usuarios, autenticacion JWT y roles basicos implementados.
- `Sprint 3`: catalogo base con categorias, canales de venta y productos implementado.
- `Sprint 4`: costos historicos por producto y precios historicos por producto/canal implementados.
- `Sprint 5`: inventario de producto finalizado implementado.
- La siguiente etapa prevista es incorporar tickets y ventas operativas.

## Sprint 3 - Catalogo de productos, categorias y canales

Sprint 3 agrega una primera capa operativa de catalogo, protegida con JWT y roles, sin incorporar todavia costos historicos, precios por canal, stock ni tickets.

### Alcance implementado

- Modelo `Category`.
- Modelo `SalesChannel`.
- Modelo `Product`.
- Enums `ProductUnit`, `StockManagementType` y `CommissionType`.
- Endpoints administrativos para categorias, canales y productos.
- Seed inicial de categorias y canales.
- Tests unitarios para los servicios del catalogo.

### Como correr migraciones

1. Verificar que `.env` tenga una `DATABASE_URL` valida.
2. Ejecutar `npm run prisma:migrate -- --name add_catalog_entities` si se necesita recrear la migracion en desarrollo.
3. Ejecutar `npm run prisma:generate` para regenerar el cliente Prisma.

### Como ejecutar seed

- Ejecutar `npm run prisma:seed`.
- El seed conserva el `ADMIN` inicial del Sprint 2.
- El seed agrega categorias y canales base sin duplicarlos.

### Endpoints de categorias

- `POST /api/categories`
- `GET /api/categories`
- `GET /api/categories/:id`
- `PATCH /api/categories/:id`
- `PATCH /api/categories/:id/deactivate`
- `PATCH /api/categories/:id/reactivate`

### Endpoints de canales

- `POST /api/sales-channels`
- `GET /api/sales-channels`
- `GET /api/sales-channels/:id`
- `PATCH /api/sales-channels/:id`
- `PATCH /api/sales-channels/:id/deactivate`
- `PATCH /api/sales-channels/:id/reactivate`

### Endpoints de productos

- `POST /api/products`
- `GET /api/products`
- `GET /api/products/:id`
- `PATCH /api/products/:id`
- `PATCH /api/products/:id/deactivate`
- `PATCH /api/products/:id/reactivate`

### Roles permitidos

- `ADMIN` y `MANAGER`: crear, editar, desactivar y reactivar categorias, canales y productos.
- `ADMIN`, `MANAGER`, `AUDITOR` y `CASHIER`: listar y consultar categorias, canales y productos.

### Reglas importantes del catalogo

- El producto puede existir sin stock.
- Crear producto no crea stock.
- No hay eliminacion fisica; hay desactivacion logica.
- Una categoria inactiva no puede asignarse a nuevos productos.

### Que queda pendiente despues de Sprint 3

- Inventario operativo, previsto para Sprint 5.
- Tickets de venta, previstos para Sprint 6.
- Auditoria de negocio completa.

## Sprint 4 - Costos y precios historizados

Sprint 4 agrega costos historicos por producto y precios historicos por producto/canal, ambos con versionado inmediato y sin modificar versiones anteriores.

### Alcance implementado

- Modelo `ProductCostHistory`.
- Modelo `ProductPriceHistory`.
- Endpoints para crear y consultar costos historicos.
- Endpoints para crear y consultar precios historicos por canal.
- Mapeo de montos como `string` decimal en responses.
- Tests unitarios de servicios, DTOs y metadata de roles.

### Como correr migraciones de Sprint 4

1. Verificar que `.env` tenga una `DATABASE_URL` valida.
2. Ejecutar `npm run prisma:migrate -- --name add_cost_and_price_history` si hace falta recrear la migracion en desarrollo.
3. Ejecutar `npm run prisma:generate` para regenerar el cliente Prisma.

### Endpoints de costos

- `POST /api/products/:id/costs`
- `GET /api/products/:id/costs`
- `GET /api/products/:id/costs/current`

### Endpoints de precios

- `POST /api/products/:id/prices`
- `GET /api/products/:id/prices`
- `GET /api/products/:id/prices/current?channelId=<uuid>`

### Roles permitidos

- Costos `POST`: `ADMIN`, `MANAGER`
- Costos `GET`: `ADMIN`, `MANAGER`, `AUDITOR`
- Precios `POST`: `ADMIN`, `MANAGER`
- Precios historial `GET`: `ADMIN`, `MANAGER`, `AUDITOR`
- Precio vigente `GET`: `ADMIN`, `MANAGER`, `CASHIER`, `AUDITOR`

### Ejemplos basicos

Crear costo:

```json
{
  "cost": 3000
}
```

Crear precio:

```json
{
  "salesChannelId": "0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4",
  "price": 7000
}
```

Consultar precio vigente:

```text
GET /api/products/:id/prices/current?channelId=0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4
```

### Que queda pendiente despues de Sprint 4

- Inventario operativo, previsto para Sprint 5.
- Tickets de venta, previstos para Sprint 6.
- Auditoria de negocio completa.

## Sprint 5 - Inventario de producto finalizado

Sprint 5 agrega inventario de producto finalizado mediante movimientos historicos y una proyeccion rapida del stock actual.

### Alcance implementado

- Modelo `ProductStock`.
- Modelo `InventoryMovement`.
- Enums `InventoryMovementType` e `InventoryReferenceType`.
- Endpoints para consultar inventario y movimientos.
- Endpoints para `STOCK_IN`, `MANUAL_ADJUSTMENT`, `WASTE`, `RETURN_IN` y actualizacion de `minimumStock`.
- Validaciones para `FINISHED_PRODUCT`, producto activo y no stock negativo.
- Tests unitarios para DTOs, mappers, `InventoryService` y metadata de roles de `InventoryController`.

### Como correr migraciones de Sprint 5

1. Verificar que `.env` tenga una `DATABASE_URL` valida.
2. La migracion versionada de Sprint 5 vive en `prisma/migrations/20260609233000_add_finished_product_inventory/`.
3. Ejecutar `npm run prisma:generate` para regenerar el cliente Prisma.
4. Si hace falta recrear la migracion en desarrollo, usar `npm run prisma:migrate -- --name add_finished_product_inventory`.

### Endpoints de inventario

- `GET /api/inventory`
- `GET /api/inventory/products/:productId`
- `GET /api/inventory/movements`
- `GET /api/inventory/products/:productId/movements`
- `POST /api/inventory/products/:productId/stock-in`
- `POST /api/inventory/products/:productId/adjust`
- `POST /api/inventory/products/:productId/waste`
- `POST /api/inventory/products/:productId/return-in`
- `PATCH /api/inventory/products/:productId/minimum-stock`

### Roles permitidos

- Inventario actual `GET`: `ADMIN`, `MANAGER`, `CASHIER`, `AUDITOR`
- Movimientos `GET`: `ADMIN`, `MANAGER`, `AUDITOR`
- Operaciones de stock `POST/PATCH`: `ADMIN`, `MANAGER`

### Ejemplos basicos

Stock in:

```json
{
  "quantity": 3,
  "reason": "Produccion inicial del dia"
}
```

Waste:

```json
{
  "quantity": 1,
  "reason": "Producto danado"
}
```

Manual adjustment:

```json
{
  "newStock": 5,
  "reason": "Conteo fisico de cierre"
}
```

Return in:

```json
{
  "quantity": 1,
  "reason": "Reingreso manual"
}
```

Minimum stock:

```json
{
  "minimumStock": 2
}
```

### Reglas importantes de inventario

- El inventario es solo de producto finalizado.
- Crear producto no crea stock automaticamente.
- El stock nace desde movimientos.
- `ProductStock` es la proyeccion del stock actual.
- `InventoryMovement` es el historial auditable.
- No se permite stock negativo.
- `SALE_OUT` y `VOID_REVERSAL` quedan reservados para sprints de ventas.

### Que queda pendiente para Sprint 6

- Tickets de venta.
- Confirmacion de ventas.
- Descuento automatico de stock por ventas.
- Reversion por anulacion de venta.
- Auditoria de negocio completa.
- Insumos y recetas.

## Sprint 2 - Usuarios, autenticacion y roles

Sprint 2 agrega gestion administrativa de usuarios, autenticacion JWT y una politica conservadora de autorizacion por rol.

### Alcance implementado

- Modelo `User` en Prisma.
- Enum `Role` con `ADMIN`, `MANAGER`, `CASHIER` y `AUDITOR`.
- Login con `POST /api/auth/login`.
- Consulta de usuario autenticado con `GET /api/auth/me`.
- Gestion de usuarios restringida a `ADMIN`.
- Seed inicial de usuario `ADMIN`.

### Como correr migraciones

1. Verificar que `.env` tenga una `DATABASE_URL` valida.
2. Ejecutar `npm run prisma:migrate -- --name <migration_name>` para nuevas migraciones durante desarrollo.
3. Ejecutar `npm run prisma:generate` si hace falta regenerar el cliente Prisma.

### Como ejecutar seed

- Ejecutar `npm run prisma:seed`.
- El seed crea un `ADMIN` inicial usando:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - `ADMIN_FIRST_NAME`
  - `ADMIN_LAST_NAME`
- Si ya existe un usuario con `ADMIN_EMAIL`, no se duplica.

### Como iniciar sesion

Ejemplo de request:

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

Ruta:

- `POST /api/auth/login`

### Como usar Bearer token

1. Iniciar sesion con `POST /api/auth/login`.
2. Tomar el valor de `accessToken`.
3. Enviar el header:

```text
Authorization: Bearer JWT_TOKEN
```

4. Usarlo en rutas protegidas como `GET /api/auth/me` y todos los endpoints de `/api/users`.

### Endpoints disponibles

- `GET /api` endpoint base temporal de bootstrap
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/deactivate`
- `PATCH /api/users/:id/reactivate`

### Restricciones actuales

- `GET /api` se mantiene como endpoint tecnico temporal y no representa funcionalidad de negocio.
- Por ahora la gestion de usuarios queda restringida a `ADMIN`.
- `MANAGER`, `CASHIER` y `AUDITOR` no gestionan usuarios en este sprint.
- Productos, inventario, ventas y auditoria de negocio todavia no estan implementados.
- La auditoria completa vendra en un sprint posterior.

## Sprint 1 - Base tecnica de la API

En Sprint 1 se definio la base tecnica inicial del backend, manteniendo intacta la documentacion funcional generada en Sprint 0.

### Stack tecnico definido

- `NestJS`
- `TypeScript`
- `PostgreSQL`
- `Prisma`
- `Swagger`
- `Docker`
- `Railway` como opcion de deploy futuro

### Requisitos para correr localmente

- `Node.js`
- `npm`
- `PostgreSQL`
- Variables de entorno configuradas

### Puesta en marcha local

1. Instalar dependencias con `npm install`.
2. Crear un archivo `.env` local tomando como base `.env.example`.
3. Verificar que `DATABASE_URL` apunte a una instancia valida de PostgreSQL.
4. Generar cliente Prisma con `npm run prisma:generate`.
5. Iniciar la API con `npm run start:dev` o `npm run start`.

### Comandos principales

- `npm install`
- `npm run start`
- `npm run start:dev`
- `npm run build`
- `npm run prisma`
- `npm run prisma:migrate`
- `npm run test`

### Variables de entorno requeridas

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `SWAGGER_ENABLED`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_FIRST_NAME`
- `ADMIN_LAST_NAME`

### Seed inicial de ADMIN

- Ejecutar `npm run prisma:seed` para crear el usuario `ADMIN` inicial.
- El seed no duplica usuarios si ya existe uno con `ADMIN_EMAIL`.
- Advertencia: las credenciales iniciales de bootstrap deben cambiarse antes de usar el sistema fuera de desarrollo local o produccion.

### Rutas disponibles actualmente

- `GET /health`
- `GET /docs` si `SWAGGER_ENABLED=true`

### Estado de la implementacion

La API ya cuenta con configuracion inicial de:

- Aplicacion `NestJS` compilable
- Configuracion global por variables de entorno
- Validacion global de payloads con `ValidationPipe`
- Swagger condicional
- Prisma configurado para `PostgreSQL`
- `Dockerfile` inicial para despliegue futuro
- Health check basico

Todavia no se implementaron modulos de negocio como productos, ventas, inventario o usuarios. Esas capacidades corresponden a los proximos sprints.
