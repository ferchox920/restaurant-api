# Auditoría integral de rendimiento e integridad del backend

Fecha: 2026-07-14 (America/Buenos_Aires)  
Commit auditado: `39dda00`  
Alcance: diagnóstico y diseño; no se modificaron código, contratos ni migraciones.  
Resultado de pruebas: build correcto, 41/41 suites unitarias (292/292 pruebas) y 2/2 suites E2E (10/10 pruebas) sobre una base descartable limpia.

## 1. Resumen ejecutivo

El backend tiene una base operativa sólida para un único restaurante: validación global estricta, roles, auditoría dentro de las transacciones y operaciones sensibles ejecutadas con aislamiento `SERIALIZABLE` y hasta tres reintentos. Las pruebas concurrentes confirmaron que una venta, anulación lógica o cierre no queda parcialmente aplicado ante conflictos o fallos intermedios.

No está listo para activar los contratos optimizados del frontend. Los bloqueos principales son:

1. El modelo no contiene restaurante, sucursal ni claves de tenant. No existe separación multi-restaurante verificable.
2. Los reportes sin rango temporal superan el objetivo de 300 ms. Con 100.000 ventas, `sales-by-product` obtuvo p95 de 1.008 ms, `sales-by-channel` 656 ms y `sales-by-user` 712 ms.
3. `GET /api/reports/stock` carga el conjunto completo, calcula estados en memoria y devuelve 723 KB para 2.000 productos; obtuvo p95 de 708 ms.
4. No hay detección de ediciones obsoletas. Diez actualizaciones simultáneas de una cantidad devolvieron 200; la última terminó imponiéndose, aunque la integridad contable se mantuvo.
5. La autenticación solo acepta Bearer JWT y login devuelve el token en JSON. No existen cookie, logout, rotación ni revocación de sesión.
6. No existen SSE, request ID, métricas por ruta, `Server-Timing`, medición de consultas por petición, timeouts ni cancelación cooperativa.
7. No hay compresión HTTP. El servidor devolvió `Content-Length: 723319` aun con `Accept-Encoding: gzip`.

Las lecturas operativas paginadas sí cumplen la meta local: productos p95 43 ms, inventario 46 ms, mesas 34 ms, tickets 100 ms y auditoría 38 ms. No se detectó N+1 por fila en esos listados; Prisma resuelve relaciones con un número fijo de consultas batched.

Estado recomendado: mantener apagados todos los flags nuevos. Priorizar tenant/observabilidad, reporte de stock paginado y catálogo POS antes de cookie/SSE.

## 2. Arquitectura actual

### Runtime y despliegue

- Node.js 22.14.0 local; imagen de producción `node:22-slim`.
- NestJS 11 sobre Express, TypeScript, Prisma Client 6.19.3 efectivo y PostgreSQL 16.13.
- Docker multi-stage: instala dependencias, genera Prisma, compila y elimina dependencias de desarrollo.
- Un solo proceso `node dist/main`; no hay cluster, workers, colas ni tareas en segundo plano.
- Railway está documentado como destino futuro, sin evidencia de despliegue aplicado.
- No existen límites de CPU/memoria en Docker Compose ni configuración documentada de réplicas.
- Migraciones se ejecutan como paso separado, correctamente fuera de `start:prod`.

### Organización

- Controladores Nest por dominio: auth, usuarios, productos, categorías, inventario, ventas, canales, bancos, mesas, órdenes, reportes y auditoría.
- Los servicios acceden directamente a Prisma; no hay capa de repositorios.
- DTO con `class-validator`; `ValidationPipe` global usa `whitelist`, transformación y rechazo de campos desconocidos.
- Guards JWT y roles en controladores. El guard JWT consulta al usuario en cada petición para comprobar existencia y estado activo.
- Auditoría síncrona y transaccional en las mutaciones críticas.

### HTTP y seguridad operativa

- Prefijo global `/api`; health y readiness permanecen fuera del prefijo.
- Helmet activo y límite de cuerpo de 1 MB.
- Throttling global: 100 solicitudes por 60 s; login: 5 por 60 s. La prueba devolvió 100 respuestas 200 y luego 5 respuestas 429.
- CORS en producción exige orígenes específicos, pero no configura `credentials: true`.
- Keep-alive provisto por Node/Express, observado con timeout de 5 s.
- No se instala middleware de compresión.
- No hay timeout de petición, deadline propagado ni uso de abort/cancelación al desconectarse el cliente.
- El filtro global oculta detalles al cliente para errores 500, pero registra stack completo sin request ID.

### Base y conexiones

- PostgreSQL; `max_connections=100`, `shared_buffers=128 MB`, `work_mem=4 MB` en el laboratorio.
- `DATABASE_URL` no fija `connection_limit`, `pool_timeout` ni timeouts SQL. El pool usa defaults de Prisma.
- Bajo la carga local se observaron tres conexiones Prisma idle y una conexión de medición activa.
- No hay métricas de pool ni alarma por agotamiento.

### Limitación estructural

No existe `Restaurant`, `Branch`, `tenantId` o equivalente en ninguna entidad. Los nombres, SKU, mesas, usuarios, tickets, movimientos y auditorías son globales. La aplicación debe considerarse single-tenant hasta introducir y migrar esa dimensión.

## 3. Línea base de rendimiento

### Entorno y metodología

- Host: Intel Core i5-13420H, 8 cores/12 hilos, 16,96 GB de RAM.
- API local en modo production; PostgreSQL 16 en contenedor separado, puerto 55432 y almacenamiento tmpfs.
- Dataset máximo: 2.000 productos, 50 mesas, 100.000 tickets confirmados, 200.000 ítems, 500.000 movimientos y 500.000 auditorías.
- Tamaño principal: AuditLog 225 MB, InventoryMovement 137 MB, SaleTicketItem 45 MB y SaleTicket 31 MB.
- Lecturas comunes: 90 muestras luego de warm-up. Reportes grandes: 30 muestras para evitar que el cliente PowerShell dominara el ensayo. Latencia de extremo a extremo local, incluyendo guard, serialización y transferencia.
- Consultas: `pg_stat_statements` reseteado antes de una petición representativa.
- No hubo red WAN, TLS, proxy Railway ni tráfico productivo. Estos resultados no sustituyen APM de producción.
- Los UUID sintéticos derivados de MD5 fueron válidos para PostgreSQL y lecturas, pero no todos cumplían la variante aceptada por DTO. Las mutaciones usaron exclusivamente UUID v4 del seed.

### Resultados HTTP

Todos los tamaños son JSON sin compresión.

| Endpoint | n | p50 ms | p95 ms | p99 ms | Bytes | Consultas SQL | Tiempo SQL muestra ms | Resultado |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `POST /api/auth/login` | 30 | 63,88 | 67,85 | 74,60 | 532 | 2 | no aislado | Cumple |
| `GET /api/auth/me` | 90 | 14,15 | 22,28 | 26,16 | 261 | 2 | 0,043 | Cumple |
| `GET /api/products` | 90 | 23,75 | 43,04 | 50,50 | 17.451 | 2 | 1,726 | Cumple |
| `GET /api/categories` | 90 | 13,74 | 17,14 | 21,12 | 1.143 | 2 | 0,051 | Cumple |
| `GET /api/inventory` | 90 | 28,78 | 45,74 | 51,33 | 13.528 | 3 | 1,235 | Cumple |
| `GET /api/tables` | 90 | 25,72 | 33,68 | 40,27 | 13.255 | 3 | 0,108 | Cumple |
| `GET /api/table-orders` | 90 | 16,14 | 26,15 | 34,94 | 2 en muestra vacía | 6 con relaciones | 0,187 | Cumple |
| `GET /api/sales/tickets` | 90 | 67,05 | 100,20 | 150,45 | 76.451 | 5 | 0,963 | Cumple; payload alto |
| `GET /api/payment-banks` | 90 | 14,38 | 23,26 | 29,62 | 701 | 2 | 0,070 | Cumple |
| `GET /api/sales-channels` | 90 | 16,03 | 22,87 | 25,86 | 1.538 | 3 | 0,144 | Cumple |
| `GET /api/reports/stock` | 30 | 513,59 | 708,24 | 770,95 | 723.319 | 4 | 5,624 | No cumple |
| `GET /api/reports/sales-by-channel` | 30 | 574,32 | 655,82 | 717,59 | 280 | 2 | 546,335 | No cumple |
| `GET /api/reports/sales-by-product` | 30 | 821,96 | 1.008,23 | 1.094,48 | 522.953 | 2 | 499,399 | No cumple |
| `GET /api/reports/sales-by-user` | 30 | 513,02 | 711,58 | 844,70 | 253 | 2 | 456,250 | No cumple |
| `GET /api/reports/inventory-movements` | 90 | 65,29 | 80,40 | 83,70 | 24.581 | 6 | 25,003 | Cumple |
| `GET /api/audit-logs` | 90 | 24,12 | 37,83 | 60,35 | 17.501 | 2 | 0,652 | Cumple |

### CPU, memoria y red

- Snapshot del proceso tras los ensayos: working set 143,5 MB y memoria privada 148,6 MB.
- PostgreSQL reportó aproximadamente 1,61 GiB dentro del contenedor después de crear y consultar 1,3 millones de filas; incluye cache del SO/container, no solo memoria residente del backend.
- No se pudo obtener una serie confiable de CPU por endpoint sin instrumentación. No se atribuyen porcentajes puntuales a rutas.
- El mayor ahorro inmediato de red es comprimir y paginar stock/product-report. El reporte de stock y el reporte por producto suman 1,25 MB por refresco actual.

## 4. Tabla priorizada de problemas

| Problema | Endpoint/módulo | Evidencia | Impacto | Causa | Solución | Riesgo | Esfuerzo | Métrica antes | Objetivo después | Prueba de aceptación |
|---|---|---|---|---|---|---|---|---|---|---|
| Sin aislamiento por restaurante/sucursal | Esquema completo | Ninguna tabla tiene tenant/branch | Crítico | Modelo global | Diseñar tenant, migrar claves/uniques y filtrar desde contexto auth | Migración transversal | XL | 0 entidades aisladas | 100% de acceso scopiado | Pruebas cruzadas nunca leen/escriben otro tenant |
| Reportes de ventas lentos sin rango | `/reports/sales-by-*` | p95 656–1.008 ms; scans de 100k/200k filas | Alto | Agregación completa y respuestas no paginadas | Rango explícito en contrato optimizado, paginación por producto y después cache/materialización si APM lo justifica | Compatibilidad de totales | L | p95 hasta 1.008 ms | p95 <=300 ms | 100k ventas, mismos totales históricos |
| Stock no paginado | `/reports/stock` | p95 708 ms, 723 KB, 2.000 objetos en memoria | Alto | `findMany` completo y filtro de status posterior al mapping | Respuesta paginada y summary SQL global | Cambio de shape | M | 708 ms/723 KB | <=300 ms/<50 KB por página | Summary y total coinciden con consulta completa |
| Ediciones obsoletas no detectadas | tickets, órdenes, stock manual | 10 PATCH concurrentes: 10×200, valor final 11 | Alto | Sin `version`/`expectedVersion` | Versionado optimista en entidades operativas editables | Clientes deben enviar versión | L | 0 conflictos funcionales detectados | 409 determinista | Una edición stale no modifica datos |
| JWT accesible a JavaScript y sin logout | auth | Solo extractor Bearer; login retorna token | Alto | Sesión stateless en localStorage | Cookie HttpOnly progresiva, Origin, CORS credentials, logout y sesiones revocables | Regresión de clientes API | L | Token en JSON | Token fuera de JS | Cookie flags y CSRF E2E |
| Sin observabilidad por petición | infraestructura | No request ID, timing, query count ni percentiles | Alto | No interceptor/contexto/metrics | ALS + interceptor + Prisma telemetry + métricas | Overhead/cardinalidad | M | No medible en producción | overhead <3% | Métricas y logs correlacionados |
| Sin compresión | HTTP | 723.319 bytes aun solicitando gzip | Medio | Middleware ausente | gzip/brotli con umbral y exclusión SSE | CPU en payload pequeño | S | 723 KB | reducción >=70% en JSON grande | `Content-Encoding` y benchmark CPU |
| Payload completo de tickets | `/sales/tickets` | 76 KB por página de 50 | Medio | Listado incluye ítems/productos completos | DTO resumen para listado; detalle por id | Frontend puede depender de campos | M | 76 KB | <25 KB | Contract test con frontend |
| Sin deadline/cancelación | todos/reportes | No timeout ni señal Abort | Medio | Ausencia de middleware y statement timeout | Deadline, `statement_timeout`, cerrar trabajo al abortar | Cancelar escritura indebidamente | M | consultas siguen tras desconexión | lectura cancelada <1 s | Test cliente aborta reporte |
| SSE inexistente | operaciones | No endpoint ni outbox | Medio | Sin bus/event store | Outbox PostgreSQL + LISTEN/NOTIFY + SSE | Operación multi-réplica | XL | polling requerido | entrega p95 <=2 s | replay, reconnect y tenant E2E |
| Códigos de acción inconsistentes | sales | confirmación devuelve 201; duplicado 409 | Medio | `@Post` sin `@HttpCode(200)` | 200 para confirm/cancel/void; 201 solo creación | Cliente podría esperar 201 | S | 201 en confirm | 200 documentado | Tests de contrato HTTP |
| Pool/recursos sin límites explícitos | database/deploy | URL sin límites; contenedor sin CPU/RAM | Medio | Defaults de Prisma/plataforma | Presupuesto de conexiones y límites por réplica | Config incorrecta puede agotar DB | S | desconocido | pool <= presupuesto | Prueba de saturación/readiness |
| Offset profundo en auditoría | `/audit-logs` | offset 10k: 10,4 ms y 20.100 filas inspeccionadas | Bajo hoy | Paginación offset | Cursor `(createdAt,id)` | Cambio de navegación | M | crece linealmente | estable a 500k+ | p95 <100 ms en página profunda |

## 5. Análisis de endpoints

### Autenticación

- Login hace `findUnique(email)`, bcrypt, `update(lastLoginAt)` y firma JWT. El costo observado está dominado por bcrypt y es razonable.
- `/auth/me` consulta al usuario dos veces: una en `JwtStrategy.validate` y otra en `AuthService.getMe`. Puede devolver directamente el usuario autenticado del guard si el contrato no requiere una lectura posterior; conservar una sola consulta de validación.
- Login está correctamente limitado a 5/min. No existe logout.

### Catálogos y selectores

- Productos, categorías, inventario, mesas, órdenes, ventas, bancos y canales usan paginación default 50/máximo 100, salvo reportes de stock y agregados.
- Los listados administrativos devuelven DTO completos. Para selectores es tráfico innecesario aunque el volumen actual sea pequeño.
- Las búsquedas `contains insensitive` cuentan con índices trigram para producto, SKU, notas y mesas. A 2.000 productos el planner eligió scan secuencial por costo, lo cual es correcto para esa cardinalidad; no se propone otro índice de búsqueda.
- No se dispone del repositorio Next.js en este workspace. No fue posible afirmar campo por campo qué no consume. Antes de reducir DTO existentes debe capturarse el uso real o introducir endpoints `/options` separados.

### Inventario

- El listado usa tres consultas fijas: usuario, productos y stocks batched. No hay N+1.
- Movimientos están paginados y el reporte usa `findMany + count` con consultas batched para producto/usuario.
- El `count` sin filtros sobre 500.000 movimientos costó ~26 ms; aceptable localmente, pero debe vigilarse.
- `FINISHED_PRODUCT` está implementado; `RECIPE_BASED` se rechaza de forma explícita en confirmación/void. No cambiar esa regla por rendimiento.

### Mesas y órdenes

- Existe índice único parcial `TableOrder_one_open_order_per_table_idx`, garantía fuerte además del chequeo de servicio.
- Abrir/cancelar/cerrar ocurre dentro de la misma transacción que crea/cancela/confirma el ticket.
- Listados incluyen relaciones mediante consultas batched; el número es fijo, no por fila.

### Ventas

- Listado paginado y ordenado por `createdAt desc`; los índices actuales soportan status/fecha.
- Una página de 50 incluye ítems y producto, generando 76 KB. Separar summary y detail reduciría red y serialización.
- Confirm y void procesan productos agrupados secuencialmente. No es N+1 de lectura de listado, pero sí O(productos distintos) dentro de una mutación. Es necesario para stock; optimizar solo con bloqueo/orden determinista y pruebas de integridad.
- Los snapshots de nombre, SKU, unidad, precio y costo preservan reportes históricos correctamente.

### Reportes

- Stock recupera todo, mapea todo y luego filtra `stockStatus` en Node. Es el problema de memoria/red más claro.
- Los agregados de ventas son SQL, no agregación en memoria. El problema es el volumen sin rango, no una mala selección ORM.
- Con filtro de 30 días, la agregación por canal bajó a ~37,7 ms SQL con 100.000 tickets. El contrato optimizado debe hacer explícito el período usado por la UI sin cambiar silenciosamente el significado del endpoint legacy.
- `sales-by-product` devuelve una fila por producto sin paginación; produjo 523 KB.

### Auditoría

- Límite default 50/máximo 100 y sanitización recursiva de nombres sensibles.
- La sanitización elimina password/token/authorization, pero no detecta números de tarjeta o claves semánticas desconocidas. Añadir política allowlist por evento es más seguro que depender solo del nombre del campo.
- Offset profundo escala linealmente; cursor será preferible cuando el uso real lo justifique.

### Códigos y consistencia

- Confirm/cancel/void de venta usan `POST` y heredan 201 aunque no crean el recurso principal. Deben documentarse temporalmente y migrar a 200 con contract tests.
- Conflictos de estado/stock devuelven 409 correctamente.
- Errores inesperados devuelven estructura consistente con status, path y timestamp.

## 6. Análisis SQL y planes de ejecución

### Evidencia por volumen

| Consulta | Volumen | Plan/resultado |
|---|---:|---|
| Búsqueda parcial de producto | 100 | Seq Scan; 0,084 ms |
| Búsqueda parcial de producto | 500 | Seq Scan; 0,157 ms |
| Búsqueda parcial de producto | 2.000 | Seq Scan; 0,497 ms |
| Productos + categoría + stock, sin límite | 500 | Hash joins + sort; 0,633 ms |
| Productos + categoría + stock, sin límite | 2.000 | Hash joins + sort; 3,160 ms |
| Tickets recientes, limit 50 | 25.000 | Index Scan `status_createdAt`; 0,107 ms |
| Tickets recientes, limit 50 | 100.000 | Index Scan `status_createdAt`; 0,085 ms |
| Ventas por canal, últimos 30 días | 25.000/50.000 ítems | Hash join/aggregate; 10,99 ms |
| Ventas por canal, últimos 30 días | 100.000/200.000 ítems | Hash join/aggregate; 37,68 ms |
| Ventas por canal, todo el histórico | 100.000/200.000 ítems | Seq scans + external merge 14 MB; 278,19 ms en EXPLAIN y ~546 ms vía API |
| Movimientos por producto, limit 50 | 100.000 | Bitmap + sort; 0,129 ms |
| Movimientos por producto, limit 50 | 500.000 | Index Scan `productId_createdAt`; 0,111 ms |
| Movimientos filtrados, offset 10k | 500.000 | Bitmap + sort; 9,065 ms |
| Auditoría por acción, offset 10k | 500.000 | Scan `createdAt`, filtra 10.050; 10,389 ms |

El merge externo del reporte completo está ligado a `work_mem=4 MB`. Subir globalmente `work_mem` no es una solución segura: se multiplica por operación concurrente. Primero deben limitarse rangos/páginas; cualquier ajuste de sesión debe medirse con concurrencia.

### Índices

No se propone agregar índices de forma inmediata a las consultas legacy. Los índices recientes de `status/confirmedAt`, `referenceType/createdAt`, `createdById/createdAt` y trigram están presentes y fueron usados cuando resultó rentable.

Índice condicionado al nuevo catálogo:

| Tabla/columnas | Consulta | Evidencia actual | Evidencia temporal | Mejora | Costo/riesgo | Decisión |
|---|---|---|---|---|---|---|
| `Product(name,id) WHERE active` | primera página POS ordenada por nombre/id | Sin índice: seq scan + sort del catálogo; 3,160 ms para 2.000 con joins | Índice temporal: Index Scan, 51 filas, 0,064 ms en proyección de producto | Evita ordenar/leer todo al paginar | Escritura extra por alta/cambio de nombre; índice pequeño a 2k; la consulta final con joins debe revalidarse | Incluir solo junto con `/pos/catalog` y repetir EXPLAIN exacto |
| `AuditLog(action,createdAt DESC,id)` | acción + página profunda | 10,389 ms, 20.100 filas inspeccionadas | 7,802 ms, 10.050 filas; creación 280 ms a 500k | ~25% en laboratorio | Alto costo de escritura/almacenamiento para ganancia modesta; offset sigue lineal | No agregar; migrar a cursor y medir producción |

No deben eliminarse índices aparentemente redundantes (`productId`, `status`, etc.) sin `pg_stat_user_indexes` de producción durante un período representativo.

### Conteos, joins y columnas

- Prisma selecciona varias columnas de entidad completa en listados. Los nuevos contratos deben usar `select` explícito.
- Relaciones se consultan mediante `IN (...)` batched; no hay una consulta por fila.
- Conteos de reportes y summary deben ejecutarse en SQL, nunca cargando todas las filas.
- Offset se mantiene en endpoints legacy; POS y auditoría futura deben usar keyset.

## 7. Análisis de concurrencia y transacciones

### Garantías actuales

`runSerializableTransaction` inicia una transacción Prisma con aislamiento `SERIALIZABLE`, reintenta errores `P2034` hasta tres veces y propaga el resto.

| Operación | Inicio/fin transaccional | Filas lógicas afectadas | Resultado |
|---|---|---|---|
| Confirmar venta | lectura ticket → validaciones → stock/movimientos/auditoría → ticket confirmado → auditoría venta → commit | ticket, stocks por producto, movimientos, logs | Atómica |
| Void | ticket confirmado → reversiones → ticket voided → auditoría → commit | ticket, stocks, movimientos, logs | Atómica |
| Cancelar draft | ticket + auditoría | ticket/log | Atómica |
| Abrir mesa | validar mesa/open → crear draft → crear order → auditoría | mesa lógica, ticket, order, log | Atómica; unique parcial |
| Cerrar mesa | confirmar ticket dentro de la misma tx → cerrar order → auditoría | order + todas las filas de venta | Atómica |
| Ajustes/merma/ingreso | leer/crear stock → update → movimiento → auditoría | stock, movimiento, log | Atómica |
| Costos/precios vigentes | cerrar vigente → crear nuevo → auditoría | históricos | Unique parcial impide dos vigentes |

No se usa `SELECT ... FOR UPDATE`; la protección depende de SSI de PostgreSQL, actualizaciones de la fila stock y constraints. Esto funcionó en las pruebas, aunque puede elevar reintentos bajo alta contención.

### Pruebas realizadas

- Dos tickets de 6 unidades compitiendo por stock 10: respuestas 201 y 409; stock final 4; un CONFIRMED, un DRAFT y un solo `SALE_OUT`.
- Diez confirmaciones del mismo ticket: una 201 y nueve 409; un movimiento y stock descontado una vez.
- Dos aperturas de la misma mesa: una 201 y una 409; una sola orden abierta.
- Diez cierres de la misma orden: una 200 y nueve 409; ticket confirmado y un solo movimiento.
- Diez cambios concurrentes de cantidad: diez 200 y diez auditorías; cantidad final 11. No hubo corrupción, pero sí ausencia de conflicto de versión.
- Fallo inyectado después de modificar stock y antes de confirmar ticket: HTTP 500; ticket DRAFT, stock original, cero movimientos.
- Fallo inyectado después de actualizar ticket y al insertar auditoría: HTTP 500; ticket DRAFT, stock original, cero movimientos y cero auditorías de confirmación.
- Stock insuficiente devuelve 409 y no deja efectos parciales.

### Versionado optimista recomendado

La integridad de venta/stock ya está cubierta; el versionado es necesario para ediciones interactivas, no para reemplazar transacciones.

- Añadir `version bigint default 1` a `SaleTicket`, `SaleTicketItem`, `TableOrder`, `RestaurantTable` y `ProductStock` cuando sean editables desde más de una terminal.
- Mutaciones reciben `expectedVersion` obligatorio en el contrato optimizado.
- Actualizar con `WHERE id=? AND version=?`, incrementar versión y comprobar filas afectadas.
- Si no coincide: 409 `{ code: "STALE_VERSION", entityId, currentVersion }`; no devolver la entidad completa.
- El frontend refresca solo la entidad indicada.
- Confirm/close/void continúan en `SERIALIZABLE`; idempotencia y versionado son capas complementarias.

También se recomienda `Idempotency-Key` para confirmación, cierre, void y pagos. Guardar tenant, usuario, ruta, hash del cuerpo, estado y respuesta; una misma clave con cuerpo distinto devuelve 409.

## 8. Compatibilidad con los contratos del frontend

El backend actual ya entrega decimales como strings en mappers de ventas, inventario y reportes. La validación de precio, costo, producto activo y stock ocurre al agregar/confirmar y debe conservarse.

No se puede validar el consumo real de campos ni contar solicitudes duplicadas del frontend porque el repositorio Next.js no fue incluido. La comparación contractual indica:

- Flujo POS actual mínimo: productos paginados + categorías + inventario + precios vigentes por producto/canal. Para 2.000 productos puede requerir múltiples páginas y llamadas por precios.
- Catálogo propuesto: una solicitud inicial, dos consultas SQL fijas (items y categorías), 50 items máximo.
- Red estimada: una página POS compacta debería estar por debajo de 25–35 KB sin comprimir, frente a productos 17 KB + inventario 14 KB + categorías y llamadas de precios por cada página. La reducción exacta debe medirse en el frontend.
- Stock actual: 723 KB/2.000 filas. Una página de 50 con summary debería estar aproximadamente entre 15 y 30 KB antes de compresión; confirmar con implementación.

## 9. Cambios de API propuestos

### `GET /api/pos/catalog`

- Roles: ADMIN, MANAGER, CASHIER; AUDITOR solo si el producto permite POS read-only.
- Parámetros: `salesChannelId` UUID obligatorio, `search` opcional trim/máximo 100, `categoryId` UUID opcional, `cursor` opaco y `limit` default/máximo 50.
- Validar canal existente y activo antes de consultar.
- Vendible: producto activo con precio vigente para el canal; productos sin precio vigente se excluyen.
- Orden determinista `name ASC, id ASC`; cursor base64url versionado `{v:1,name,id}`. Cursor inválido: 400.
- Fetch `limit + 1`; `nextCursor` se deriva de la última fila devuelta.
- `currentStock`/`stockStatus` son null para `NON_STOCKED`; `RECIPE_BASED` conserva la política actual y no se habilita para venta mientras no exista consumo de receta.
- Dos consultas fijas: items con joins/select exacto y categorías activas. Cero consultas por item.
- Decimales siempre strings sin conversión por `number`.
- Añadir `Cache-Control: private, no-cache` inicialmente. No introducir cache compartida hasta disponer de tenant e invalidación.

### `GET /api/reports/stock`

- Transición: `responseMode=legacy` conserva el array; `responseMode=paged` entrega el contrato nuevo. Legacy sigue siendo default en la primera versión.
- Paginado: `limit` default 50/máximo 100 y `offset` >=0; mantener active, categoryId, stockManagementType, stockStatus y search.
- Ejecutar summary/total sobre todos los filtros, incluido `stockStatus`; ejecutar items con límite/offset. Dos consultas dentro de snapshot de lectura consistente.
- `summary`: available, lowStock, outOfStock y notTracked del conjunto filtrado completo.
- El frontend activa el flag solo enviando `responseMode=paged`.
- Tras adopción, invertir default y mantener `responseMode=legacy`; retirar legacy en versión mayor.

### Opciones compactas

Agregar `GET /api/{categories|products|users|sales-channels|payment-banks|tables}/options`:

- Respuesta `{ items: [{ id, label, active }], nextCursor }`.
- `search`, cursor y `limit` default 20/máximo 50.
- Select exacto; sin historiales, costos, precios, movimientos ni órdenes.
- Roles iguales o más restrictivos que el recurso original.
- Orden `label,id`; productos pueden formar label visual con SKU, sin exponer costo.

### Consistencia HTTP

- 201: creación de ticket, producto, mesa, orden y recurso nuevo.
- 200: confirm, cancel, close, void, ajustes y cambios con respuesta.
- 204: logout exitoso.
- 409: estado inválido, stock insuficiente, idempotencia conflictiva o versión obsoleta.

## 10. Cambios de base de datos propuestos

No ejecutar ninguna migración hasta resolver tenant. Orden recomendado:

1. Introducir restaurante/sucursal y backfill single-tenant; cambiar uniques globales a uniques por tenant.
2. Agregar versiones operativas y constraints asociados.
3. Agregar sesiones revocables si se aprueba rotación/multidispositivo.
4. Agregar outbox de eventos solo junto con SSE.
5. Agregar índice parcial de catálogo solo tras EXPLAIN de la consulta final.

Tablas futuras sugeridas:

- `AuthSession(id, userId, jtiHash, expiresAt, revokedAt, rotatedFromId, createdAt, lastUsedAt, userAgentHash)`.
- `OperationEvent(id bigint identity, restaurantId, branchId, eventType, entityId, relatedIds jsonb, entityVersion, createdAt, expiresAt)`.
- `IdempotencyRecord(restaurantId, userId, route, key, requestHash, status, responseJson, expiresAt)`.

Toda FK, unique e índice debe comenzar por tenant cuando corresponda. Para tablas masivas, usar migraciones expand/backfill/validate/contract, lotes pequeños y creación concurrente de índices en producción.

## 11. Estrategia de autenticación

### Transición

1. Login sigue devolviendo `accessToken` y además configura `restaurant_session` HttpOnly, `SameSite=Lax`, `Path=/`, `Secure` en producción y sin `Domain`.
2. Extractor acepta cookie y Bearer. Si ambos están presentes y representan sesiones distintas, devolver 401; no elegir silenciosamente.
3. CORS usa allowlist exacta y `credentials: true`; frontend usa `credentials: include`.
4. Para métodos mutables autenticados por cookie, validar `Origin` contra allowlist. Bearer de clientes no-browser puede operar sin Origin.
5. `POST /api/auth/logout` revoca la sesión si existe y limpia cookie con los mismos atributos; respuesta 204 idempotente.
6. Flag backend omite token del JSON cuando todos los clientes usan cookie.
7. Finalmente retirar Bearer de clientes browser; mantenerlo solo si existe una necesidad API explícita.

### Duración, renovación y revocación

- Primera etapa conserva `JWT_EXPIRES_IN` actual para no alterar sesiones.
- Para revocación real, JWT debe incluir `jti` asociado a `AuthSession`; validar sesión activa junto con el usuario.
- Renovación opcional mediante `POST /api/auth/refresh`, con rotación de `jti`; reutilizar un token rotado revoca la familia.
- Cada dispositivo tiene sesión independiente. Logout actual revoca solo la sesión actual; “cerrar todas” revoca todas las sesiones del usuario.
- No almacenar JWT ni refresh token en logs o auditoría; almacenar solo hash de identificador revocable.

### CSRF y rollback

- `SameSite=Lax` + validación exacta de Origin en mutaciones.
- Para integraciones cross-site futuras, agregar token CSRF; no relajar a `SameSite=None` sin ese control.
- Rollback: desactivar emisión cookie y volver a Bearer mientras la respuesta login aún contenga token. No retirar compatibilidad en el mismo deploy que activa frontend.

## 12. Diseño SSE

`GET /api/operations/events` queda bloqueado hasta disponer de autenticación cookie y tenant.

Diseño recomendado:

- La mutación inserta `OperationEvent` dentro de la misma transacción de negocio.
- Un publisher usa PostgreSQL `LISTEN/NOTIFY` para baja latencia; la tabla es fuente de replay y tolera reinicios/réplicas.
- Eventos: `table.changed`, `table-order.changed`, `sale-ticket.changed`, `inventory.changed`.
- Payload mínimo: `entityId`, `relatedIds` permitidos y `version`; no incluir entidad ni snapshots.
- `id:` es el bigint monotónico del outbox. `Last-Event-ID` replay solo para tenant/sucursal autenticados.
- Si el ID es anterior a retención o faltan más de 1.000 eventos: emitir `resync.required` y cerrar para que el cliente refresque endpoints acotados.
- Heartbeat comentario cada 25 s; `retry` entre 2–5 s con jitter del cliente.
- Limpiar listener en `close/aborted`; máximo sugerido inicial 3 conexiones por usuario y 100 por restaurante, configurable.
- Cookie obligatoria; Bearer en query string prohibido.
- Métricas: conexiones actuales, aperturas/cierres, eventos creados/enviados/replay, lag p50/p95/p99, descartes, resync y errores.
- Retención inicial 24 h, limpieza por job separado y lotes; ajustar con telemetría.

## 13. Riesgos y posibles regresiones

- Tenant afecta casi todos los uniques y consultas; una migración incompleta puede mezclar datos.
- Cambiar DTO legacy rompe frontend aunque mejore bytes. Usar endpoints/modes nuevos y contract tests.
- Cachear reportes puede servir totales obsoletos tras confirm/void; no cachear sin invalidación transaccional.
- Subir pool o `work_mem` puede empeorar agotamiento global.
- Versionado obligatorio puede producir 409 frecuentes si el frontend no refresca de forma granular.
- Cookie puede romper CORS o clientes móviles si se retira Bearer antes de tiempo.
- LISTEN/NOTIFY no es replay durable por sí solo; debe acompañar outbox.
- Compresión consume CPU; aplicar umbral y no comprimir SSE.
- Request logging puede filtrar secretos si registra headers/body. Usar allowlist y redacción.
- Los reportes históricos dependen de snapshots; no reemplazarlos por datos actuales.
- E2E inicialmente falló 1/10 sobre el dataset máximo porque su cleanup no elimina mesas ajenas y el listado limita 50. Sobre esquema limpio pasó 10/10. Los tests deben usar base/schema exclusivo por suite o fixtures con filtros deterministas.

## 14. Plan de implementación incremental

| Etapa | Módulos/archivos | Migraciones | Contratos | Pruebas/métricas | Flag | Orden de despliegue | Rollback |
|---|---|---|---|---|---|---|---|
| 1. Instrumentación/base | common, database, main | ninguna | headers request-id/Server-Timing | overhead, p50/p95/p99, pool, query count | `OBSERVABILITY_V1` | backend apagado → validar → encender | apagar interceptor/exporter |
| 2. Consultas/índices | reports, listados | solo índice probado | sin romper legacy | EXPLAIN dataset + APM | `REPORT_QUERY_V2` | query compatible → comparar shadow | volver servicio anterior; índice queda inocuo |
| 3. POS/options | nuevo módulo POS + options | posible índice Product | `/pos/catalog`, `/options` | contract, SQL count fijo, bytes | `POS_CATALOG_V1` | backend → smoke → frontend | apagar frontend; endpoint permanece |
| 4. Stock paginado | reports | ninguna inicial | `responseMode=paged` | summary total, memoria, p95 | `STOCK_REPORT_PAGED` | backend dual → frontend → invertir default | volver a legacy |
| 5. Concurrencia | sales/table-orders/inventory | version + idempotency | `expectedVersion`, 409 | 2/10 clientes, retries, fallos | `OPTIMISTIC_VERSIONING` | columnas nullable/default → dual → obligatorio | aceptar mutación legacy temporal |
| 6. Cookie/logout | auth/main | AuthSession si revocable | cookie, logout, refresh opcional | CORS/CSRF/multidispositivo | `AUTH_COOKIE`, `AUTH_TOKEN_RESPONSE` | dual auth → frontend cookie → ocultar token | reactivar token/Bearer |
| 7. SSE | operations/events | OperationEvent/outbox | event stream | replay, lag, límites, fuga de conexiones | `OPERATIONS_SSE` | outbox → publisher → endpoint → frontend | apagar SSE; frontend vuelve a refresh explícito, no polling normal |
| 8. Retirada legacy | todos | cleanup posterior | retirar modes/endpoints viejos | telemetría cero consumidores | flags de deprecación | anunciar → medir → retirar | restaurar versión anterior/API compatibility layer |

Tenant debe preceder a cualquier etapa que prometa separación por restaurante. Puede ejecutarse entre etapas 1 y 2 como programa propio expand/backfill/contract.

## 15. Plan de pruebas

- Unitarias: mappers decimales, cursor, summary, redacción, Origin, extractores auth, version conflicts e invalidación.
- Contract: OpenAPI y snapshots de payload legacy/nuevo.
- Integración SQL: resultados y EXPLAIN en 100/500/2.000 productos, 25k/100k ventas, 100k/500k movimientos y 500k auditorías.
- Concurrencia: 2 y 10 clientes para confirm, close, void, pagos, stock y cantidades; repetir 100 veces y verificar invariantes.
- Fault injection: después de cada escritura crítica; confirmar rollback de ticket, stock, movimiento, pago y auditoría.
- Tenant: usuarios de A/B intentan IDs válidos del otro tenant; siempre 404/403 sin side channel.
- Seguridad: cookie flags, Origin ausente/incorrecto, CORS, logout, sesión revocada, token rotado y secretos ausentes de logs.
- Rendimiento: warm-up, tres corridas, misma cardinalidad, p95 lecturas <=300 ms y mutaciones <=500 ms.
- Red: bytes con/sin gzip/brotli y costo CPU.
- SSE: Last-Event-ID, restart, lag, heartbeat, desconexión, límite, replay y resync.
- E2E debe crear su propio schema/database y no depender del número de filas preexistente.

Comandos base reproducibles:

```powershell
npm run build
npx jest --runInBand
$env:DATABASE_URL='<URL_EXCLUSIVA_DE_AUDITORIA>'
npx prisma migrate deploy
npx jest --config jest.e2e.config.ts --runInBand
```

Para planes usar únicamente la base descartable:

```sql
EXPLAIN (ANALYZE, BUFFERS, WAL, FORMAT TEXT) <SELECT>;
```

## 16. Despliegue, feature flags y rollback

- Expandir esquema antes de desplegar código que lo use; nunca mezclar migración destructiva y activación.
- Ejecutar migraciones una vez como job; readiness no debe abrir tráfico hasta completarlas.
- Canary inicial 5%, luego 25%, 50% y 100% observando p95/p99, 5xx, 409, pool y locks.
- Los flags se resuelven en backend y frontend por capacidad, no por versión global.
- Conservar contratos legacy al menos un ciclo completo de release con telemetría de consumidores.
- Rollback de aplicación no debe requerir rollback de schema; migraciones deben ser backward-compatible.
- Condiciones generales de rollback: p95 >20% sobre baseline durante 10 min, 5xx >1%, pool >80%, deadlocks, discrepancia de totales/stock o eventos cross-tenant.
- No activar SSE si replay/tenant falla; no activar cookie si Origin/CORS E2E falla; no activar paginado si summary difiere.

## 17. Dependencias y decisiones pendientes

1. Definir si tenant es restaurante, sucursal o ambos, y qué entidades se comparten.
2. Proveer el frontend Next.js o trazas de red para validar campos usados, llamadas duplicadas y reducción exacta.
3. Obtener telemetría Railway/staging para contrastar laboratorio con red/TLS/carga real.
4. Definir presupuesto de conexiones por réplica y máximo de réplicas.
5. Definir período/semántica por defecto de reportes optimizados sin alterar legacy.
6. Elegir política de sesiones: JWT cookie simple o sesiones revocables con rotación.
7. Definir retención de auditoría, idempotencia y outbox.
8. Confirmar roles que pueden consumir POS catalog, options y SSE.
9. Acordar ventana de deprecación de 201 en acciones y de respuestas legacy.

## Matriz de compatibilidad para el frontend

| Capacidad | Estado | Endpoint disponible | Contrato validado | Flag que puede activarse | Bloqueos |
|---|---|---|---|---|---|
| Catálogo POS | No disponible | No | Diseño solamente | Ninguno | tenant, implementación, contract/E2E |
| Reporte de stock paginado | No disponible | Solo array legacy | Legacy medido; nuevo diseñado | Ninguno | implementación dual y validación summary |
| Sesión mediante cookie | No disponible | No | Bearer validado | Ninguno | cookie, CORS credentials, Origin, sesión |
| Logout | No disponible | No | No | Ninguno | cookie/revocación |
| SSE | No disponible | No | Diseño solamente | Ninguno | tenant, cookie, outbox, métricas |
| Versionado de entidades | No disponible | No | Necesidad demostrada por concurrencia | Ninguno | migración y frontend expectedVersion |
| Opciones compactas | No disponible | No | Diseño solamente | Ninguno | endpoints, roles y contract frontend |

Conclusión: ningún flag optimizado del frontend debe activarse todavía.
