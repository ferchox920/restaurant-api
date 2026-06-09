# Ticket States

Este documento define los estados posibles de un ticket de venta dentro del MVP, su significado operativo y las transiciones permitidas. El objetivo es asegurar un ciclo de vida claro para cada venta y establecer como impacta cada estado sobre inventario, trazabilidad y control administrativo.

## Objetivo del Documento

- Definir los estados validos del ticket en el MVP.
- Establecer el comportamiento operativo de cada estado.
- Delimitar que transiciones son permitidas y cuales deben bloquearse.
- Alinear el manejo de inventario con el ciclo de vida del ticket.

## Estados del MVP

- `DRAFT`
- `CONFIRMED`
- `CANCELLED`
- `VOIDED`

## Definicion de Estados

### DRAFT

**Que significa**

Representa un ticket en construccion o pendiente de confirmacion. El contenido del ticket puede todavia estar en revision o incompleto.

**Afecta inventario**

No. Un ticket en `DRAFT` no descuenta stock.

**Que acciones permite**

- Agregar items.
- Modificar items.
- Quitar items.
- Cambiar cantidades.
- Cambiar canal de venta si la operacion aun no fue cerrada.
- Confirmar el ticket.
- Cancelar el ticket antes de su confirmacion.

**Que acciones bloquea**

- No permite generar descuento real de stock.
- No debe generar reversion de inventario.
- No debe considerarse una venta cerrada.

**Que usuario o rol podria ejecutarlo**

- `CASHIER`
- `MANAGER`
- `ADMIN`

### CONFIRMED

**Que significa**

Representa una venta cerrada operativamente. El ticket fue validado y aceptado como venta efectiva.

**Afecta inventario**

Si. Un ticket en `CONFIRMED` descuenta stock.

**Que acciones permite**

- Consultar el ticket como venta cerrada.
- Generar auditoria y trazabilidad historica.
- Iniciar proceso de anulacion mediante cambio a `VOIDED`, si el rol y la politica operativa lo permiten.

**Que acciones bloquea**

- No puede volver a `DRAFT`.
- No debe permitir edicion libre de items, cantidades, precios o snapshots historicos.
- No puede pasar a `CANCELLED`.

**Que usuario o rol podria ejecutarlo**

- Confirmacion: `CASHIER`, `MANAGER` o `ADMIN`, segun permisos vigentes.
- Consulta: perfiles con permiso de lectura comercial o auditoria.

### CANCELLED

**Que significa**

Representa un ticket descartado antes de convertirse en venta efectiva. El ticket se cancela desde estado borrador y queda fuera de la operacion.

**Afecta inventario**

No. Un ticket en `CANCELLED` nunca debe haber afectado stock.

**Que acciones permite**

- Consultar el ticket como operacion cancelada.
- Mantener trazabilidad del intento de venta si el negocio desea conservarlo.

**Que acciones bloquea**

- No puede confirmarse despues.
- No puede generar descuento de stock.
- No puede generar reversion de stock.
- No debe volver a `DRAFT`.

**Que usuario o rol podria ejecutarlo**

- `CASHIER`
- `MANAGER`
- `ADMIN`

### VOIDED

**Que significa**

Representa una venta previamente confirmada que fue anulada posteriormente por una razon operativa o administrativa.

**Afecta inventario**

Si. Un ticket en `VOIDED` fue confirmado previamente y debe generar reversion de inventario.

**Que acciones permite**

- Consultar el ticket como venta anulada.
- Revisar motivo de anulacion, usuario responsable y movimientos de reversion asociados.
- Mantener historial completo de la operacion original y de su anulacion.

**Que acciones bloquea**

- No puede volver a `CONFIRMED`.
- No puede volver a `DRAFT`.
- No puede reutilizarse como venta activa.
- No deben eliminarse los movimientos originales ni los inversos asociados.

**Que usuario o rol podria ejecutarlo**

- `MANAGER`
- `ADMIN`

## Reglas Operativas por Estado

- Un ticket en `DRAFT` no descuenta stock.
- Un ticket en `CONFIRMED` descuenta stock.
- Un ticket en `CANCELLED` nunca debe haber afectado stock.
- Un ticket en `VOIDED` debe haber sido `CONFIRMED` previamente.
- La confirmacion debe validar stock suficiente.
- La anulacion de un ticket confirmado debe requerir motivo.
- Los snapshots de nombre, precio y costo deben consolidarse al confirmar el ticket.

Ejemplo breve:
Si un ticket en `DRAFT` contiene 3 unidades de un producto con stock disponible 2, la confirmacion debe ser rechazada hasta corregir cantidades o reponer stock.

## Transiciones Permitidas

Las transiciones validas del MVP son:

- `DRAFT -> CONFIRMED`
- `DRAFT -> CANCELLED`
- `CONFIRMED -> VOIDED`

## Reglas de Transicion

### DRAFT -> CONFIRMED

- Permitida.
- Requiere validacion de stock suficiente.
- Debe generar snapshots historicos de nombre, precio y costo por item.
- Debe registrar usuario responsable de la confirmacion.
- Debe generar los movimientos de inventario de salida correspondientes.

### DRAFT -> CANCELLED

- Permitida.
- No debe afectar inventario.
- Debe registrar usuario responsable de la cancelacion si la politica operativa lo requiere.

### CONFIRMED -> VOIDED

- Permitida.
- Requiere motivo de anulacion.
- Debe registrar usuario responsable de la anulacion.
- No debe borrar movimientos existentes.
- Debe generar movimientos inversos de inventario para revertir el descuento original.

## Transiciones No Permitidas

- `CONFIRMED -> DRAFT`
- `VOIDED -> CONFIRMED`
- `CANCELLED -> CONFIRMED`
- `CANCELLED -> DRAFT`
- `VOIDED -> DRAFT`
- `CONFIRMED -> CANCELLED`
- `VOIDED -> CANCELLED`
- `DRAFT -> VOIDED`

## Tabla de Transiciones

| Estado origen | Estado destino | Valida | Regla principal |
| --- | --- | --- | --- |
| `DRAFT` | `CONFIRMED` | Si | Requiere stock suficiente y genera descuento de inventario |
| `DRAFT` | `CANCELLED` | Si | No afecta inventario |
| `DRAFT` | `VOIDED` | No | Solo puede anularse una venta previamente confirmada |
| `CONFIRMED` | `DRAFT` | No | Una venta confirmada no puede reabrirse como borrador |
| `CONFIRMED` | `CANCELLED` | No | La anulacion posterior de una venta confirmada se representa como `VOIDED` |
| `CONFIRMED` | `VOIDED` | Si | Requiere motivo y genera reversion de inventario |
| `CANCELLED` | `DRAFT` | No | Un ticket cancelado no se reactiva |
| `CANCELLED` | `CONFIRMED` | No | Un ticket cancelado no puede convertirse luego en venta efectiva |
| `CANCELLED` | `VOIDED` | No | Nunca afecto stock, por lo tanto no corresponde reversion |
| `VOIDED` | `DRAFT` | No | La venta anulada conserva estado final |
| `VOIDED` | `CONFIRMED` | No | Un ticket anulado no puede volver a estar vigente |
| `VOIDED` | `CANCELLED` | No | `VOIDED` ya representa el estado terminal de una venta anulada |

## Eventos que Cambian el Estado

- Creacion inicial del ticket: crea un ticket en `DRAFT`.
- Confirmacion de venta: cambia de `DRAFT` a `CONFIRMED`.
- Cancelacion previa al cierre: cambia de `DRAFT` a `CANCELLED`.
- Anulacion posterior al cierre: cambia de `CONFIRMED` a `VOIDED`.

## Restricciones Importantes

- Un ticket `CONFIRMED` no puede volver a `DRAFT`.
- Un ticket `VOIDED` no puede volver a `CONFIRMED`.
- Un ticket `CANCELLED` no puede volver a `CONFIRMED`.
- La integridad historica del ticket debe conservarse en todos los estados terminales.
- Toda transicion critica debe quedar asociada a usuario responsable y timestamp.

## Auditoria de Cambios de Estado

- Toda confirmacion debe registrar usuario, fecha y resultado de la validacion.
- Toda cancelacion debe registrar usuario y fecha.
- Toda anulacion debe registrar usuario, fecha y motivo obligatorio.
- Los cambios de estado deben poder consultarse como parte de la trazabilidad del ticket.

## Pendientes de Definicion

- Definir si `CANCELLED` debe exigir motivo o si sera opcional en el MVP.
- Definir si existiran ventanas temporales o permisos especiales para anular tickets confirmados.
- Definir si la anulacion parcial de tickets sera un caso futuro o quedara fuera del modelo.
