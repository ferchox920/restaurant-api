# Sprint 5 - Finished Product Inventory

Este documento resume la implementacion tecnica realizada en Sprint 5 para incorporar inventario de producto finalizado mediante movimientos historicos y una proyeccion de stock actual.

## Objetivo del Sprint 5

El objetivo principal de Sprint 5 es habilitar una primera capa operativa de inventario para:

- consultar stock actual de producto finalizado;
- consultar historial de movimientos de inventario;
- registrar ingresos de stock;
- registrar ajustes manuales;
- registrar mermas;
- registrar reingresos manuales;
- mantener stock minimo por producto.

Sprint 5 deja preparado el dominio para que sprints posteriores puedan descontar stock automaticamente al confirmar ventas, sin romper la trazabilidad del historial.

## Politica de inventario del MVP

En el MVP, el inventario aplica solo a producto finalizado.

### Decisiones funcionales

- El inventario del MVP es solo de producto finalizado.
- No hay insumos ni recetas todavia.
- No se manejan todavia proveedores, compras ni multiples sucursales.
- No se implementaron todavia tickets ni ventas.
- Crear un producto no crea stock automaticamente.
- El stock inicial logico de un producto es `0`.
- El stock nace desde movimientos de inventario.
- El stock actual debe poder reconstruirse desde movimientos.
- `ProductStock` funciona como proyeccion rapida del stock actual.
- `InventoryMovement` funciona como historial auditable.
- No se permite stock negativo.
- `SALE_OUT` y `VOID_REVERSAL` quedan reservados para ventas futuras.
- La confirmacion de ventas y el descuento automatico de stock se implementaran despues.
- Los tickets se implementaran en Sprint 6.

### Politica operativa elegida

- Solo los productos con `stockManagementType = FINISHED_PRODUCT` participan de inventario en Sprint 5.
- `GET /api/inventory` lista solo productos `FINISHED_PRODUCT`.
- `GET /api/inventory/products/:productId` devuelve conflicto claro si el producto es `NON_STOCKED` o `RECIPE_BASED`.
- Si un producto no tiene fila en `ProductStock`, las consultas devuelven `currentStock = 0` y `minimumStock = 0`.
- La fila de `ProductStock` se crea automaticamente al primer movimiento o al actualizar `minimumStock`.
- Todos los valores decimales de respuesta se serializan como `string`.

## Modelos agregados

### `ProductStock`

Campos principales:

- `id`: UUID
- `productId`: UUID unico
- `currentStock`: decimal
- `minimumStock`: decimal
- `createdAt`: `DateTime`
- `updatedAt`: `DateTime`

Reglas:

- Pertenece a `Product`.
- Un `Product` puede tener a lo sumo una fila de `ProductStock`.
- No es el historial auditable; es la proyeccion rapida del stock actual.
- Puede no existir hasta la primera operacion de stock o hasta configurar `minimumStock`.

### `InventoryMovement`

Campos principales:

- `id`: UUID
- `productId`: UUID
- `movementType`: enum
- `quantity`: decimal
- `previousStock`: decimal
- `newStock`: decimal
- `reason`: string
- `referenceType`: enum
- `referenceId`: string nullable
- `createdById`: UUID nullable
- `createdAt`: `DateTime`

Reglas:

- Pertenece a `Product`.
- Registra el historial auditable de cambios de stock.
- No se editan movimientos historicos.
- No se eliminan movimientos historicos.
- `previousStock`, `newStock` y `createdById` los calcula el servidor.

## Enums agregados

### `InventoryMovementType`

- `STOCK_IN`
- `SALE_OUT`
- `MANUAL_ADJUSTMENT`
- `WASTE`
- `RETURN_IN`
- `VOID_REVERSAL`

Estado en Sprint 5:

- Implementados operativamente: `STOCK_IN`, `MANUAL_ADJUSTMENT`, `WASTE`, `RETURN_IN`
- Reservados para ventas futuras: `SALE_OUT`, `VOID_REVERSAL`

### `InventoryReferenceType`

- `MANUAL`
- `SALE_TICKET`
- `SALE_VOID`
- `SYSTEM`

Estado en Sprint 5:

- Se usa principalmente `MANUAL`
- `SALE_TICKET` y `SALE_VOID` quedan reservados para sprints de ventas

## Reglas de negocio implementadas

### Reglas generales

- Toda operacion que modifica stock corre dentro de transaccion Prisma.
- El producto debe existir.
- El producto debe estar activo para movimientos operativos.
- Solo `FINISHED_PRODUCT` acepta movimientos de inventario en Sprint 5.
- `NON_STOCKED` rechaza movimientos con error claro.
- `RECIPE_BASED` rechaza movimientos con error claro indicando que recetas no estan implementadas todavia.
- No se permite stock negativo.
- El cliente no envia `previousStock`, `newStock` ni `createdById`.
- El servidor calcula `previousStock` y `newStock`.
- `createdById` se toma del usuario autenticado.
- El motivo es obligatorio.

### Reglas por movimiento

#### `STOCK_IN`

- Recibe `quantity`.
- Suma stock.
- Si no existe `ProductStock`, se crea en `0` antes de aplicar el movimiento.
- Registra `referenceType = MANUAL`.

#### `WASTE`

- Recibe `quantity`.
- Resta stock.
- Rechaza la operacion si el resultado seria negativo.

#### `RETURN_IN`

- Recibe `quantity`.
- Suma stock.

#### `MANUAL_ADJUSTMENT`

- Recibe `newStock` objetivo.
- Cambia el stock al valor indicado.
- Calcula `quantity` como diferencia absoluta entre `previousStock` y `newStock`.
- El sentido del ajuste se interpreta comparando `previousStock` y `newStock`.
- Rechaza `newStock < 0`.
- Rechaza ajustes sin cambio efectivo con `409 Conflict`.

#### `minimumStock`

- Se actualiza sin crear `InventoryMovement`.
- Si no existe `ProductStock`, se crea automaticamente con `currentStock = 0`.

### Reglas de consulta

- `GET /api/inventory` permite filtros por `active`, `stockStatus` y `search`.
- `stockStatus` se calcula como:
  - `OUT_OF_STOCK` si `currentStock = 0`
  - `LOW_STOCK` si `currentStock > 0` y `currentStock <= minimumStock`
  - `AVAILABLE` si `currentStock > minimumStock`
- Si `minimumStock = 0` y `currentStock > 0`, el estado es `AVAILABLE`.
- `GET /api/inventory/movements` permite filtros por `productId`, `movementType`, `from` y `to`.

## Roles y permisos aplicados

Todos los endpoints de inventario requieren JWT.

### Inventario actual

- `ADMIN`, `MANAGER`, `CASHIER`, `AUDITOR`: consultar inventario.
- `ADMIN`, `MANAGER`, `CASHIER`, `AUDITOR`: consultar stock de un producto.

### Movimientos

- `ADMIN`, `MANAGER`, `AUDITOR`: consultar movimientos.
- `CASHIER`: no puede consultar el listado de movimientos en Sprint 5.

### Operaciones de stock

- `ADMIN`, `MANAGER`: `stock-in`, `adjust`, `waste`, `return-in`, `minimum-stock`.
- `CASHIER`: no puede modificar stock.
- `AUDITOR`: no puede modificar stock.

## Endpoints disponibles

Todos los endpoints usan el prefijo global `/api`.

### Consultas

- `GET /api/inventory`
- `GET /api/inventory/products/:productId`
- `GET /api/inventory/movements`
- `GET /api/inventory/products/:productId/movements`

### Operaciones

- `POST /api/inventory/products/:productId/stock-in`
- `POST /api/inventory/products/:productId/adjust`
- `POST /api/inventory/products/:productId/waste`
- `POST /api/inventory/products/:productId/return-in`
- `PATCH /api/inventory/products/:productId/minimum-stock`

## Query params disponibles

### `GET /api/inventory`

- `active=true|false`
- `stockStatus=AVAILABLE|LOW_STOCK|OUT_OF_STOCK`
- `search=<texto>`

### `GET /api/inventory/movements`

- `productId=<uuid>`
- `movementType=STOCK_IN|SALE_OUT|MANUAL_ADJUSTMENT|WASTE|RETURN_IN|VOID_REVERSAL`
- `from=<ISO date>`
- `to=<ISO date>`

### `GET /api/inventory/products/:productId/movements`

- `movementType=STOCK_IN|SALE_OUT|MANUAL_ADJUSTMENT|WASTE|RETURN_IN|VOID_REVERSAL`
- `from=<ISO date>`
- `to=<ISO date>`

## Ejemplos de payload

### Stock in

```json
{
  "quantity": 3,
  "reason": "Produccion inicial del dia"
}
```

### Waste

```json
{
  "quantity": 1,
  "reason": "Producto danado"
}
```

### Manual adjustment

```json
{
  "newStock": 5,
  "reason": "Conteo fisico de cierre"
}
```

### Return in

```json
{
  "quantity": 1,
  "reason": "Reingreso manual"
}
```

### Minimum stock

```json
{
  "minimumStock": 2
}
```

## Ejemplos de respuestas

### Stock actual de un producto

```json
{
  "productId": "3d7784e2-9df7-4f8f-b3ec-799e271a5f5d",
  "productName": "Hamburguesa clasica",
  "productSku": "BURGER-001",
  "unit": "UNIT",
  "stockManagementType": "FINISHED_PRODUCT",
  "currentStock": "5",
  "minimumStock": "2",
  "stockStatus": "AVAILABLE",
  "updatedAt": "2026-06-09T03:00:00.000Z"
}
```

### Movimiento de inventario

```json
{
  "id": "8cc7f7ef-a2b2-4d7f-99c4-7b0fba0eb8ef",
  "productId": "3d7784e2-9df7-4f8f-b3ec-799e271a5f5d",
  "productName": "Hamburguesa clasica",
  "movementType": "STOCK_IN",
  "quantity": "3",
  "previousStock": "2",
  "newStock": "5",
  "reason": "Produccion inicial del dia",
  "referenceType": "MANUAL",
  "referenceId": null,
  "createdById": "c690b6a5-5bec-4b85-98a6-3e5f8318dd29",
  "createdAt": "2026-06-09T03:00:00.000Z"
}
```

## Casos de error relevantes

- Payload invalido: `400 Bad Request`
- Token ausente o invalido: `401 Unauthorized`
- Rol insuficiente: `403 Forbidden`
- Producto inexistente: `404 Not Found`
- Producto `NON_STOCKED`: `409 Conflict`
- Producto `RECIPE_BASED`: `409 Conflict`
- Producto inactivo para movimiento operativo: `409 Conflict`
- Stock insuficiente para `WASTE`: `409 Conflict`
- Ajuste manual sin cambio efectivo: `409 Conflict`

## Criterios de aceptacion del Sprint 5

Sprint 5 se considera aceptado si se cumplen los siguientes puntos:

- Existen `ProductStock` e `InventoryMovement` en Prisma.
- Existen `InventoryMovementType` e `InventoryReferenceType` en Prisma.
- La migracion de inventario fue creada.
- Prisma Client fue generado.
- Existe `InventoryService` con logica transaccional para movimientos.
- Existe `InventoryController` con JWT, roles y Swagger.
- Consultar producto sin fila en `ProductStock` devuelve stock `0`.
- El primer movimiento crea `ProductStock` si no existe.
- `STOCK_IN` suma stock.
- `WASTE` resta stock y valida stock suficiente.
- `RETURN_IN` suma stock.
- `MANUAL_ADJUSTMENT` cambia stock al valor indicado.
- `minimumStock` se actualiza sin crear `InventoryMovement`.
- `previousStock` y `newStock` se calculan en servidor.
- `createdById` se toma del usuario autenticado.
- No existen endpoints manuales para `SALE_OUT` ni `VOID_REVERSAL`.
- Existen tests unitarios para DTOs, mappers, service y metadata de roles.
- `npm run build` y `npm test` pasan.

## Que NO se implemento todavia

Sprint 5 todavia no implementa:

- tickets;
- ventas;
- descuento automatico por venta;
- reversion por anulacion de venta;
- auditoria completa;
- insumos;
- recetas;
- proveedores;
- compras;
- multiples sucursales.

Plan previsto:

- Tickets de venta: Sprint 6.
- Confirmacion de ventas y descuento automatico de stock: despues de Sprint 6.
- Reversion automatica de ventas anuladas: despues de implementar tickets confirmados.
