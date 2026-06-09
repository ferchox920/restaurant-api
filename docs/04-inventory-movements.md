# Inventory Movements

Este documento define los tipos de movimiento de inventario del MVP para la API administrativa del restaurante. En esta etapa el inventario se limita exclusivamente a producto finalizado y no contempla insumos, recetas ni transformaciones productivas complejas.

## Objetivo del Documento

- Definir los tipos iniciales de movimiento de inventario.
- Establecer cuando se generan y como impactan stock.
- Asegurar trazabilidad operativa de cada cambio de inventario.
- Proveer una base clara para validaciones y modelado posterior.

## Alcance del Inventario en el MVP

- El inventario del MVP aplica solo a producto finalizado.
- No se registran movimientos de insumos.
- No se modelan consumos por receta.
- No se administran compras a proveedores ni produccion detallada por formula.

## Reglas Generales del Modelo de Inventario

- El stock actual debe poder reconstruirse a partir de movimientos.
- Todo movimiento debe tener producto asociado.
- Todo movimiento debe tener usuario responsable.
- Todo movimiento debe registrar cantidad.
- Todo movimiento debe registrar stock anterior y stock nuevo.
- No se debe permitir stock negativo en el MVP.
- El stock no se modifica por edicion manual de saldo, sino por generacion de movimientos.
- Cada movimiento debe indicar su tipo, su referencia de origen y el momento en que fue ejecutado.

## Datos Minimos por Movimiento

Cada movimiento de inventario deberia poder registrar, como minimo:

- `id`
- `productId`
- `movementType`
- `quantity`
- `direction` o signo efectivo sobre stock
- `previousStock`
- `newStock`
- `referenceType`
- `referenceId`
- `reason` o nota operativa
- `performedAt`
- `performedByUserId`

## Tipos de Movimiento del MVP

### STOCK_IN

**Que significa**

Representa un ingreso de stock de producto finalizado.

**Cuando se genera**

- En una carga inicial de stock.
- Cuando se incorpora produccion terminada al inventario.
- Cuando se regulariza positivamente stock por una decision operativa validada.

**Impacto sobre stock**

Suma stock.

**Que referencia puede tener**

- `INITIAL_LOAD`
- `PRODUCTION_BATCH`
- `ADMIN_LOAD`
- Otra referencia administrativa definida mas adelante

**Que usuario lo genera**

- `MANAGER`
- `ADMIN`
- Usuario con permiso explicito de carga de stock.

**Ejemplo de uso**

Se termina una tanda de 20 milanesas listas para venta y se registra un `STOCK_IN` de `+20`.

### SALE_OUT

**Que significa**

Representa la salida de stock causada por la confirmacion de una venta.

**Cuando se genera**

- Al confirmar un ticket de venta.

**Impacto sobre stock**

Resta stock.

**Que referencia puede tener**

- `SALE_TICKET`
- `SALE_TICKET_ITEM`

**Que usuario lo genera**

- Se genera por la accion del usuario que confirma el ticket.
- Tipicamente `CASHIER`, `MANAGER` o `ADMIN`.

**Ejemplo de uso**

Se confirma un ticket con 2 hamburguesas clasicas y se registra un `SALE_OUT` de `-2` para ese producto.

### MANUAL_ADJUSTMENT

**Que significa**

Representa un ajuste administrativo de stock que no proviene directamente de una venta, una anulacion o una merma.

**Cuando se genera**

- Al corregir diferencias detectadas en control interno.
- Al normalizar un desvio de inventario por error operativo o de carga previa.

**Impacto sobre stock**

Puede sumar o restar stock, segun el ajuste.

**Que referencia puede tener**

- `ADMIN_ADJUSTMENT`
- `STOCK_COUNT`
- `CORRECTION`

**Que usuario lo genera**

- `MANAGER`
- `ADMIN`
- Usuario con permiso especial de ajuste manual.

**Ejemplo de uso**

Durante un conteo se detecta que el sistema muestra 10 unidades pero fisicamente hay 9. Se registra un `MANUAL_ADJUSTMENT` de `-1`.

### WASTE

**Que significa**

Representa una merma de producto finalizado que ya no puede venderse.

**Cuando se genera**

- Cuando un producto se descarta por deterioro, vencimiento, error de preparacion o dano.

**Impacto sobre stock**

Resta stock.

**Que referencia puede tener**

- `WASTE_REPORT`
- `SPOILAGE`
- `DAMAGE`
- `EXPIRED_PRODUCT`

**Que usuario lo genera**

- `MANAGER`
- `ADMIN`
- Usuario autorizado para registrar mermas.

**Ejemplo de uso**

Se descartan 3 porciones preparadas por rotura de cadena de frio y se registra un `WASTE` de `-3`.

### RETURN_IN

**Que significa**

Representa el reingreso de stock por una devolucion valida que no corresponde a una anulacion total de ticket confirmado.

**Cuando se genera**

- Cuando existe una politica de devolucion operativa aceptada por el negocio.
- Cuando un producto vuelve al inventario en condiciones aptas para venta.

**Impacto sobre stock**

Suma stock.

**Que referencia puede tener**

- `CUSTOMER_RETURN`
- `COUNTER_RETURN`
- `RETURN_NOTE`

**Que usuario lo genera**

- `MANAGER`
- `ADMIN`
- `CASHIER` solo si el negocio habilita devoluciones operativas.

**Ejemplo de uso**

Un cliente devuelve una bebida cerrada en condiciones aptas para reingreso y se registra un `RETURN_IN` de `+1`.

### VOID_REVERSAL

**Que significa**

Representa la reversion de stock de una venta previamente confirmada que fue anulada.

**Cuando se genera**

- Al pasar un ticket de `CONFIRMED` a `VOIDED`.

**Impacto sobre stock**

Suma stock.

**Que referencia puede tener**

- `VOIDED_TICKET`
- `SALE_OUT_MOVEMENT`
- `SALE_TICKET`

**Que usuario lo genera**

- Se genera por la accion del usuario que anula el ticket.
- Tipicamente `MANAGER` o `ADMIN`.

**Ejemplo de uso**

Se anula una venta que habia descontado 2 hamburguesas y se registra un `VOID_REVERSAL` de `+2`.

## Reglas Operativas por Tipo

- Una venta confirmada genera `SALE_OUT`.
- Una venta anulada genera `VOID_REVERSAL`.
- Una merma genera `WASTE`.
- Una carga inicial o produccion terminada genera `STOCK_IN`.
- Un ajuste administrativo genera `MANUAL_ADJUSTMENT`.
- Un movimiento `RETURN_IN` solo debe utilizarse cuando exista una devolucion valida y diferenciada de la anulacion total de una venta.

## Reglas de Validacion

- Ningun movimiento puede registrarse sin producto asociado.
- Ningun movimiento puede registrarse sin usuario responsable.
- Ningun movimiento puede registrarse sin cantidad.
- Ningun movimiento puede omitirse si produce un cambio de stock.
- Antes de persistir un movimiento que resta stock, debe validarse que el `previousStock` sea suficiente.
- El `newStock` debe resultar de aplicar el movimiento sobre `previousStock`.
- Si el resultado produce stock negativo, la operacion debe rechazarse.
- No deben eliminarse movimientos historicos para corregir inventario; la correccion debe hacerse con nuevos movimientos.

## Reconstruccion de Stock

El stock disponible de un producto debe calcularse como resultado del historial ordenado de movimientos validos. Esto implica:

- Partir de stock `0` si no existen movimientos previos.
- Aplicar cada movimiento en orden cronologico o segun el orden operacional definido.
- Validar en cada paso el `previousStock` y el `newStock`.
- Obtener el stock actual como el ultimo `newStock` registrado para el producto.

## Ejemplos Concretos

### Ejemplo 1

Producto: Hamburguesa clasica  
Stock inicial: `0`  
Movimiento: `STOCK_IN +5`  
Stock final: `5`

Interpretacion:
Se cargan 5 unidades iniciales de producto terminado. El movimiento registra `previousStock = 0` y `newStock = 5`.

### Ejemplo 2

Producto: Hamburguesa clasica  
Stock previo: `5`  
Venta confirmada de 2 hamburguesas  
Movimiento: `SALE_OUT -2`  
Stock final: `3`

Interpretacion:
La confirmacion del ticket genera salida real de inventario. El movimiento registra `previousStock = 5` y `newStock = 3`.

### Ejemplo 3

Producto: Hamburguesa clasica  
Stock previo: `3`  
Anulacion de la venta  
Movimiento: `VOID_REVERSAL +2`  
Stock final: `5`

Interpretacion:
La anulacion no elimina la salida original. Genera un nuevo movimiento inverso con `previousStock = 3` y `newStock = 5`.

## Responsables y Autorizaciones

- Los movimientos automaticos derivados de tickets deben quedar asociados al usuario que dispara la accion de negocio.
- Los movimientos administrativos deben requerir permisos explicitos.
- Las mermas y ajustes deben poder auditarse con motivo, fecha y usuario responsable.

## Auditoria y Trazabilidad

- Todo movimiento debe poder rastrearse a su origen.
- Debe ser posible identificar si un movimiento provino de una venta, una anulacion, una carga administrativa, una merma o un ajuste.
- Los movimientos no reemplazan la auditoria transversal, pero constituyen parte esencial del historial funcional del inventario.

## Casos Pendientes

- Definir catalogos formales de `referenceType` y `reason`.
- Definir reglas operativas mas detalladas para `RETURN_IN`, incluyendo validacion de condicion del producto reingresado.
- Definir politica de concurrencia para evitar inconsistencias cuando dos operaciones intenten consumir el mismo stock al mismo tiempo.
