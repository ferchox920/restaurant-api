# Domain Entities

Este documento define las entidades principales del dominio para la API administrativa del restaurante. Su objetivo es describir el modelo conceptual del sistema con suficiente claridad para luego transformarlo en schema de base de datos y contratos de API, sin entrar todavia en detalles de implementacion.

## Objetivo del Documento

- Identificar las entidades principales del negocio.
- Delimitar su responsabilidad funcional.
- Proponer campos conceptuales iniciales.
- Explicitar relaciones y reglas relevantes del dominio.
- Preparar una base coherente para el modelado posterior de persistencia.

## Criterios Generales de Modelado

- El inventario se administra solo sobre producto terminado.
- El stock no se edita directamente: surge del acumulado de movimientos de inventario.
- Los costos se registran de forma versionada e historica.
- Los precios se registran de forma versionada por canal de venta.
- Los tickets deben conservar snapshots historicos aunque luego cambien los datos maestros.
- Las entidades con historial operativo no deben eliminarse fisicamente en condiciones normales: deben poder desactivarse.
- Toda accion critica debe quedar asociada a un usuario responsable.

## Entidades Principales

### 1. User

**Proposito dentro del negocio**

Representa a una persona o cuenta interna que opera la API administrativa y ejecuta acciones sobre entidades sensibles del sistema.

**Campos conceptuales sugeridos**

- `id`
- `name`
- `email` o identificador unico de acceso
- `passwordHash` o referencia al mecanismo de autenticacion
- `status` (`active`, `inactive`, `blocked`, segun definicion futura)
- `roleId` o relacion con roles
- `createdAt`
- `updatedAt`
- `deactivatedAt`

**Relaciones con otras entidades**

- Pertenece a un `Role`.
- Puede crear o modificar `Product`, `Category`, `SalesChannel`, `ProductCostHistory`, `ProductPriceHistory`, `InventoryMovement`, `SaleTicket` y `AuditLog`.
- Puede quedar asociado como responsable de acciones criticas en tickets, movimientos y auditoria.

**Reglas particulares**

- Un usuario con historial no debe eliminarse fisicamente; debe desactivarse.
- Toda accion critica debe poder asociarse a un usuario responsable.
- Si el esquema evoluciona a multiples roles por usuario, esa capacidad debera modelarse explicitamente mas adelante.

### 2. Role

**Proposito dentro del negocio**

Define el perfil operativo de acceso y responsabilidad de un usuario dentro del sistema.

**Campos conceptuales sugeridos**

- `id`
- `name`
- `code`
- `description`
- `status`
- `createdAt`
- `updatedAt`

**Relaciones con otras entidades**

- Un `Role` puede estar asociado a muchos `User`.
- En el futuro podria relacionarse con una matriz de permisos o capacidades.

**Reglas particulares**

- El rol organiza autorizacion operativa, no identidad.
- No deberia eliminarse fisicamente si ya fue asignado a usuarios con historial.

### 3. Product

**Proposito dentro del negocio**

Representa un producto terminado vendible por el restaurante y sujeto a stock, costo y precio por canal.

**Campos conceptuales sugeridos**

- `id`
- `name`
- `internalCode` o SKU interno
- `description`
- `categoryId`
- `status` (`active`, `inactive`)
- `unitType` si aplica
- `createdAt`
- `updatedAt`
- `deactivatedAt`
- `createdByUserId`
- `updatedByUserId`

**Relaciones con otras entidades**

- Pertenece a una `Category`.
- Tiene muchos `ProductCostHistory`.
- Tiene muchos `ProductPriceHistory`.
- Tiene muchos `InventoryMovement`.
- Tiene muchos `SaleTicketItem`.

**Reglas particulares**

- Un producto puede existir sin stock.
- El stock no se guarda como valor editable de negocio; se deriva desde `InventoryMovement`.
- Un producto utilizado en ventas no debe eliminarse fisicamente; debe desactivarse.
- Los cambios posteriores del producto no deben alterar snapshots historicos ya guardados en tickets.

### 4. Category

**Proposito dentro del negocio**

Agrupa productos terminados segun criterio comercial u operativo para facilitar organizacion, consulta y mantenimiento.

**Campos conceptuales sugeridos**

- `id`
- `name`
- `description`
- `status`
- `createdAt`
- `updatedAt`
- `createdByUserId`
- `updatedByUserId`

**Relaciones con otras entidades**

- Una `Category` puede tener muchos `Product`.
- Puede quedar referenciada en `AuditLog` ante cambios administrativos.

**Reglas particulares**

- No deberia eliminarse fisicamente si tiene productos asociados o historial.
- Su desactivacion no debe romper el historial de productos existentes.

### 5. SalesChannel

**Proposito dentro del negocio**

Representa un canal comercial por el cual se venden productos, por ejemplo Mostrador, PedidosYa o Uber Eats.

**Campos conceptuales sugeridos**

- `id`
- `name`
- `code`
- `description`
- `status`
- `createdAt`
- `updatedAt`
- `createdByUserId`
- `updatedByUserId`

**Relaciones con otras entidades**

- Un `SalesChannel` tiene muchos `ProductPriceHistory`.
- Un `SalesChannel` puede estar asociado a muchos `SaleTicket`.

**Reglas particulares**

- El canal existe como entidad maestra independiente del precio.
- No deberia eliminarse fisicamente si fue utilizado en tickets o historiales de precio.

### 6. ProductCostHistory

**Proposito dentro del negocio**

Registra la evolucion historica del costo de un producto terminado a lo largo del tiempo.

**Campos conceptuales sugeridos**

- `id`
- `productId`
- `costAmount`
- `currency` si aplica
- `validFrom`
- `validTo` o criterio equivalente de cierre de vigencia
- `changeReason`
- `createdAt`
- `createdByUserId`

**Relaciones con otras entidades**

- Pertenece a un `Product`.
- Se relaciona indirectamente con `SaleTicketItem` a traves del snapshot de costo utilizado al confirmar una venta.
- Puede quedar registrado en `AuditLog`.

**Reglas particulares**

- Los costos se versionan; no se sobreescribe historico.
- Debe existir una politica clara para evitar solapamientos de vigencia por producto.
- El costo aplicable a una venta debe resolverse segun la vigencia al momento de confirmacion del ticket.

### 7. ProductPriceHistory

**Proposito dentro del negocio**

Registra la evolucion historica del precio de venta de un producto para un canal especifico.

**Campos conceptuales sugeridos**

- `id`
- `productId`
- `salesChannelId`
- `priceAmount`
- `currency` si aplica
- `validFrom`
- `validTo`
- `changeReason`
- `createdAt`
- `createdByUserId`

**Relaciones con otras entidades**

- Pertenece a un `Product`.
- Pertenece a un `SalesChannel`.
- Se relaciona indirectamente con `SaleTicketItem` a traves del snapshot de precio utilizado al confirmar la venta.
- Puede quedar registrado en `AuditLog`.

**Reglas particulares**

- Los precios por canal se versionan; no se reemplaza el historico.
- Debe evitarse solapamiento de vigencias para la misma combinacion producto-canal.
- El precio aplicado a un item de ticket debe surgir del canal y de la vigencia correspondiente al momento operativo.

### 8. InventoryMovement

**Proposito dentro del negocio**

Representa cada evento que incrementa o reduce el stock de un producto terminado.

**Campos conceptuales sugeridos**

- `id`
- `productId`
- `movementType`
- `quantity`
- `unitCostSnapshot` si aplica
- `referenceType`
- `referenceId`
- `notes`
- `performedAt`
- `performedByUserId`
- `revertedFromMovementId` si aplica
- `createdAt`

**Relaciones con otras entidades**

- Pertenece a un `Product`.
- Puede estar originado por un `SaleTicket`, una anulacion, un ajuste o una carga administrativa.
- Debe asociarse a un `User` responsable.
- Puede generar entradas correlacionadas en `AuditLog`.

**Reglas particulares**

- El stock no se edita directamente; se deriva del acumulado de movimientos.
- Cada movimiento debe tener signo, tipo u orientacion claramente interpretable.
- Las anulaciones de venta deben generar movimientos de reversion trazables.
- La referencia al origen del movimiento debe permitir reconstruir por que existio.

### 9. SaleTicket

**Proposito dentro del negocio**

Representa una venta o intento de venta registrada por el sistema, con su contexto comercial y su ciclo de vida operativo.

**Campos conceptuales sugeridos**

- `id`
- `ticketNumber` o identificador operativo
- `salesChannelId`
- `status`
- `subtotalAmount`
- `totalAmount`
- `currency` si aplica
- `createdAt`
- `confirmedAt`
- `cancelledAt`
- `voidedAt`
- `createdByUserId`
- `confirmedByUserId`
- `cancelledByUserId`
- `voidedByUserId`
- `cancellationReason` para `CANCELLED` si aplica
- `voidReason` obligatorio para `VOIDED`

**Relaciones con otras entidades**

- Pertenece a un `SalesChannel`.
- Tiene muchos `SaleTicketItem`.
- Puede originar muchos `InventoryMovement`.
- Debe asociar usuarios responsables segun el tipo de accion.
- Puede vincularse con `AuditLog`.

**Reglas particulares**

- Un ticket puede existir antes de estar confirmado.
- Solo al confirmar debe impactar stock.
- Un ticket cancelado desde `DRAFT` no debe impactar stock.
- Al anular una venta se debe generar reversion de stock.
- El ticket debe conservar evidencia historica suficiente para auditoria aun si cambian entidades maestras despues.

### 10. SaleTicketItem

**Proposito dentro del negocio**

Representa cada linea de producto incluida dentro de un ticket de venta.

**Campos conceptuales sugeridos**

- `id`
- `saleTicketId`
- `productId`
- `quantity`
- `unitPriceSnapshot`
- `unitCostSnapshot`
- `productNameSnapshot`
- `categoryNameSnapshot` si aplica
- `salesChannelNameSnapshot` si aplica
- `lineSubtotal`
- `createdAt`

**Relaciones con otras entidades**

- Pertenece a un `SaleTicket`.
- Hace referencia al `Product` original.
- Se relaciona indirectamente con `ProductCostHistory` y `ProductPriceHistory` a traves de snapshots.

**Reglas particulares**

- Los tickets deben guardar snapshots historicos de nombre, precio y costo.
- El item no debe depender solo de relaciones vivas para reconstruir una venta pasada.
- Si cambian el nombre del producto o sus condiciones comerciales, el item historico debe seguir siendo interpretable.

### 11. AuditLog

**Proposito dentro del negocio**

Registra eventos de auditoria sobre acciones criticas para proveer trazabilidad, control interno y soporte de investigacion operativa.

**Campos conceptuales sugeridos**

- `id`
- `eventType`
- `entityType`
- `entityId`
- `action`
- `previousValue` o snapshot previo resumido
- `newValue` o snapshot posterior resumido
- `metadata`
- `performedAt`
- `performedByUserId`

**Relaciones con otras entidades**

- Debe asociarse a un `User` responsable.
- Puede referenciar cualquier entidad critica del dominio, como `Product`, `SalesChannel`, `ProductCostHistory`, `ProductPriceHistory`, `InventoryMovement` o `SaleTicket`.

**Reglas particulares**

- Toda accion critica debe quedar asociada a un usuario responsable.
- El nivel de detalle del log debe ser suficiente para explicar que cambio, sobre que entidad y cuando ocurrio.
- El `AuditLog` es transversal al dominio y no reemplaza el historial funcional propio de otras entidades.

## Relaciones Entre Entidades

- Un `Role` puede tener muchos `User`.
- Un `User` puede ejecutar acciones sobre casi todas las entidades operativas y administrativas.
- Una `Category` puede tener muchos `Product`.
- Un `Product` puede tener muchos `ProductCostHistory`.
- Un `Product` puede tener muchos `ProductPriceHistory`.
- Un `SalesChannel` puede tener muchos `ProductPriceHistory`.
- Un `Product` puede tener muchos `InventoryMovement`.
- Un `SalesChannel` puede tener muchos `SaleTicket`.
- Un `SaleTicket` puede tener muchos `SaleTicketItem`.
- Un `SaleTicket` confirmado puede originar uno o varios `InventoryMovement`.
- Un `SaleTicket` anulado puede originar movimientos de reversion.
- Un `AuditLog` puede referenciar cualquier entidad critica.

## Reglas Transversales del Dominio

- El producto y el usuario deben soportar desactivacion logica en lugar de borrado fisico cuando exista historial.
- El stock es una vista derivada del historial de movimientos, no un dato editable manualmente como fuente primaria.
- La informacion historica de venta debe sobrevivir a cambios posteriores sobre datos maestros.
- Las vigencias de costo y precio deben ser coherentes y no ambiguas para resolver el valor aplicable en una venta.
- Las acciones criticas deben asociarse a identidad de usuario y quedar auditadas.

## Identificadores y Trazabilidad

- Todas las entidades principales deben tener identificadores unicos y estables.
- Las entidades operativas deben registrar timestamps de creacion y actualizacion.
- Las acciones sensibles deben conservar referencia al usuario responsable.
- Los tickets y movimientos deben poder rastrear su origen funcional.
- Las entidades historicas deben permitir reconstruir el estado comercial valido para un momento determinado.

## Pendientes de Modelado

- Definir si `Role` tendra permisos embebidos o una entidad adicional de permisos.
- Definir politica exacta de vigencias para costo y precio.
- Definir nivel de granularidad y retencion de `AuditLog`.
