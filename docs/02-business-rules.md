# Business Rules

Este documento define las reglas de negocio principales del MVP de la API administrativa del restaurante. Su objetivo es fijar criterios operativos claros antes de modelar persistencia, endpoints y validaciones de aplicacion.

## Objetivo del Documento

- Establecer reglas funcionales obligatorias del MVP.
- Delimitar como deben comportarse las entidades clave del sistema.
- Reducir ambiguedades antes de pasar a implementacion tecnica.
- Servir como referencia para validaciones, casos de uso y pruebas.

## 1. Productos

- Un producto representa un producto terminado vendible por el restaurante.
- Un producto puede existir sin stock.
- Crear un producto no debe crear stock automaticamente.
- Un producto puede crearse aunque todavia no tenga costo vigente ni precio vigente, siempre que el negocio acepte su configuracion incompleta.
- Los productos usados en ventas no se eliminan fisicamente; se desactivan.
- Desactivar un producto evita su uso futuro en nuevas operaciones, pero no debe afectar tickets historicos ni movimientos existentes.
- Cambiar el nombre de un producto no debe modificar tickets antiguos.

Ejemplo breve:
Si el producto "Hamburguesa Clasica" se renombra a "Hamburguesa Clasica Doble", los tickets ya confirmados deben conservar el nombre historico originalmente registrado.

## 2. Categorias

- Una categoria agrupa productos para fines administrativos y comerciales.
- Una categoria puede existir aunque inicialmente no tenga productos asociados.
- Una categoria con productos asociados o historial operativo no deberia eliminarse fisicamente.
- Si una categoria deja de usarse, debe desactivarse o dejar de estar disponible para nuevas asignaciones segun la politica final del sistema.
- Cambios sobre la categoria no deben alterar la interpretacion historica de tickets ya emitidos.

## 3. Canales de Venta

- Un canal de venta representa el origen comercial de la operacion, por ejemplo Mostrador, PedidosYa o Uber Eats.
- Los canales pueden existir antes de tener precios configurados para todos los productos.
- Los canales usados en ventas no se eliminan fisicamente; se desactivan.
- Desactivar un canal impide nuevas ventas por ese canal, pero no modifica ventas historicas.
- El canal de venta es obligatorio para resolver precios historicos por canal y para interpretar correctamente una venta.

Ejemplo breve:
Si el canal "Uber Eats" deja de operar, se desactiva. Los tickets historicos asociados a ese canal deben seguir consultables.

## 4. Costos Historicos

- Los costos no se editan destructivamente; se versionan.
- Solo debe existir un costo vigente por producto en un momento dado.
- Registrar un nuevo costo debe cerrar la vigencia del costo anterior o volverlo no vigente mediante la estrategia temporal definida.
- Un costo historico debe conservar fecha de inicio de vigencia y criterio de fin de vigencia.
- El costo aplicable a una venta debe ser el vigente al momento de confirmar el ticket.
- Cambiar el costo actual de un producto no debe modificar tickets antiguos.

Ejemplo breve:
Si una pizza tenia costo 2500 hasta el 2026-06-10 y desde el 2026-06-11 pasa a 2900, una venta confirmada el 2026-06-09 debe conservar 2500 como snapshot de costo.

## 5. Precios Historicos por Canal

- Los precios por canal no se editan destructivamente; se versionan.
- Solo debe existir un precio vigente por producto y canal en un momento dado.
- Registrar un nuevo precio para un producto en un canal debe cerrar la vigencia del precio anterior o marcarlo como no vigente.
- El precio aplicable a una venta debe surgir del producto, del canal y de la vigencia correspondiente al momento de confirmar el ticket.
- Un mismo producto puede tener precios distintos segun canal.
- Cambiar el precio actual no debe modificar tickets antiguos.

Ejemplo breve:
Una empanada puede costar 1200 en Mostrador y 1500 en PedidosYa. Si luego el precio en PedidosYa cambia a 1650, los tickets previos deben conservar 1500.

## 6. Inventario

- El inventario en esta etapa aplica solo a producto finalizado.
- El stock nace desde movimientos de inventario.
- No se permite modificar stock sin generar movimiento.
- El stock no se considera una entrada editable directa de negocio.
- Un producto puede tener stock cero o incluso no registrar movimientos todavia.
- Los movimientos de inventario deben identificar producto, tipo de movimiento, cantidad, origen, fecha y usuario responsable.
- Todo ingreso, ajuste, descuento por venta o reversion debe quedar reflejado como movimiento.
- La disponibilidad de stock para una venta debe calcularse en base al historial de movimientos validos.

Ejemplo breve:
Si se cargan 20 unidades de un producto mediante un movimiento de ingreso y luego se confirman ventas por 5 y 3 unidades, el stock disponible deberia resultar 12.

## 7. Tickets de Venta

- Un ticket puede crearse en estado borrador antes de su confirmacion.
- Una venta en borrador no descuenta stock.
- Una venta confirmada si descuenta stock.
- La confirmacion del ticket es el evento que consolida la operacion comercial en el MVP.
- Un ticket debe guardar snapshots de nombre, precio y costo por cada item vendido.
- Los snapshots deben preservarse aunque luego cambien los datos maestros del producto o del canal.
- Un ticket confirmado debe quedar asociado al usuario responsable de la confirmacion.
- La consulta historica de tickets debe apoyarse en los snapshots guardados, no solo en relaciones vivas con entidades maestras.

Ejemplo breve:
Un ticket cargado a las 12:00 puede quedar en borrador sin afectar inventario. Si se confirma a las 12:10, el descuento de stock ocurre en ese momento y con los snapshots vigentes a esa hora.

## 8. Anulaciones y Reversion

- Una venta anulada no borra movimientos; genera movimientos inversos.
- La anulacion no debe destruir evidencia historica del ticket original.
- Solo las ventas previamente confirmadas pueden requerir reversion de stock.
- La reversion debe mantener trazabilidad con el ticket y con los movimientos originales cuando aplique.
- La anulacion debe registrar usuario responsable, fecha y motivo si el proceso operativo lo exige.
- Los tickets anulados deben seguir siendo consultables para auditoria y analisis.

Ejemplo breve:
Si una venta confirmada desconto 2 unidades de un producto, su anulacion debe generar un nuevo movimiento de +2 unidades, no eliminar el movimiento original de -2.

## 9. Usuarios y Trazabilidad

- Los usuarios con historial no se eliminan fisicamente; se desactivan.
- Toda accion critica debe registrar usuario responsable.
- Se considera accion critica, como minimo, la creacion o modificacion de costos, precios, movimientos de inventario, confirmaciones de ticket y anulaciones.
- Un usuario desactivado no deberia poder operar nuevas acciones, pero debe seguir visible en el historial de operaciones ya realizadas.
- Las acciones deben conservar fecha y hora, ademas del usuario responsable.

Ejemplo breve:
Si un encargado confirma una venta y luego deja de trabajar en el restaurante, su usuario se desactiva, pero la confirmacion historica debe seguir asociada a ese usuario.

## 10. Auditoria

- Toda accion critica debe poder auditarse.
- La auditoria no reemplaza al historial funcional de tickets, costos o movimientos, sino que lo complementa.
- La auditoria debe permitir responder que accion ocurrio, sobre que entidad, cuando ocurrio y que usuario la realizo.
- Cuando corresponda, la auditoria deberia guardar contexto previo y posterior del cambio o al menos un resumen suficiente del evento.
- Las operaciones destructivas sobre entidades con historial deben evitarse para no romper trazabilidad.
- Los eventos de auditoria deben ser consultables para control interno e investigacion operativa.

Ejemplo breve:
Si un usuario cambia el precio vigente de un producto para PedidosYa, el sistema debe conservar evidencia de quien realizo el cambio y cuando fue realizado, aun cuando el nuevo precio reemplace la vigencia actual.

## Validaciones Operativas Transversales

- No debe haber mas de un costo vigente por producto al mismo tiempo.
- No debe haber mas de un precio vigente por producto y canal al mismo tiempo.
- No debe confirmarse una venta si la politica operativa definida exige stock suficiente y el stock disponible no alcanza.
- No debe permitirse editar manualmente un saldo de stock por fuera del mecanismo de movimientos.
- No debe permitirse eliminar fisicamente entidades con historial operativo relevante.

## Casos para Precisar en Sprints Siguientes

- Definir reglas operativas mas detalladas para `RETURN_IN`, incluyendo si exigira validacion adicional sobre condicion del producto devuelto.
- Definir el detalle minimo obligatorio de motivos de anulacion y ajustes manuales.
- Definir reglas exactas de cierre de vigencias para costos y precios cuando existan cargas retroactivas.
