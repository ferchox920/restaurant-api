# Main Business Flow

Este documento describe el flujo principal del sistema de inicio a fin dentro del MVP de la API administrativa del restaurante. El objetivo es mostrar como se conectan la configuracion administrativa, la operacion de venta, el impacto en inventario y la preservacion del historial operativo.

## Objetivo del Documento

- Explicar el flujo principal del negocio en orden operativo.
- Mostrar como interactuan productos, costos, precios, stock y tickets.
- Dejar claro cuando se generan movimientos de inventario.
- Confirmar que el sistema conserva historial y evita alterar datos antiguos.

## Actores Involucrados

- `ADMIN`: configura categorias, canales, productos, costos, precios y puede operar stock.
- `MANAGER`: puede participar en configuracion operativa y stock segun permisos del negocio.
- `CASHIER`: crea y confirma tickets de venta.
- Sistema: valida reglas, resuelve vigencias, genera movimientos y conserva snapshots historicos.

## Flujo Principal del Sistema

### 1. Creacion de categorias

Un usuario administrador crea las categorias necesarias para organizar los productos terminados del restaurante.

Resultado esperado:

- Las categorias quedan disponibles para asociar productos.
- Esta accion no impacta inventario.

### 2. Creacion de canales de venta

Un usuario administrador crea los canales de venta por los cuales se comercializaran productos, por ejemplo Mostrador, PedidosYa o Uber Eats.

Resultado esperado:

- Los canales quedan disponibles para definir precios diferenciados.
- Esta accion no impacta inventario.

### 3. Creacion de productos

Un usuario administrador crea productos terminados y los asocia a una categoria.

Resultado esperado:

- El producto queda disponible en catalogo.
- El producto puede existir aunque todavia no tenga stock.

### 4. Producto con stock inicial cero

Al momento de crearse, un producto puede iniciar con stock `0`.

Resultado esperado:

- El sistema no crea stock automaticamente al crear el producto.
- El producto existe aunque no tenga movimientos de inventario o aunque su saldo inicial sea cero.

### 5. Definicion del costo inicial

Un usuario autorizado define el costo inicial vigente del producto.

Resultado esperado:

- El costo queda registrado como historico versionado.
- El sistema conserva vigencia y trazabilidad del costo cargado.

### 6. Definicion de precios por canal

Un usuario autorizado define el precio vigente del producto para cada canal de venta aplicable.

Resultado esperado:

- El producto puede tener precios diferentes segun canal.
- El precio queda registrado como historico versionado por canal.

### 7. Carga de stock mediante STOCK_IN

Un usuario autorizado carga stock de producto finalizado mediante un movimiento `STOCK_IN`.

Resultado esperado:

- El inventario aumenta.
- El movimiento registra producto, cantidad, stock anterior, stock nuevo, referencia y usuario responsable.

### 8. Creacion del ticket en DRAFT

Un cajero crea un ticket en estado `DRAFT`.

Resultado esperado:

- El ticket queda abierto para carga de items.
- El ticket en `DRAFT` no descuenta stock.

### 9. Agregado de productos al ticket

El cajero agrega productos al ticket y define cantidades.

Resultado esperado:

- El ticket queda preparado para su futura confirmacion.
- Todavia no se genera movimiento de inventario.

### 10. Resolucion del precio vigente por canal

El sistema toma el precio vigente del producto segun el canal del ticket.

Resultado esperado:

- El valor comercial aplicado corresponde al canal elegido.
- Si existen historicos de precio, se usa el vigente al momento de la confirmacion operativa.

### 11. Resolucion del costo vigente del producto

El sistema toma el costo vigente del producto para fines de snapshot historico y trazabilidad de la venta.

Resultado esperado:

- El ticket podra conservar el costo correspondiente a ese momento.
- Si luego cambia el costo, la venta historica no se altera.

### 12. Guardado de snapshots historicos

El ticket guarda snapshots de nombre, precio y costo para cada item.

Resultado esperado:

- La venta puede reconstruirse en el futuro aunque cambien los datos maestros.
- Cambiar luego nombre, precio o costo del producto no modifica tickets antiguos.

### 13. Confirmacion del ticket

El cajero confirma el ticket cuando la venta queda cerrada.

Resultado esperado:

- El sistema inicia validaciones operativas.
- La confirmacion constituye el punto en que la venta pasa a ser efectiva.

### 14. Validacion de stock suficiente

Antes de confirmar, el sistema valida que exista stock suficiente para todos los items del ticket.

Resultado esperado:

- Si no hay stock suficiente, la confirmacion se rechaza.
- Si hay stock suficiente, la operacion puede continuar.

### 15. Generacion de movimientos SALE_OUT

Una vez validada la disponibilidad, el sistema genera movimientos `SALE_OUT` por cada producto vendido.

Resultado esperado:

- Cada salida queda registrada con referencia al ticket y usuario responsable de la confirmacion.
- No se modifica stock por fuera del mecanismo de movimientos.

### 16. Descuento de stock

Los movimientos `SALE_OUT` reducen el stock disponible de los productos involucrados.

Resultado esperado:

- El saldo final de stock refleja la venta confirmada.
- El stock actual puede reconstruirse desde los movimientos registrados.

### 17. Cambio de estado a CONFIRMED

Luego de confirmar y descontar stock, el ticket pasa a estado `CONFIRMED`.

Resultado esperado:

- La venta queda cerrada operativamente.
- El ticket ya no debe editarse libremente como borrador.

### 18. Registro de usuario responsable

El sistema registra el usuario responsable de la confirmacion y de cualquier accion critica asociada.

Resultado esperado:

- La trazabilidad de la venta queda preservada.
- Puede auditarse quien confirmo, cuando y sobre que ticket.

### 19. Anulacion de una venta confirmada

Si una venta confirmada debe anularse, un usuario autorizado ejecuta la anulacion con motivo y el sistema genera movimientos `VOID_REVERSAL`.

Resultado esperado:

- No se borran los movimientos `SALE_OUT` originales.
- La anulacion genera movimientos inversos para devolver stock.
- El ticket pasa a `VOIDED`.

### 20. Consulta de ventas, stock y movimientos

El sistema permite consultar ventas, stock y movimientos de inventario en cualquier momento.

Resultado esperado:

- Es posible revisar estado actual y trazabilidad historica.
- La consulta no depende de reescribir datos antiguos.

## Ejemplo Concreto

### Contexto inicial

- Producto: `Hamburguesa clasica`
- Canal: `Mostrador`
- Stock inicial: `0`
- Costo vigente: `3000`
- Precio vigente para Mostrador: `7000`

### Paso 1. Alta del producto

Se crea el producto `Hamburguesa clasica`.

Resultado:

- El producto existe en catalogo.
- El stock sigue en `0`.

### Paso 2. Carga de stock

Se registra un movimiento `STOCK_IN +3`.

Resultado:

- `previousStock = 0`
- `newStock = 3`

### Paso 3. Creacion del ticket

Un cajero crea un ticket en `DRAFT` para canal `Mostrador` y agrega `2` hamburguesas.

Resultado:

- El ticket aun no impacta inventario.
- El stock sigue en `3`.

### Paso 4. Resolucion de snapshots

Al preparar la confirmacion, el sistema toma:

- Nombre del producto: `Hamburguesa clasica`
- Costo vigente: `3000`
- Precio vigente en Mostrador: `7000`

Resultado:

- El ticket queda listo para conservar esos snapshots historicos.

### Paso 5. Confirmacion de la venta

El cajero confirma el ticket.

El sistema valida que hay stock suficiente:

- Stock disponible antes de vender: `3`
- Cantidad vendida: `2`

Como la validacion es correcta, el sistema genera `SALE_OUT -2`.

Resultado:

- `previousStock = 3`
- `newStock = 1`
- El ticket pasa a `CONFIRMED`
- El usuario responsable queda registrado

### Paso 6. Anulacion posterior

Si luego se anula la venta confirmada, el sistema genera `VOID_REVERSAL +2`.

Resultado:

- `previousStock = 1`
- `newStock = 3`
- El ticket pasa a `VOIDED`
- Los movimientos anteriores no se borran

## Garantias de Historial e Integridad

- El flujo conserva historial completo de costo, precio y nombre mediante snapshots en el ticket.
- El flujo conserva historial completo de inventario mediante movimientos.
- Los datos antiguos no se alteran cuando cambian costos, precios o nombres en el catalogo.
- Las anulaciones no destruyen evidencia historica: agregan reversiones trazables.
- Toda accion critica queda asociada a un usuario responsable.

## Flujos Alternativos Relevantes

- Si el producto existe pero no tiene stock, no puede confirmarse una venta que lo consuma.
- Si el ticket queda en `DRAFT`, no se generan movimientos `SALE_OUT`.
- Si una venta ya fue confirmada, no vuelve a `DRAFT`; solo puede anularse como `VOIDED` segun permisos.

## Puntos de Control Operativo

- Validar existencia de categoria, canal y producto antes de operar ventas.
- Validar vigencia de costo y precio al momento de confirmacion.
- Validar stock suficiente antes de generar `SALE_OUT`.
- Validar motivo y usuario responsable al generar `VOID_REVERSAL`.

## Conclusion del Flujo

El flujo principal del MVP conecta configuracion administrativa, control de inventario y operacion comercial en una secuencia consistente. La venta solo impacta stock al confirmarse, la anulacion revierte mediante movimientos inversos y todo el proceso preserva historial sin reescribir datos antiguos.
