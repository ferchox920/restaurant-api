# Acceptance Criteria

Este documento define los criterios de aceptacion globales del Sprint 0 y del MVP funcional de la API administrativa del restaurante. Su objetivo es convertir las decisiones del alcance en condiciones verificables que permitan validar si el sistema o la documentacion cumplen con lo esperado.

## Objetivo del Documento

- Establecer condiciones de aceptacion claras para el Sprint 0.
- Definir resultados funcionales esperados para el MVP.
- Separar entregables documentales de capacidades operativas futuras.
- Facilitar validacion, planificacion y priorizacion de implementacion.

## 1. Criterios de Aceptacion del Sprint 0

Se considerara aceptado el Sprint 0 cuando se cumplan todos los siguientes puntos:

- Existe documento funcional del MVP.
- Existe lista de entidades principales.
- Existen reglas de negocio documentadas.
- Existen estados de ticket documentados.
- Existen tipos de movimiento de inventario documentados.
- Existen roles iniciales documentados.
- Existe flujo principal del sistema documentado.
- Las decisiones del MVP estan claramente separadas de funcionalidades futuras.
- El inventario queda definido como inventario de producto finalizado.
- Queda explicito que insumos y recetas no entran todavia.

### Condiciones de Verificacion del Sprint 0

- El archivo de especificacion funcional describe objetivo, alcance, exclusiones y principios del MVP.
- El documento de entidades identifica las entidades obligatorias del dominio y sus relaciones conceptuales.
- El documento de reglas de negocio refleja las restricciones operativas principales del sistema.
- El documento de estados de ticket define estados, transiciones permitidas y bloqueadas.
- El documento de movimientos de inventario define tipos, reglas y reconstruccion de stock.
- El documento de roles define perfiles iniciales y sus alcances funcionales.
- El flujo principal del sistema muestra una secuencia operativa coherente desde configuracion hasta venta y anulacion.
- Los temas fuera de alcance, como insumos, recetas, proveedores o multiples sucursales, estan explicitamente diferenciados del MVP.

### Resultado Esperado del Sprint 0

Al finalizar el Sprint 0 debe existir una base documental consistente, suficiente para iniciar modelado tecnico del sistema sin ambiguedades graves sobre alcance, dominio ni reglas principales.

## 2. Criterios de Aceptacion del MVP Funcional

Se considerara aceptado el MVP funcional cuando el sistema permita cumplir los siguientes resultados de negocio y operacion:

- Un usuario autorizado puede crear productos.
- Un producto puede existir sin stock.
- Un usuario autorizado puede cargar stock mediante movimientos.
- Un usuario autorizado puede definir costos versionados.
- Un usuario autorizado puede definir precios por canal versionados.
- Un usuario puede crear un ticket en borrador.
- El ticket en borrador no descuenta stock.
- Al confirmar el ticket, el sistema valida stock.
- Si hay stock suficiente, el sistema confirma la venta.
- Al confirmar, el sistema descuenta inventario.
- El ticket guarda snapshots de nombre, precio y costo.
- Cambios posteriores de costo o precio no modifican tickets anteriores.
- Una venta confirmada puede anularse generando reversion.
- La anulacion no borra movimientos anteriores.
- Toda accion critica registra usuario responsable.
- Se pueden consultar ventas, stock y movimientos.

### Detalle de Validacion del MVP Funcional

#### Productos

- Un usuario con permiso suficiente puede crear un producto terminado.
- El alta de producto no genera stock automaticamente.
- El producto puede quedar creado aun con stock inicial cero.

#### Inventario

- El stock solo cambia mediante movimientos de inventario.
- Una carga valida de stock incrementa existencias y deja trazabilidad de usuario responsable.
- El sistema puede reconstruir el stock actual a partir del historial de movimientos.
- El sistema no permite confirmar operaciones que provoquen stock negativo en el MVP.

#### Costos y Precios

- El sistema permite registrar un nuevo costo sin destruir historico previo.
- El sistema permite registrar un nuevo precio por canal sin destruir historico previo.
- Debe ser posible determinar cual era el costo vigente y el precio vigente al momento de una venta.

#### Tickets

- Un usuario puede crear un ticket en estado `DRAFT`.
- Mientras el ticket permanezca en `DRAFT`, no debe existir impacto real sobre inventario.
- Al confirmar un ticket, el sistema valida disponibilidad de stock suficiente para todos sus items.
- Si la validacion es satisfactoria, el ticket pasa a `CONFIRMED`.
- La confirmacion genera movimientos `SALE_OUT` para los productos involucrados.
- Cada item del ticket confirmado conserva snapshots historicos de nombre, costo y precio.

#### Anulaciones

- Una venta previamente confirmada puede pasar a `VOIDED`.
- La anulacion requiere usuario responsable y motivo.
- La anulacion genera movimientos `VOID_REVERSAL` equivalentes a la salida original.
- La anulacion no elimina ni altera destructivamente los movimientos historicos ya registrados.

#### Trazabilidad y Consulta

- Toda accion critica queda asociada a un usuario responsable.
- El sistema permite consultar ventas registradas.
- El sistema permite consultar stock actual.
- El sistema permite consultar movimientos de inventario.
- Los datos consultados deben preservar coherencia historica aun cuando cambien productos, costos o precios despues de una venta.

## Criterios de Corte entre MVP y Futuro

Para considerar aceptado el MVP no sera necesario incluir:

- Gestion de insumos.
- Gestion de recetas.
- Compras a proveedores.
- Multiples sucursales.
- Facturacion fiscal.
- Integraciones automaticas con plataformas externas.
- Frontend o panel administrativo.

La aceptacion del MVP depende de resolver correctamente producto terminado, stock, historizacion de costo y precio, ciclo de vida del ticket, anulaciones y trazabilidad.

## Observaciones Finales

- Los criterios de Sprint 0 validan claridad documental y definicion funcional.
- Los criterios del MVP funcional validan comportamiento del sistema ya implementado.
- Esta separacion evita mezclar avance de analisis con avance real de producto.
