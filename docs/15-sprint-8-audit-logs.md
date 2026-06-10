# Sprint 8 - Audit Logs

## Politica de auditoria del Sprint 8

La auditoria del Sprint 8 registra acciones criticas del sistema para complementar la trazabilidad operativa existente.

La auditoria no reemplaza historiales de negocio como `ProductCostHistory`, `ProductPriceHistory`, `InventoryMovement` o el historial de estados de tickets. Es una capa transversal para responder:

- quien hizo la accion;
- que accion hizo;
- sobre que entidad;
- cuando ocurrio;
- que datos habia antes;
- que datos quedaron despues;
- con que contexto adicional ocurrio.

Los logs de auditoria:

- no se editan;
- no se eliminan desde endpoints normales;
- deben evitar guardar datos sensibles;
- nunca guardan `passwordHash`;
- nunca guardan contrasenas planas;
- nunca guardan tokens JWT ni otros tokens de acceso.

Cuando una accion ocurre dentro de una transaccion critica, el log debe escribirse dentro de la misma transaccion si es tecnicamente razonable. Si la transaccion falla, no debe persistir un log de una accion que no ocurrio.

En particular, Sprint 8 debe dejar auditado:

- confirmacion de venta y generacion de `SALE_OUT`;
- anulacion de venta confirmada y generacion de `VOID_REVERSAL`;
- creacion y modificacion de tickets `DRAFT`;
- agregado, actualizacion y eliminacion de lineas de tickets `DRAFT`;
- altas, cambios de estado y actualizaciones de catalogo, usuarios, costos, precios e inventario administrativo.

### Politica de lectura

- `ADMIN` puede consultar todos los logs.
- `AUDITOR` puede consultar todos los logs.
- `MANAGER` no consulta auditoria general en Sprint 8.
- `CASHIER` no consulta auditoria general.

Politica de endpoints para Sprint 8:

- `GET /api/audit-logs`: `ADMIN`, `AUDITOR`
- `GET /api/audit-logs/:id`: `ADMIN`, `AUDITOR`

### Campos conceptuales del log

- `userId`
- `action`
- `entityType`
- `entityId`
- `beforeData`
- `afterData`
- `metadata`
- `requestId` opcional para futuro
- `ipAddress` opcional para futuro
- `userAgent` opcional para futuro
- `createdAt`

`requestId`, `ipAddress` y `userAgent` quedan previstos conceptualmente, pero pueden omitirse en Sprint 8 si el proyecto no tiene una infraestructura limpia para capturarlos sin agregar acoplamiento transversal innecesario.

## Alcance del Sprint 8

Sprint 8 implementa:

- persistencia de `AuditLog`;
- escritura de logs de auditoria en acciones criticas;
- consulta de logs con filtros basicos;
- sanitizacion para evitar datos sensibles.

Sprint 8 no implementa:

- reportes avanzados;
- pagos;
- caja;
- reembolsos;
- anulaciones parciales;
- insumos;
- recetas;
- proveedores;
- compras;
- multi-sucursal.

## Objetivo del Sprint 8

Sprint 8 incorpora auditoria transversal consultable para acciones criticas del sistema sin reemplazar los historiales funcionales ya existentes.

El objetivo es dejar trazabilidad consistente sobre:

- usuarios y catalogo;
- costos y precios historicos;
- inventario administrativo;
- tickets de venta y sus lineas;
- confirmaciones de venta y anulaciones con impacto en stock.

## Modelo agregado

Se agrega el modelo Prisma `AuditLog` con:

- `id`
- `userId` nullable con relacion opcional a `User`
- `action`
- `entityType`
- `entityId`
- `beforeData`
- `afterData`
- `metadata`
- `createdAt`

## Enums agregados

- `AuditAction`
- `AuditEntityType`

## Reglas de negocio implementadas

- La creacion de logs es interna desde servicios de negocio.
- No existen endpoints publicos para crear logs manualmente.
- No existen endpoints normales para editar logs.
- No existen endpoints normales para borrar logs.
- `AuditLog` complementa la trazabilidad de negocio, no la reemplaza.
- `AuditLog` no reemplaza `InventoryMovement`.
- `AuditLog` no reemplaza `ProductCostHistory`.
- `AuditLog` no reemplaza `ProductPriceHistory`.

## Politica de sanitizacion

La sanitizacion es recursiva sobre `beforeData`, `afterData` y `metadata`.

Se remueven claves sensibles case-insensitive como:

- `password`
- `passwordHash`
- `accessToken`
- `refreshToken`
- `token`

Por politica del Sprint 8:

- `AuditLog` no debe guardar `passwordHash`;
- `AuditLog` no debe guardar passwords;
- `AuditLog` no debe guardar tokens.

## Acciones auditadas por modulo

- `Users`: `USER_CREATED`, `USER_UPDATED`, `USER_DEACTIVATED`, `USER_REACTIVATED`
- `Categories`: `CATEGORY_CREATED`, `CATEGORY_UPDATED`, `CATEGORY_DEACTIVATED`, `CATEGORY_REACTIVATED`
- `SalesChannels`: `SALES_CHANNEL_CREATED`, `SALES_CHANNEL_UPDATED`, `SALES_CHANNEL_DEACTIVATED`, `SALES_CHANNEL_REACTIVATED`
- `Products`: `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DEACTIVATED`, `PRODUCT_REACTIVATED`
- `ProductCosts`: `PRODUCT_COST_CREATED`
- `ProductPrices`: `PRODUCT_PRICE_CREATED`
- `Inventory`: `INVENTORY_STOCK_IN`, `INVENTORY_MANUAL_ADJUSTMENT`, `INVENTORY_WASTE`, `INVENTORY_RETURN_IN`, `INVENTORY_MINIMUM_STOCK_UPDATED`, `INVENTORY_SALE_OUT`, `INVENTORY_VOID_REVERSAL`
- `Sales`: `SALE_TICKET_CREATED`, `SALE_TICKET_UPDATED`, `SALE_TICKET_CANCELLED`, `SALE_TICKET_ITEM_ADDED`, `SALE_TICKET_ITEM_UPDATED`, `SALE_TICKET_ITEM_REMOVED`, `SALE_TICKET_CONFIRMED`, `SALE_TICKET_VOIDED`

## Relacion entre auditoria e historiales de negocio

- `InventoryMovement` sigue siendo el historial operativo de stock.
- `ProductCostHistory` sigue siendo la fuente historica de costos.
- `ProductPriceHistory` sigue siendo la fuente historica de precios.
- `AuditLog` registra el contexto administrativo y los snapshots `before/after`.

## Reglas transaccionales

- Confirmacion de ticket + `SALE_OUT` + logs de auditoria quedan en la misma transaccion.
- Void de ticket + `VOID_REVERSAL` + logs de auditoria quedan en la misma transaccion.
- Altas de costo y precio historico registran auditoria en la misma transaccion donde se cierra la version vigente y se crea la nueva.
- Movimientos de inventario administrativos registran auditoria atomica con el movimiento.
- Si falla la auditoria en una operacion transaccional critica, la operacion completa se aborta.

## Roles y permisos aplicados

- Lectura de auditoria: `ADMIN`, `AUDITOR`
- Sin acceso a consulta general de auditoria: `MANAGER`, `CASHIER`
- Todos los endpoints de auditoria requieren JWT

## Endpoints disponibles

- `GET /api/audit-logs`
- `GET /api/audit-logs/:id`

## Query params disponibles

- `userId`
- `action`
- `entityType`
- `entityId`
- `from`
- `to`
- `limit`
- `offset`

## Ejemplos de response

Lista filtrada con `limit` y `offset`:

```json
[
  {
    "id": "audit-1",
    "userId": "user-1",
    "action": "SALE_TICKET_CONFIRMED",
    "entityType": "SALE_TICKET",
    "entityId": "ticket-1",
    "beforeData": {
      "id": "ticket-1",
      "status": "DRAFT"
    },
    "afterData": {
      "id": "ticket-1",
      "status": "CONFIRMED"
    },
    "metadata": {
      "inventoryMovements": [
        {
          "id": "movement-1",
          "productId": "product-1",
          "quantity": "2",
          "movementType": "SALE_OUT"
        }
      ]
    },
    "createdAt": "2026-06-10T02:00:00.000Z"
  }
]
```

Log individual:

```json
{
  "id": "audit-1",
  "userId": "user-1",
  "action": "USER_UPDATED",
  "entityType": "USER",
  "entityId": "user-2",
  "beforeData": {
    "id": "user-2",
    "active": true
  },
  "afterData": {
    "id": "user-2",
    "active": false
  },
  "metadata": null,
  "createdAt": "2026-06-10T02:05:00.000Z"
}
```

## Casos de error relevantes

- `400 BadRequest` por filtros o paginacion invalidos
- `401 Unauthorized` sin JWT valido
- `403 Forbidden` por rol insuficiente
- `404 NotFound` cuando el log no existe

## Criterios de aceptacion del Sprint 8

- Existe `AuditLog` en Prisma con enums e indices dedicados.
- Existe migracion versionada de Sprint 8.
- Existen endpoints de lectura con JWT y roles `ADMIN`/`AUDITOR`.
- Los servicios criticos generan logs con `beforeData`, `afterData` y `metadata` segun corresponda.
- La sanitizacion evita persistir datos sensibles.
- No se generan logs falsos cuando una operacion transaccional falla.

## Que NO se implemento todavia

- reportes operativos;
- reportes financieros;
- pagos;
- caja;
- reembolsos;
- anulaciones parciales;
- insumos;
- recetas;
- proveedores;
- compras;
- multi-sucursal.

La auditoria completa de reportes, pagos, caja o facturacion queda para futuro porque esos modulos no existen todavia.
