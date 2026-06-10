# Sprint 7 - Sale Confirmation, Void And Inventory Sync

Este documento resume la implementacion funcional y tecnica del Sprint 7 para confirmacion de tickets de venta, descuento automatico de stock y anulacion de ventas confirmadas.

## Objetivo del Sprint 7

El objetivo del Sprint 7 es transformar los tickets `DRAFT` del Sprint 6 en ventas operativas reales:

- confirmar tickets `DRAFT`;
- validar stock suficiente antes de confirmar;
- descontar stock de productos inventariables;
- generar movimientos `SALE_OUT`;
- permitir anular ventas `CONFIRMED`;
- revertir stock mediante `VOID_REVERSAL`;
- registrar usuario y fecha tanto en confirmacion como en void.

Sprint 7 no implementa pagos, caja, reembolsos ni anulaciones parciales.

## Politica de confirmacion del Sprint 7

- Solo los tickets en `DRAFT` pueden confirmarse.
- Un ticket `DRAFT` debe tener al menos una linea para confirmarse.
- Confirmar un ticket cambia su estado a `CONFIRMED`.
- Confirmar un ticket descuenta stock solo de productos `FINISHED_PRODUCT`.
- Los productos `NON_STOCKED` no descuentan inventario.
- Los productos `RECIPE_BASED` siguen rechazados en Sprint 7 porque recetas aun no existen.
- Antes de confirmar, el sistema valida stock suficiente para todos los productos inventariables del ticket.
- Si cualquier producto no tiene stock suficiente, no se confirma nada y no se descuenta nada.
- Si por algun motivo hubiera multiples lineas del mismo producto, la validacion y el descuento se hacen con cantidad agregada por `productId`.
- La confirmacion no modifica snapshots historicos de nombre, SKU, unidad, precio ni costo.
- La confirmacion no recalcula precio ni costo con valores vigentes nuevos.
- Cada descuento de stock genera un movimiento `SALE_OUT`.
- Los movimientos `SALE_OUT` usan:
  - `referenceType = SALE_TICKET`
  - `referenceId = ticket.id`
- El ticket confirmado registra:
  - `confirmedById`
  - `confirmedAt`

## Politica de anulacion de ventas confirmadas

- Solo los tickets en `CONFIRMED` pueden anularse mediante void.
- Un ticket `DRAFT` debe cancelarse con la operacion de cancelacion del Sprint 6, no con void.
- Un ticket `CANCELLED` no puede anularse como venta confirmada.
- Un ticket `VOIDED` no puede volver a anularse.
- Anular una venta confirmada cambia su estado a `VOIDED`.
- Anular una venta confirmada no borra ni modifica los movimientos `SALE_OUT` originales.
- La anulacion genera movimientos inversos `VOID_REVERSAL`.
- Los movimientos `VOID_REVERSAL` usan:
  - `referenceType = SALE_VOID`
  - `referenceId = ticket.id`
- El void repone stock solo para productos `FINISHED_PRODUCT`.
- Los productos `NON_STOCKED` no generan movimientos de reversa.
- Si por algun motivo hubiera multiples lineas del mismo producto, la reversa se hace con cantidad agregada por `productId`.
- La anulacion registra:
  - `voidedById`
  - `voidedAt`
  - `voidReason`

## Estados operativos del ticket

- `DRAFT`: editable, no descuenta stock.
- `CANCELLED`: borrador cancelado, no afecta stock.
- `CONFIRMED`: venta real, stock descontado.
- `VOIDED`: venta confirmada anulada, stock revertido.

Importante:

- Cancelar `DRAFT` y anular `CONFIRMED` son operaciones distintas.
- `CANCELLED` sigue representando solo un borrador cancelado.
- `VOIDED` representa una venta confirmada anulada.

## Modelos y campos agregados

En `SaleTicket` se agregaron los campos:

- `confirmedById`
- `confirmedAt`
- `voidedById`
- `voidedAt`
- `voidReason`

Se mantienen sin cambios los campos de cancelacion de borradores:

- `cancelledById`
- `cancelledAt`
- `cancellationReason`

## Integracion con inventario

Sprint 7 integra ventas con inventario mediante una API interna de `InventoryService`, reutilizada dentro de la misma transaccion Prisma de `SalesService`.

Metodos internos relevantes:

- `applySaleOut(params, tx)`
- `applyVoidReversal(params, tx)`
- `getOrCreateProductStockForUpdate(productId, tx)`

Consecuencias:

- `SalesService` no calcula `previousStock` ni `newStock`;
- `InventoryService` calcula stock previo, stock nuevo, actualiza `ProductStock` y crea `InventoryMovement`;
- confirmacion y movimientos ocurren dentro de una sola transaccion;
- void y movimientos ocurren dentro de una sola transaccion.

## Movimientos usados

### `SALE_OUT`

Se usa solo al confirmar tickets.

- reduce stock de `FINISHED_PRODUCT`;
- crea historial en `InventoryMovement`;
- usa `referenceType = SALE_TICKET`;
- usa `referenceId = ticket.id`.

### `VOID_REVERSAL`

Se usa solo al anular ventas confirmadas.

- aumenta stock de `FINISHED_PRODUCT`;
- crea historial en `InventoryMovement`;
- usa `referenceType = SALE_VOID`;
- usa `referenceId = ticket.id`.

Ni `SALE_OUT` ni `VOID_REVERSAL` se crean manualmente desde endpoints de inventario.

## Reglas de negocio implementadas

- Confirmar solo funciona desde `DRAFT`.
- Confirmar requiere al menos un item.
- Confirmar valida canal activo.
- Confirmar valida productos del ticket.
- Confirmar rechaza productos inactivos.
- Confirmar rechaza `RECIPE_BASED`.
- Confirmar descuenta stock de `FINISHED_PRODUCT`.
- Confirmar no descuenta stock de `NON_STOCKED`.
- Void solo funciona desde `CONFIRMED`.
- Void requiere motivo.
- Void genera reversa solo para `FINISHED_PRODUCT`.
- Void no genera movimiento para `NON_STOCKED`.
- Void no borra movimientos `SALE_OUT`.
- Void no implementa reembolsos.
- Sprint 7 no implementa anulaciones parciales.

## Reglas transaccionales

- La confirmacion se ejecuta en una unica transaccion Prisma.
- Si falla stock de un producto, no se descuenta ningun producto.
- Si falla cualquier `SALE_OUT`, el ticket queda en `DRAFT`.
- Si falla el update del ticket, no quedan descuentos parciales.
- El void se ejecuta en una unica transaccion Prisma.
- Si falla cualquier `VOID_REVERSAL`, el ticket sigue en `CONFIRMED`.
- Si falla el update del ticket, no quedan reversiones parciales.

Riesgo pendiente:

- Sprint 7 no agrega locking explicito adicional a nivel SQL; la mitigacion actual es mantener ticket y movimientos dentro de una sola transaccion.

## Roles y permisos aplicados

Todos los endpoints de tickets requieren JWT.

### Lectura

- `ADMIN`, `MANAGER`, `CASHIER`, `AUDITOR`: listar tickets.
- `ADMIN`, `MANAGER`, `CASHIER`, `AUDITOR`: ver ticket por id.

### Escritura

- `ADMIN`, `MANAGER`, `CASHIER`: crear ticket.
- `ADMIN`, `MANAGER`, `CASHIER`: editar ticket `DRAFT`.
- `ADMIN`, `MANAGER`, `CASHIER`: agregar, editar y eliminar items.
- `ADMIN`, `MANAGER`, `CASHIER`: cancelar ticket `DRAFT`.
- `ADMIN`, `MANAGER`, `CASHIER`: confirmar ticket `DRAFT`.
- `ADMIN`, `MANAGER`: anular venta confirmada.

### Restricciones

- `AUDITOR`: solo lectura.
- `CASHIER`: puede confirmar ventas, pero no puede anular ventas confirmadas.

## Endpoints disponibles

Todos usan el prefijo global `/api`.

- `POST /api/sales/tickets`
- `GET /api/sales/tickets`
- `GET /api/sales/tickets/:ticketId`
- `PATCH /api/sales/tickets/:ticketId`
- `POST /api/sales/tickets/:ticketId/cancel`
- `POST /api/sales/tickets/:ticketId/confirm`
- `POST /api/sales/tickets/:ticketId/void`
- `POST /api/sales/tickets/:ticketId/items`
- `PATCH /api/sales/tickets/:ticketId/items/:itemId`
- `DELETE /api/sales/tickets/:ticketId/items/:itemId`

## Ejemplos de payload

### Confirmar ticket

No requiere body funcional en Sprint 7:

```json
{}
```

### Anular venta confirmada

```json
{
  "reason": "Error de carga"
}
```

## Ejemplos de respuestas

### Ticket confirmado

```json
{
  "id": "9f80d563-f8f4-45f1-b5fc-181f0f6b265f",
  "ticketNumber": 1001,
  "salesChannelId": "0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4",
  "salesChannelName": "PedidosYa",
  "status": "CONFIRMED",
  "subtotal": "11999.98",
  "discountTotal": "0",
  "commissionTotal": "0",
  "total": "11999.98",
  "notes": "Pedido por mostrador",
  "createdById": "c690b6a5-5bec-4b85-98a6-3e5f8318dd29",
  "confirmedById": "c690b6a5-5bec-4b85-98a6-3e5f8318dd29",
  "confirmedAt": "2026-06-10T03:06:00.000Z",
  "cancelledById": null,
  "cancelledAt": null,
  "cancellationReason": null,
  "voidedById": null,
  "voidedAt": null,
  "voidReason": null,
  "items": [
    {
      "id": "ec4e20d3-43eb-46d2-a286-6a6ef3f2c2fe",
      "ticketId": "9f80d563-f8f4-45f1-b5fc-181f0f6b265f",
      "productId": "3d7784e2-9df7-4f8f-b3ec-799e271a5f5d",
      "productNameSnapshot": "Hamburguesa clasica",
      "productSkuSnapshot": "BURGER-001",
      "productUnitSnapshot": "UNIT",
      "quantity": "2",
      "unitPriceSnapshot": "5999.99",
      "unitCostSnapshot": "2500",
      "subtotal": "11999.98"
    }
  ]
}
```

### Ticket anulado

```json
{
  "id": "9f80d563-f8f4-45f1-b5fc-181f0f6b265f",
  "ticketNumber": 1001,
  "status": "VOIDED",
  "confirmedById": "c690b6a5-5bec-4b85-98a6-3e5f8318dd29",
  "confirmedAt": "2026-06-10T03:06:00.000Z",
  "voidedById": "7cf4e76e-6f3d-4d27-a20d-84f2d9b32d18",
  "voidedAt": "2026-06-10T03:20:00.000Z",
  "voidReason": "Error de carga"
}
```

## Casos de error relevantes

- `400 Bad Request`: payload invalido o UUID invalido.
- `401 Unauthorized`: token ausente o invalido.
- `403 Forbidden`: rol insuficiente.
- `404 Not Found`: ticket o canal no encontrado.
- `409 Conflict`:
  - ticket fuera del estado esperado;
  - ticket sin lineas;
  - canal inactivo;
  - producto inactivo;
  - producto `RECIPE_BASED`;
  - stock insuficiente.

## Criterios de aceptacion del Sprint 7

Sprint 7 se considera aceptado si:

- `SaleTicket` contiene campos de confirmacion y void;
- existe migracion para los campos agregados;
- Prisma Client fue generado;
- `SalesService` confirma tickets `DRAFT`;
- `SalesService` anula tickets `CONFIRMED`;
- confirmar descuenta stock de `FINISHED_PRODUCT`;
- confirmar no descuenta stock de `NON_STOCKED`;
- confirmar genera `SALE_OUT`;
- `SALE_OUT` usa `SALE_TICKET` y `ticket.id`;
- void genera `VOID_REVERSAL`;
- `VOID_REVERSAL` usa `SALE_VOID` y `ticket.id`;
- confirm y void ocurren en una unica transaccion;
- `CANCELLED` sigue reservado para borradores;
- `VOIDED` representa ventas confirmadas anuladas;
- `npm test` y `npm run build` pasan.

## Que no se implemento todavia

Sprint 7 todavia no implementa:

- reembolsos;
- anulaciones parciales;
- descuentos operativos;
- pagos;
- caja diaria;
- facturacion fiscal;
- auditoria completa;
- insumos;
- recetas;
- proveedores;
- compras;
- reportes avanzados.
