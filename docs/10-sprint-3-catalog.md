# Sprint 3 - Catalog

Este documento resume la implementacion tecnica realizada en Sprint 3 para incorporar el catalogo base del restaurante: categorias, canales de venta y productos vendibles.

## Objetivo del Sprint 3

El objetivo principal de Sprint 3 fue habilitar una primera capa administrativa de catalogo, protegida por autenticacion JWT y autorizacion por roles, sin incorporar todavia logica de costos, precios, stock ni ventas.

Sprint 3 permitio:

- Crear y administrar categorias.
- Crear y administrar canales de venta.
- Crear y administrar productos vendibles.
- Consultar catalogo con filtros basicos.
- Preparar el dominio para los siguientes sprints de precios, costos, inventario y tickets.

## Alcance implementado

Sprint 3 implementa:

- Modelos `Category`, `SalesChannel` y `Product` en Prisma.
- Enums `ProductUnit`, `StockManagementType` y `CommissionType`.
- Modulos NestJS para categorias, canales de venta y productos.
- Endpoints CRUD administrativos con desactivacion logica.
- Proteccion con `JwtAuthGuard` y `RolesGuard`.
- Documentacion Swagger para el catalogo.
- Seed inicial de categorias y canales.
- Tests unitarios para servicios de catalogo.

## Entidades agregadas

### `Category`

Campos principales:

- `id`: UUID
- `name`: string unico
- `description`: string nullable
- `active`: boolean con default `true`
- `createdById`: string nullable
- `createdAt`: `DateTime`
- `updatedAt`: `DateTime`

Notas:

- No hay eliminacion fisica.
- La desactivacion logica se maneja con `active=false`.
- Una categoria puede tener productos asociados sin que se borren al desactivarla.

### `SalesChannel`

Campos principales:

- `id`: UUID
- `name`: string unico
- `code`: string unico
- `description`: string nullable
- `commissionType`: `CommissionType`
- `commissionValue`: decimal
- `active`: boolean con default `true`
- `createdById`: string nullable
- `createdAt`: `DateTime`
- `updatedAt`: `DateTime`

Notas:

- Representa lugares o plataformas donde ocurre la venta.
- No hay eliminacion fisica.
- La desactivacion logica se maneja con `active=false`.

### `Product`

Campos principales:

- `id`: UUID
- `name`: string
- `description`: string nullable
- `sku`: string nullable unico
- `categoryId`: string nullable
- `unit`: `ProductUnit`
- `stockManagementType`: `StockManagementType`
- `active`: boolean con default `true`
- `createdById`: string nullable
- `createdAt`: `DateTime`
- `updatedAt`: `DateTime`

Notas:

- El producto puede existir sin stock.
- Crear producto no crea stock.
- No hay eliminacion fisica.
- La desactivacion logica se maneja con `active=false`.

## Enums agregados

### `ProductUnit`

- `UNIT`
- `PORTION`
- `SERVICE`

### `StockManagementType`

- `FINISHED_PRODUCT`
- `RECIPE_BASED`
- `NON_STOCKED`

### `CommissionType`

- `NONE`
- `PERCENTAGE`
- `FIXED`

## Reglas de negocio implementadas

### Categorias

- `name` es obligatorio y unico.
- No se eliminan fisicamente categorias.
- Desactivar una categoria no elimina productos asociados.
- Una categoria inactiva queda registrada, pero no deberia usarse para nuevos productos.
- En este sprint esa restriccion ya se valida al crear o actualizar productos.

### Canales de venta

- `name` es obligatorio y unico.
- `code` es obligatorio y unico.
- `commissionValue` debe ser mayor o igual a `0`.
- Si `commissionType` es `NONE`, `commissionValue` debe ser `0`.
- Si `commissionType` es `PERCENTAGE`, `commissionValue` debe estar entre `0` y `100`.
- Si `commissionType` es `FIXED`, `commissionValue` puede ser cualquier valor decimal mayor o igual a `0`.
- No se eliminan fisicamente canales.

### Productos

- `name` es obligatorio.
- `sku` es opcional, pero unico si se informa.
- `categoryId` es opcional.
- Si se informa `categoryId`, la categoria debe existir.
- Si se informa `categoryId`, la categoria debe estar activa.
- `unit` debe ser un valor valido de `ProductUnit`.
- `stockManagementType` acepta `FINISHED_PRODUCT`, `NON_STOCKED` y `RECIPE_BASED`.
- El producto puede existir sin stock.
- Crear producto no crea stock.
- No se eliminan fisicamente productos.

## Roles y permisos aplicados

### Categorias

- `ADMIN` y `MANAGER`: crear, editar, desactivar y reactivar.
- `ADMIN`, `MANAGER`, `AUDITOR` y `CASHIER`: listar y consultar.

### Canales de venta

- `ADMIN` y `MANAGER`: crear, editar, desactivar y reactivar.
- `ADMIN`, `MANAGER`, `AUDITOR` y `CASHIER`: listar y consultar.

### Productos

- `ADMIN` y `MANAGER`: crear, editar, desactivar y reactivar.
- `ADMIN`, `MANAGER`, `AUDITOR` y `CASHIER`: listar y consultar.

## Endpoints disponibles

Todos los endpoints del catalogo requieren Bearer token.

### Categorias

- `POST /api/categories`
- `GET /api/categories`
- `GET /api/categories/:id`
- `PATCH /api/categories/:id`
- `PATCH /api/categories/:id/deactivate`
- `PATCH /api/categories/:id/reactivate`

### Canales de venta

- `POST /api/sales-channels`
- `GET /api/sales-channels`
- `GET /api/sales-channels/:id`
- `PATCH /api/sales-channels/:id`
- `PATCH /api/sales-channels/:id/deactivate`
- `PATCH /api/sales-channels/:id/reactivate`

### Productos

- `POST /api/products`
- `GET /api/products`
- `GET /api/products/:id`
- `PATCH /api/products/:id`
- `PATCH /api/products/:id/deactivate`
- `PATCH /api/products/:id/reactivate`

## Query params disponibles

### Categorias

- `active=true`
- `active=false`

Si no se envia `active`, devuelve todas las categorias.

### Canales de venta

- `active=true`
- `active=false`

Si no se envia `active`, devuelve todos los canales.

### Productos

- `active=true`
- `active=false`
- `categoryId=<uuid>`
- `search=<texto>`

Si no se envian filtros, devuelve todos los productos.

## Seed de categorias y canales

El archivo `prisma/seed.ts` mantiene el seed del usuario `ADMIN` del Sprint 2 y agrega datos iniciales de catalogo.

### Categorias iniciales

- `Hamburguesas`
- `Papas`
- `Bebidas`
- `Postres`
- `Promociones`

### Canales iniciales

- `Mostrador` con code `COUNTER`
- `PedidosYa` con code `PEDIDOS_YA`
- `Uber Eats` con code `UBER_EATS`
- `WhatsApp` con code `WHATSAPP`
- `Salon` con code `DINING_ROOM`

### Reglas del seed

- Es idempotente.
- No duplica categorias si ya existen.
- No duplica canales si ya existen.
- `Mostrador`, `WhatsApp` y `Salon` usan `commissionType=NONE` y `commissionValue=0`.
- `PedidosYa` y `Uber Eats` usan `commissionType=PERCENTAGE` y `commissionValue=0`.

### Ejecucion

```bash
npm run prisma:seed
```

## Ejemplos de payload

### Crear categoria

```json
{
  "name": "Hamburguesas",
  "description": "Linea principal del menu"
}
```

### Crear canal de venta

```json
{
  "name": "PedidosYa",
  "code": "PEDIDOS_YA",
  "description": "Marketplace externo",
  "commissionType": "PERCENTAGE",
  "commissionValue": 0
}
```

### Crear producto

```json
{
  "name": "Hamburguesa clasica",
  "description": "Pan, carne y cheddar",
  "sku": "HAM-001",
  "categoryId": "uuid-de-categoria",
  "unit": "UNIT",
  "stockManagementType": "FINISHED_PRODUCT"
}
```

## Casos de error relevantes

- Payload invalido: `400 Bad Request`
- Token ausente o invalido: `401 Unauthorized`
- Rol insuficiente: `403 Forbidden`
- Categoria duplicada por `name`: `409 Conflict`
- Canal duplicado por `name`: `409 Conflict`
- Canal duplicado por `code`: `409 Conflict`
- Producto duplicado por `sku`: `409 Conflict`
- Categoria inexistente al consultar o editar: `404 NotFound`
- Canal inexistente al consultar o editar: `404 NotFound`
- Producto inexistente al consultar o editar: `404 NotFound`
- Categoria inexistente al asignar a producto: `404 NotFound`
- Categoria inactiva al asignar a producto: `400 Bad Request`
- `commissionType=NONE` con valor distinto de `0`: `400 Bad Request`
- `commissionType=PERCENTAGE` fuera de rango `0..100`: `400 Bad Request`

## Criterios de aceptacion del Sprint 3

Sprint 3 se considera aceptado si se cumplen los siguientes puntos:

- Existen los modelos `Category`, `SalesChannel` y `Product` en Prisma.
- Existen los enums `ProductUnit`, `StockManagementType` y `CommissionType`.
- La migracion correspondiente fue creada y aplicada.
- Prisma Client fue regenerado.
- Existen endpoints protegidos para categorias, canales y productos.
- Los roles se aplican segun la politica definida.
- Los listados admiten filtros basicos.
- El producto puede existir sin stock.
- Crear producto no crea stock.
- El seed inicial crea categorias y canales sin duplicarlos.
- Existen tests unitarios para los servicios principales del catalogo.

## Que NO se implemento todavia

Sprint 3 no implementa aun:

- Costos historicos
- Precios historicos
- Precios por canal
- Stock operativo
- Movimientos de inventario
- Tickets de venta
- Auditoria de negocio completa
- Insumos
- Recetas

Plan previsto:

- Costos y precios se implementaran en Sprint 4.
- Inventario se implementara en Sprint 5.
- Tickets se implementaran en Sprint 6.
- El stock se implementara luego mediante movimientos.
