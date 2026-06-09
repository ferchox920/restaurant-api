# MVP Functional Specification

Este documento define la especificacion funcional inicial del MVP para una API administrativa de restaurantes. En esta etapa el alcance es exclusivamente backend/API: no se contempla frontend, panel web ni aplicaciones moviles.

## Objetivo General del Sistema

El sistema tendra como objetivo central administrar la operacion basica de venta y control interno de un restaurante mediante una API que permita mantener productos, precios, costos, stock y tickets de venta con trazabilidad operativa.

La API debera servir como base confiable para registrar operaciones criticas del negocio, preservar historial de datos relevantes y garantizar que las acciones sensibles queden asociadas a un usuario responsable.

## Alcance Inicial del MVP

El MVP cubre las capacidades minimas necesarias para operar una administracion comercial basica sobre producto terminado. Incluye:

### Gestion de usuarios y seguridad operativa

- Crear usuarios.
- Gestionar roles.
- Asociar usuario responsable a acciones criticas.

### Gestion comercial base

- Crear categorias.
- Crear productos terminados.
- Crear canales de venta, por ejemplo Mostrador, PedidosYa o Uber Eats.

### Costos y precios historizados

- Definir costos historizados por producto.
- Definir precios historizados por canal para cada producto.
- Mantener trazabilidad temporal de cambios para consulta posterior.

### Stock e inventario de producto finalizado

- Agregar stock de productos finalizados.
- Registrar movimientos de inventario.
- Consultar stock actual y trazabilidad de movimientos.

### Operacion de tickets de venta

- Crear tickets de venta.
- Confirmar tickets.
- Descontar stock al confirmar tickets.
- Anular ventas generando una reversion de stock.
- Guardar snapshots historicos de nombre, precio y costo en cada ticket.
- Consultar ventas registradas.

## Problemas de Negocio que Resuelve

El MVP busca resolver problemas operativos frecuentes en restaurantes con administracion manual o parcialmente informal:

- Falta de una fuente unica y consistente para productos, precios y canales de venta.
- Dificultad para conocer el stock disponible real de producto terminado.
- Ausencia de historial confiable sobre costos y precios vigentes en cada momento.
- Poca trazabilidad sobre quien realizo cambios sensibles o confirmo operaciones importantes.
- Riesgo de perder contexto historico en ventas cuando un producto cambia de nombre, costo o precio.
- Baja capacidad de auditoria sobre anulaciones, ajustes de stock y movimientos administrativos.

## Alcance Excluido

Quedan explicitamente fuera del MVP los siguientes temas:

- Gestion de insumos.
- Gestion de recetas o formulas de produccion.
- Gestion de proveedores.
- Registro de compras.
- Manejo de multiples sucursales o depositos distribuidos.
- Facturacion fiscal.
- Integracion automatica con plataformas externas como PedidosYa, Uber Eats u otras.
- Frontend administrativo, panel web o experiencia de usuario final.

En esta etapa el inventario sera exclusivamente de producto finalizado. No se modelaran consumos internos de insumos ni procesos de transformacion productiva.

## Descripcion General del Flujo Principal

El flujo principal del MVP se apoya en la preparacion administrativa y en la registracion consistente de la venta:

1. Un usuario autorizado crea categorias, productos terminados y canales de venta.
2. Un usuario autorizado define costos historizados por producto.
3. Un usuario autorizado define precios historizados por canal para cada producto.
4. Un usuario autorizado agrega stock inicial o incremental de producto finalizado y el sistema registra el movimiento correspondiente.
5. Un operador crea un ticket de venta con sus items, cantidades, canal y contexto operativo.
6. Al confirmar el ticket, el sistema valida disponibilidad de stock y descuenta existencias de producto finalizado.
7. En la confirmacion, el sistema persiste snapshots historicos del nombre, precio y costo aplicable de cada item para conservar integridad historica.
8. Si una venta se anula, el sistema registra la reversion de stock y deja trazabilidad del usuario responsable y del evento generado.
9. La API permite luego consultar ventas, stock y movimientos para seguimiento operativo y auditoria.

## Principios Funcionales del Sistema

### Trazabilidad primero

Toda accion critica debe poder asociarse a un usuario responsable y quedar registrada para auditoria posterior.

### Integridad historica

Los cambios de costo, precio o nombre de producto no deben alterar la interpretacion de ventas pasadas. Cada ticket debe conservar snapshots suficientes para reconstruir el contexto comercial del momento de la operacion.

### Modelo incremental

El MVP prioriza resolver la operacion basica con producto terminado antes de incorporar complejidad de insumos, recetas, compras o integraciones externas.

### Consistencia de stock

El stock solo debe modificarse a traves de eventos operativos identificables, como ingresos, ajustes, confirmaciones de ticket o anulaciones con reversion.

### Separacion entre configuracion y operacion

La configuracion maestra del negocio, como productos, categorias, canales, costos y precios, debe mantenerse separada de la operacion diaria de tickets y movimientos.

### API orientada a administracion

El sistema no se disena en esta fase como punto de venta visual ni como integracion con marketplaces, sino como backend administrativo confiable para ordenar la operacion y habilitar futuras extensiones.

## Modulos Principales

### Productos Terminados

Administracion de productos vendibles ya finalizados, con su categoria asociada y datos necesarios para la operacion comercial.

### Stock e Inventario

Control del stock disponible de producto finalizado y registro de sus movimientos con trazabilidad.

### Costos Historizados

Registro de costos por producto con vigencia temporal para consulta historica y uso en snapshots de venta.

### Precios por Canal

Definicion de precios por producto y por canal de venta, con historial de vigencia.

### Tickets de Venta

Registro de tickets, sus items, su confirmacion operativa y su eventual anulacion con impacto en stock.

### Canales de Venta

Catalogo de canales comerciales utilizados por el restaurante para vender, con soporte para precios diferenciados.

### Usuarios y Roles

Gestion de usuarios internos y asignacion de roles para control de permisos y responsabilidad operativa.

### Auditoria de Acciones Criticas

Registro de eventos sensibles para soporte de control interno, revision y trazabilidad.

## Supuestos Iniciales

- El restaurante opera con catalogo de productos terminados listos para la venta.
- Cada ticket confirmado impacta stock en el momento de la confirmacion.
- Los usuarios que operan el sistema ya existen o pueden ser creados administrativamente.
- El modelo de roles sera suficiente para restringir acciones criticas en esta primera etapa.
- Los canales de venta pueden requerir precios distintos para un mismo producto.

## Dependencias del Negocio

- Definicion interna de roles operativos y responsables.
- Criterios de valuacion y carga de costos.
- Politica de precios por canal.
- Reglas de anulacion de ventas y permisos asociados.
- Criterios para considerar una accion como critica a nivel de auditoria.

## Riesgos Funcionales

- Ambiguedad inicial sobre reglas de stock puede afectar consistencia operativa.
- Cambios frecuentes en costos o precios sin reglas claras de vigencia pueden degradar la calidad historica.
- Definiciones insuficientes de roles y permisos pueden generar huecos de control interno.
- Si no se delimitan con precision los casos de anulacion, la reversion de stock puede resultar inconsistente.

## Resumen de decisiones funcionales del Sprint 0

- El MVP cubre solo backend/API administrativo; no incluye frontend.
- El inventario del MVP es exclusivamente de producto finalizado.
- Insumos, recetas, compras, proveedores, multiples sucursales e integraciones automaticas quedan fuera del MVP.
- El stock no se edita directamente; se reconstruye a partir de movimientos de inventario.
- Los tipos iniciales de movimiento son `STOCK_IN`, `SALE_OUT`, `MANUAL_ADJUSTMENT`, `WASTE`, `RETURN_IN` y `VOID_REVERSAL`.
- Los estados iniciales de ticket son `DRAFT`, `CONFIRMED`, `CANCELLED` y `VOIDED`.
- Un ticket en `DRAFT` no descuenta stock; un ticket en `CONFIRMED` si lo descuenta.
- Una anulacion de venta no borra movimientos previos; genera `VOID_REVERSAL`.
- Los costos se versionan por producto y los precios se versionan por producto y canal.
- Solo puede existir un costo vigente por producto y un precio vigente por producto-canal en un momento dado.
- Los tickets deben guardar snapshots historicos de nombre, costo y precio.
- Productos, usuarios y canales con historial no se eliminan fisicamente; se desactivan.
- Toda accion critica debe registrar usuario responsable y quedar trazable para auditoria.
