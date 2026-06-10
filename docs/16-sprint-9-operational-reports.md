# Sprint 9 - Operational Reports

## Objetivo del Sprint 9

Sprint 9 implementa reportes basicos operativos para consulta API sobre stock, ventas y movimientos de inventario, reutilizando los datos historicos y operativos ya almacenados por los sprints anteriores.

El objetivo es habilitar analisis operativo sin introducir pagos, caja, contabilidad avanzada ni exportaciones.

## Politica de reportes del Sprint 9

- Sprint 9 implementa reportes operativos basicos, no contabilidad completa.
- Los reportes de ventas usan tickets y lineas ya guardadas.
- Los reportes de ventas usan snapshots historicos de `SaleTicketItem`:
  - `unitPriceSnapshot`
  - `unitCostSnapshot`
  - `productNameSnapshot`
  - `productSkuSnapshot`
  - `productUnitSnapshot`
- Los reportes no recalculan ventas antiguas con costos o precios vigentes.
- Los tickets en `DRAFT` no cuentan como venta real.
- Los tickets en `CANCELLED` no cuentan como venta real.
- Los tickets en `VOIDED` no cuentan como venta activa por defecto.
- Los tickets en `CONFIRMED` si cuentan como venta activa.
- La politica operativa de Sprint 9 para ventas usa solo tickets `CONFIRMED`.
- Las ventas `VOIDED` pueden consultarse en una iteracion futura, pero no se mezclan silenciosamente con ventas activas.
- Los reportes de stock usan `ProductStock` como proyeccion actual.
- Si un producto no tiene `ProductStock`, su stock se considera `0`.
- Los reportes de movimientos usan `InventoryMovement`.
- Los reportes no modifican datos.
- Los reportes no crean audit logs por lectura.
- Los valores decimales se devuelven como `string` para preservar precision.
- Sprint 9 no implementa exportaciones.
- Sprint 9 no implementa dashboard visual. Solo expone endpoints API.

## Reportes implementados

- Stock actual.
- Ventas por canal.
- Ventas por producto.
- Ventas por usuario.
- Movimientos de inventario.

## Reglas de negocio aplicadas

- `GET /api/reports/stock` usa `ProductStock` y devuelve `currentStock = 0` y `minimumStock = 0` cuando no existe fila.
- Productos `NON_STOCKED` y `RECIPE_BASED` se informan como `NOT_TRACKED`.
- Los reportes de ventas usan `SaleTicket.status = CONFIRMED` por defecto.
- Los reportes de ventas filtran por `SaleTicket.confirmedAt`.
- Las ventas por usuario agrupan por `confirmedById`.
- Los movimientos de inventario se ordenan por `createdAt desc`.
- El endpoint de movimientos aplica paginacion por `limit` y `offset`.

## Uso de snapshots historicos

Los reportes de ventas no usan el nombre actual del producto ni el costo o precio vigente para recalcular ventas pasadas.

Se usan los snapshots almacenados en cada linea:

- `productNameSnapshot`
- `productSkuSnapshot`
- `productUnitSnapshot`
- `unitPriceSnapshot`
- `unitCostSnapshot`

## Estados de ticket incluidos y excluidos

- Incluidos por defecto:
  - `CONFIRMED`
- Excluidos por defecto:
  - `DRAFT`
  - `CANCELLED`
  - `VOIDED`

## Calculos utilizados

- `grossSales = sum(subtotal)` por item confirmado.
- `historicalCost = sum(unitCostSnapshot * quantity)`.
- `grossProfit = grossSales - historicalCost`.
- `averageTicket = grossSales / ticketsCount`.

## Roles y permisos

- `ADMIN` puede consultar reportes.
- `MANAGER` puede consultar reportes.
- `AUDITOR` puede consultar reportes.
- `CASHIER` no accede a reportes generales en Sprint 9.
- Todos los endpoints requieren JWT.

## Endpoints disponibles

- `GET /api/reports/stock`
- `GET /api/reports/sales-by-channel`
- `GET /api/reports/sales-by-product`
- `GET /api/reports/sales-by-user`
- `GET /api/reports/inventory-movements`

## Query params por endpoint

### `GET /api/reports/stock`

- `active`
- `categoryId`
- `stockStatus`
- `stockManagementType`
- `search`

### `GET /api/reports/sales-by-channel`

- `from`
- `to`
- `salesChannelId`

### `GET /api/reports/sales-by-product`

- `from`
- `to`
- `salesChannelId`
- `productId`

### `GET /api/reports/sales-by-user`

- `from`
- `to`
- `salesChannelId`
- `userId`

### `GET /api/reports/inventory-movements`

- `from`
- `to`
- `productId`
- `movementType`
- `referenceType`
- `createdById`
- `limit`
- `offset`

## Ejemplos de response

### Stock actual

```json
[
  {
    "productId": "product-1",
    "productName": "Hamburguesa clasica",
    "productSku": "BURGER-001",
    "categoryId": "category-1",
    "categoryName": "Hamburguesas",
    "unit": "UNIT",
    "stockManagementType": "FINISHED_PRODUCT",
    "active": true,
    "currentStock": "8",
    "minimumStock": "3",
    "stockStatus": "AVAILABLE",
    "updatedAt": "2026-06-10T10:00:00.000Z"
  }
]
```

### Ventas por canal

```json
[
  {
    "salesChannelId": "channel-1",
    "salesChannelName": "PedidosYa",
    "salesChannelCode": "PEDIDOSYA",
    "ticketsCount": 3,
    "itemsCount": 8,
    "quantitySold": "12",
    "grossSales": "27000",
    "historicalCost": "13000",
    "grossProfit": "14000",
    "averageTicket": "9000"
  }
]
```

### Movimientos de inventario

```json
{
  "items": [
    {
      "movementId": "movement-1",
      "productId": "product-1",
      "productName": "Hamburguesa clasica",
      "productSku": "BURGER-001",
      "movementType": "SALE_OUT",
      "quantity": "2",
      "previousStock": "10",
      "newStock": "8",
      "reason": "Venta confirmada",
      "referenceType": "SALE_TICKET",
      "referenceId": "ticket-1",
      "createdById": "user-1",
      "createdByEmail": "cashier@example.com",
      "createdByName": "Grace Hopper",
      "createdAt": "2026-06-10T10:00:00.000Z"
    }
  ],
  "limit": 50,
  "offset": 0,
  "total": 1
}
```

## Casos de error relevantes

- `400 BadRequest` para query params invalidos.
- `401 Unauthorized` cuando falta JWT o es invalido.
- `403 Forbidden` cuando el rol autenticado no tiene acceso al endpoint.

## Criterios de aceptacion del Sprint 9

- Existe `ReportsModule`.
- Existen `ReportsService` y `ReportsController`.
- Existen los cinco endpoints de reportes bajo `/api/reports/*`.
- Los reportes de ventas usan snapshots historicos.
- Los reportes de ventas usan tickets `CONFIRMED` por defecto.
- `DRAFT`, `CANCELLED` y `VOIDED` no se cuentan como ventas activas por defecto.
- El reporte de stock usa `ProductStock` y fallback a `0`.
- El reporte de movimientos usa `InventoryMovement`.
- Los decimales se devuelven como string.
- Los reportes no escriben datos ni crean audit logs por lectura.

## Que no se implemento todavia

- exportacion Excel/PDF;
- dashboard visual;
- pagos;
- caja;
- facturacion fiscal;
- reportes financieros avanzados;
- cierres diarios de caja;
- ganancias netas reales con impuestos;
- reembolsos;
- anulaciones parciales;
- insumos;
- recetas;
- proveedores;
- compras;
- multi-sucursal.

## Pendiente sugerido para Sprint 10

- Resumen agregado opcional para `inventory-movements`.
- Exportaciones de reportes.
- Reportes financieros avanzados y caja.
