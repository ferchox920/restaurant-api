# Sprint Tables 2 - Table Order Opening Flow

Este documento describe el flujo actual de ordenes de mesa: apertura,
consulta, consumos progresivos, cancelacion y cierre.

## Objetivo

- Crear `TableOrder`.
- Abrir una orden en una mesa activa.
- Asociar cada orden abierta a un `SaleTicket` en estado `DRAFT`.
- Consultar ordenes de mesa.
- Cargar, modificar y quitar consumos usando el `SaleTicket DRAFT` asociado.
- Cancelar una orden abierta sin afectar inventario.
- Cerrar una orden confirmando el ticket y descontando stock mediante ventas.

## Modelo

`TableOrder` contiene:

- `restaurantTableId`
- `saleTicketId`
- `status`: `OPEN`, `CANCELLED`, `CLOSED`
- `openedById`
- `cancelledById`
- `closedById`
- `notes`
- `cancelReason`
- `openedAt`
- `cancelledAt`
- `closedAt`
- `createdAt` y `updatedAt`

La base impone una sola orden `OPEN` por mesa mediante un indice parcial PostgreSQL.

## Relacion Con SaleTicket

La orden de mesa envuelve un `SaleTicket DRAFT`.

Al abrir una orden:

- se valida que la mesa exista y este activa;
- se valida que no tenga otra orden `OPEN`;
- se crea un `SaleTicket DRAFT`;
- se crea un `TableOrder OPEN` asociado al ticket.

Al cancelar una orden:

- se exige que la orden este en `OPEN`;
- se cancela el `SaleTicket DRAFT` asociado;
- se marca la orden como `CANCELLED`;
- no se generan movimientos de inventario.

Al cargar consumos:

- se exige que la orden este en `OPEN`;
- se delega en las lineas del `SaleTicket DRAFT` asociado;
- no se descuenta stock.

Al cerrar una orden:

- se exige que la orden este en `OPEN`;
- se confirma el `SaleTicket DRAFT` asociado en la misma transaccion;
- la logica de ventas valida items, pago, canal, producto y stock;
- si la confirmacion falla, la orden queda `OPEN`;
- si confirma correctamente, la orden queda `CLOSED` y la mesa queda disponible.

## Endpoints

Todos usan prefijo global `/api` y requieren JWT.

- `GET /api/table-orders`
- `POST /api/tables/:tableId/orders/open`
- `GET /api/tables/:tableId/orders/current`
- `GET /api/table-orders/:id`
- `POST /api/table-orders/:id/items`
- `PATCH /api/table-orders/:id/items/:itemId`
- `DELETE /api/table-orders/:id/items/:itemId`
- `POST /api/table-orders/:id/cancel`
- `POST /api/table-orders/:id/close`

Filtros de listado:

- `status`
- `tableId`
- `openedById`
- `from`
- `to`

## Permisos

Lectura:

- `ADMIN`
- `MANAGER`
- `CASHIER`
- `AUDITOR`

Apertura, consumos, cancelacion y cierre:

- `ADMIN`
- `MANAGER`
- `CASHIER`

## Reglas

- Una mesa activa puede tener maximo una orden `OPEN`.
- Una mesa inactiva no puede abrir orden.
- Si la mesa no existe, la apertura devuelve `404`.
- Si la mesa esta inactiva o ya ocupada, la apertura devuelve `409`.
- Una orden `CANCELLED` o `CLOSED` no puede cancelarse.
- Una orden `CANCELLED` o `CLOSED` no puede recibir cambios de consumos.
- Cerrar una orden sin items devuelve `409`.
- Cerrar con stock insuficiente devuelve `409` y no cierra la orden.
- Cancelar no mueve inventario.
- Cerrar descuenta stock solo a traves de la confirmacion del `SaleTicket`.
- El estado `OCCUPIED` de una mesa se deriva de la existencia de una orden `OPEN`.

## Auditoria

Se registran audit logs para:

- `TABLE_ORDER_OPENED`
- `TABLE_ORDER_CANCELLED`
- `TABLE_ORDER_CLOSED`

## Fuera De Alcance

No se implementa todavia:

- caja;
- division de cuenta;
- cambio de mesa.

## Validacion Esperada

```bash
npm run prisma:generate
npm run build
npm run test
```

Lint acotado recomendado:

```bash
npx eslint "src/table-orders/**/*.ts"
npx eslint "src/tables/**/*.ts"
```
