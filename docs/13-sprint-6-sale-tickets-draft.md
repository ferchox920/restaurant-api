# Sprint 6 - Sale Tickets In Draft

Este documento resume la implementacion tecnica y funcional realizada en Sprint 6 para tickets de venta en borrador y lineas con snapshots historicos.

## Objetivo del Sprint 6

El objetivo del Sprint 6 es habilitar una primera capa operativa de ventas sin confirmar:

- crear tickets en estado `DRAFT`;
- asociar tickets a un canal de venta;
- agregar, editar y eliminar lineas mientras el ticket siga en borrador;
- conservar snapshots historicos de producto, precio y costo en cada linea;
- recalcular subtotal y total del ticket;
- cancelar tickets `DRAFT` sin afectar inventario.

Sprint 6 no implementa confirmacion de venta ni descuento automatico de stock. Esa capacidad queda reservada para Sprint 7.

## Politica de tickets del Sprint 6

- Sprint 6 implementa tickets de venta en estado `DRAFT`.
- Los tickets se crean en `DRAFT`.
- Un ticket en `DRAFT` no descuenta stock.
- Un ticket en `DRAFT` puede modificarse.
- Un ticket en `DRAFT` puede cancelarse.
- Un ticket cancelado queda en estado `CANCELLED`.
- Un ticket `CANCELLED` no puede modificarse.
- Un ticket debe pertenecer a un canal de venta activo.
- Un ticket puede crearse inicialmente vacio.
- Una futura confirmacion no debera permitirse sin lineas, pero esa regla queda para Sprint 7.
- El cliente no envia precio ni costo.
- El cliente solo envia `productId` y `quantity`.
- El servidor calcula precio, costo, subtotal y total.
- Sprint 6 no valida stock para confirmar ventas porque no existe confirmacion todavia.
- Sprint 6 no genera `SALE_OUT`.
- Sprint 6 no genera `VOID_REVERSAL`.
- Sprint 6 no modifica `ProductStock`.

## Modelos agregados

### `SaleTicket`

Campos principales:

- `id`: UUID
- `ticketNumber`: entero secuencial unico
- `salesChannelId`: UUID
- `status`: `SaleTicketStatus`
- `subtotal`: decimal
- `discountTotal`: decimal
- `commissionTotal`: decimal
- `total`: decimal
- `notes`: string nullable
- `createdById`: UUID nullable
- `cancelledById`: UUID nullable
- `cancellationReason`: string nullable
- `createdAt`: `DateTime`
- `updatedAt`: `DateTime`
- `cancelledAt`: `DateTime` nullable

Relaciones:

- pertenece a `SalesChannel`;
- tiene muchas `SaleTicketItem`.

### `SaleTicketItem`

Campos principales:

- `id`: UUID
- `ticketId`: UUID
- `productId`: UUID
- `productNameSnapshot`: string
- `productSkuSnapshot`: string nullable
- `productUnitSnapshot`: `ProductUnit`
- `quantity`: decimal
- `unitPriceSnapshot`: decimal
- `unitCostSnapshot`: decimal
- `subtotal`: decimal
- `createdAt`: `DateTime`
- `updatedAt`: `DateTime`

Relaciones:

- pertenece a `SaleTicket`;
- pertenece a `Product`.

## Enum agregado

### `SaleTicketStatus`

- `DRAFT`
- `CONFIRMED`
- `CANCELLED`
- `VOIDED`

Estado operativo en Sprint 6:

- implementados logicamente: `DRAFT`, `CANCELLED`
- reservados para Sprint 7: `CONFIRMED`, `VOIDED`

## Reglas de negocio implementadas

### Reglas generales

- Todas las escrituras compuestas sobre ticket e items corren dentro de transaccion Prisma.
- Crear ticket requiere canal de venta existente y activo.
- Agregar lineas requiere ticket existente en `DRAFT`.
- Actualizar ticket en Sprint 6 solo modifica `notes`.
- Cancelar ticket `DRAFT` registra `cancelledById`, `cancellationReason`, `cancelledAt` y cambia `status = CANCELLED`.
- No existe eliminacion fisica de tickets.
- Se permite delete fisico de lineas mientras el ticket sigue en `DRAFT`.
- `discountTotal = 0` y `commissionTotal = 0` en Sprint 6.
- `total = subtotal - discountTotal - commissionTotal`, por lo tanto hoy `total = subtotal`.
- Aunque el canal tenga comision configurada, Sprint 6 no aplica comisiones reales.

### Reglas para agregar lineas

- El producto debe existir.
- El producto debe estar activo.
- Los productos `FINISHED_PRODUCT` se permiten.
- Los productos `NON_STOCKED` se permiten.
- Los productos `RECIPE_BASED` se rechazan con `409 Conflict` hasta implementar recetas.
- El servidor busca el precio vigente del producto para el canal del ticket.
- El servidor busca el costo vigente del producto.
- Si falta precio vigente, devuelve error claro.
- Si falta costo vigente, devuelve error claro.
- Si el mismo `productId` se agrega otra vez al mismo ticket `DRAFT`, el sistema consolida cantidad en la linea existente.
- La consolidacion reutiliza `unitPriceSnapshot` y `unitCostSnapshot` existentes.

### Reglas para actualizar cantidad

- Solo se permite en tickets `DRAFT`.
- `quantity` debe ser mayor que `0`.
- El subtotal se recalcula usando `unitPriceSnapshot` ya guardado.
- No se vuelve a tomar precio o costo vigente al actualizar cantidad.

## Politica de snapshots historicos

Cada `SaleTicketItem` guarda snapshots historicos al momento de agregar la linea:

- `productNameSnapshot` desde `Product.name`;
- `productSkuSnapshot` desde `Product.sku`;
- `productUnitSnapshot` desde `Product.unit`;
- `unitPriceSnapshot` desde el precio vigente del producto para el canal del ticket;
- `unitCostSnapshot` desde el costo vigente del producto;
- `subtotal = quantity * unitPriceSnapshot`.

Consecuencias:

- si cambia el nombre del producto luego, el ticket viejo no cambia;
- si cambia el precio luego, el ticket viejo no cambia;
- si cambia el costo luego, el ticket viejo no cambia;
- si cambia el canal luego, el ticket conserva los snapshots ya guardados;
- al actualizar cantidad, se conserva el snapshot historico original.

## Roles y permisos aplicados

Todos los endpoints de tickets requieren JWT.

### Lectura

- `ADMIN`, `MANAGER`, `CASHIER`, `AUDITOR`: listar tickets.
- `ADMIN`, `MANAGER`, `CASHIER`, `AUDITOR`: ver ticket por id.

### Escritura

- `ADMIN`, `MANAGER`, `CASHIER`: crear ticket.
- `ADMIN`, `MANAGER`, `CASHIER`: actualizar ticket `DRAFT`.
- `ADMIN`, `MANAGER`, `CASHIER`: agregar items.
- `ADMIN`, `MANAGER`, `CASHIER`: actualizar items.
- `ADMIN`, `MANAGER`, `CASHIER`: eliminar items.
- `ADMIN`, `MANAGER`, `CASHIER`: cancelar ticket `DRAFT`.

### Restriccion de auditor

- `AUDITOR` queda solo lectura en Sprint 6.

## Endpoints disponibles

Todos los endpoints usan el prefijo global `/api`.

### Tickets

- `POST /api/sales/tickets`
- `GET /api/sales/tickets`
- `GET /api/sales/tickets/:ticketId`
- `PATCH /api/sales/tickets/:ticketId`
- `POST /api/sales/tickets/:ticketId/cancel`

### Items

- `POST /api/sales/tickets/:ticketId/items`
- `PATCH /api/sales/tickets/:ticketId/items/:itemId`
- `DELETE /api/sales/tickets/:ticketId/items/:itemId`

## Query params disponibles

### `GET /api/sales/tickets`

- `status=DRAFT|CANCELLED|CONFIRMED|VOIDED`
- `salesChannelId=<uuid>`
- `from=<ISO date>`
- `to=<ISO date>`
- `createdById=<uuid>`
- `search=<texto o ticketNumber>`

## Ejemplos de payload

### Crear ticket

```json
{
  "salesChannelId": "0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4",
  "notes": "Pedido por mostrador"
}
```

### Agregar item

```json
{
  "productId": "3d7784e2-9df7-4f8f-b3ec-799e271a5f5d",
  "quantity": 2
}
```

### Actualizar item

```json
{
  "quantity": 3
}
```

### Cancelar ticket

```json
{
  "reason": "Cliente cancelo antes de confirmar"
}
```

## Ejemplos de respuestas

### Ticket en borrador

```json
{
  "id": "9f80d563-f8f4-45f1-b5fc-181f0f6b265f",
  "ticketNumber": 1001,
  "salesChannelId": "0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4",
  "salesChannelName": "PedidosYa",
  "status": "DRAFT",
  "subtotal": "11999.98",
  "discountTotal": "0",
  "commissionTotal": "0",
  "total": "11999.98",
  "notes": "Pedido por mostrador",
  "createdById": "c690b6a5-5bec-4b85-98a6-3e5f8318dd29",
  "cancelledById": null,
  "cancellationReason": null,
  "createdAt": "2026-06-09T03:00:00.000Z",
  "updatedAt": "2026-06-09T03:05:00.000Z",
  "cancelledAt": null,
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
      "subtotal": "11999.98",
      "createdAt": "2026-06-09T03:00:00.000Z",
      "updatedAt": "2026-06-09T03:05:00.000Z"
    }
  ]
}
```

### Ticket cancelado

```json
{
  "id": "9f80d563-f8f4-45f1-b5fc-181f0f6b265f",
  "ticketNumber": 1001,
  "status": "CANCELLED",
  "cancelledById": "c690b6a5-5bec-4b85-98a6-3e5f8318dd29",
  "cancellationReason": "Cliente cancelo antes de confirmar",
  "cancelledAt": "2026-06-09T03:10:00.000Z"
}
```

## Casos de error relevantes

- `400 Bad Request`: payload invalido, UUID invalido, filtros invalidos.
- `401 Unauthorized`: token ausente o invalido.
- `403 Forbidden`: rol insuficiente.
- `404 Not Found`: ticket, item, canal, producto, precio vigente o costo vigente no encontrado.
- `409 Conflict`: canal inactivo, producto inactivo, producto `RECIPE_BASED`, ticket no `DRAFT`.

## Criterios de aceptacion del Sprint 6

Sprint 6 se considera aceptado si:

- existen `SaleTicket` y `SaleTicketItem` en Prisma;
- existe `SaleTicketStatus` en Prisma;
- la migracion de Sprint 6 fue creada;
- Prisma Client fue generado;
- existe `SalesService` con reglas para tickets `DRAFT`;
- existe `SalesController` con JWT, roles y Swagger;
- crear ticket requiere canal activo;
- agregar item requiere producto activo, precio vigente y costo vigente;
- cada linea guarda snapshots historicos;
- actualizar cantidad conserva snapshots historicos;
- cancelar ticket `DRAFT` no toca inventario;
- no existen endpoints de confirmacion;
- no se generan movimientos `SALE_OUT` ni `VOID_REVERSAL`;
- `npm test` y `npm run build` pasan.

## Que NO se implemento todavia

Sprint 6 todavia no implementa:

- confirmacion de venta;
- descuento automatico de stock;
- movimiento `SALE_OUT` desde tickets;
- anulacion de ticket confirmado;
- movimiento `VOID_REVERSAL`;
- reembolsos;
- auditoria completa;
- insumos;
- recetas;
- proveedores;
- compras.

Plan previsto:

- Confirmacion de ventas y descuento automatico de stock: Sprint 7.
- Anulacion de ventas confirmadas y `VOID_REVERSAL`: despues de implementar confirmacion.
