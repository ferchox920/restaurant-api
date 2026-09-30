# Backend foundation: evidencia y contrato

Fecha: 2026-09-30 (America/Buenos_Aires). Repositorio: `ferchox920/restaurant-api`.
Rama: `portfolio/backend-foundation`. Base obtenida con `git fetch origin --prune`:
`f5f0b75b0c49c230fe7ec2b3feee582da182cbb8` (`origin/main`).
Se usó un worktree limpio; el checkout original y su documento local sin seguimiento
se preservaron. No se modificó `restaurant-admin`, licencia ni infraestructura de producción.

## Resultados ejecutados

Runtime local: Node `v24.19.0`, npm `11.6.2`, TypeScript `5.9.3`, Prisma y Client
`6.19.3`, PostgreSQL `17.9` (contenedor descartable). CI fija las mismas versiones
de Node/npm y PostgreSQL. Ninguna prueba usa proveedores o credenciales externos.

| Comando / etapa | Resultado real |
| --- | --- |
| Primer `npm ci` | Falló: `@emnapi/wasi-threads@1.2.2` no satisface `1.2.3` |
| `npm install --package-lock-only --ignore-scripts` | Reparó únicamente versión, URL e integridad de ese paquete; después se agregó metadata de engines |
| Segundo `npm ci` | Pasó: 767 paquetes instalados |
| Prisma generate / migrate deploy iniciales | Pasaron; 16 migraciones aplicadas desde PostgreSQL vacío |
| Unitarias iniciales sin configuración | 291 aprobadas, 1 fallida; 41 suites aprobadas y 2 fallidas (una no pudo cargar por variables obligatorias ausentes) |
| Unitarias de base con configuración ficticia | 298 aprobadas, 0 fallidas, 0 omitidas; 43 suites |
| Aceptación existente antes de cambiar comportamiento | 10 aprobadas, 0 fallidas, 0 omitidas; 2 suites contra PostgreSQL |
| Lint sin fix, formato, TypeScript, build de base | Pasaron |
| `npm run verify:static` | Prisma Client, lint sin escritura, formato sin escritura, TypeScript y build: aprobados |
| `npm run verify:unit` | 304 aprobadas, 0 fallidas, 0 omitidas; 44 suites |
| `npm run verify:database` | 32 aprobadas, 0 fallidas, 0 omitidas; 3 suites, migraciones desde base vacía |
| `npm run verify:seed` | 1 aprobada, 0 fallidas, 0 omitidas; migraciones y seed en otra base vacía |

La verificación final suma **337 pruebas aprobadas**. La sección de publicación
del PR identifica el SHA exacto y los runs remotos; consultar los checks del head
del PR para el estado actual. No se exige un porcentaje de cobertura sin base medida.

Los comandos `verify:*` están implementados en `scripts/verify.mjs`, generan
`evidence/<modo>-commands.json`, logs por control y reportes Jest JSON. Se usan
idénticamente en local y CI. `evidence/` se ignora en Git y se conserva en artifacts
de CI por 14 días. Las reproducciones iniciales se resumen aquí; los logs locales
quedan en el worktree para inspección. Solo las selecciones explícitas de tests de
reproducción muestran casos no seleccionados; la suite final no contiene skips.

Evidencia versionada: [salidas iniciales y reproducciones](evidence/reproductions.txt)
y [reintento del servicio idempotente original](evidence/retry-baseline.txt).
Ese segundo experimento ejecutó el servicio del SHA base sobre una fixture propia:
stock `3`, ticket CONFIRMED, registro eliminado y reintento HTTP-equivalente 409.

## Defectos reproducidos y correcciones

1. **Respuesta idempotente después del commit comercial.** Un fallo controlado en
   `idempotencyRecord.update` dejó stock `3` en lugar de `5` y venta confirmada.
   El catch original eliminaba la clave incompleta. Al reintentar, el estado
   CONFIRMED impedía repetir esa confirmación, pero no había resultado recuperable:
   se devolvía conflicto. Operación y respuesta ahora comparten la misma transacción.
   Un fallo revierte ambas; un resultado confirmado se recupera sin repetir efectos.
2. **Ticket modificado sin versión de comanda.** Fallar la actualización de comanda
   dejó cantidad `3`, total `30` y ticket versión `3` sobre una comanda sin actualizar.
   Agregar, editar y quitar ahora incluyen lecturas, versión, escritura de ticket,
   totales, auditoría y evento en una transacción serializable.
3. **DELETE sin incremento de versión.** Se observó versión `2` en lugar de `3`.
   DELETE ahora participa en la misma política y admite `expectedVersion` por query.
4. **Fallback fuera de transacción.** Un `$transaction` sin implementación ejecutaba
   el callback y devolvía `unsafe`. Ahora falla explícitamente. La adaptación de
   mocks vive en tests, incluyendo las fixtures transaccionales de ventas y usuarios.
5. **Versión ausente en la lectura de borradores.** La consulta `ensureDraftTicket`
   omitía `version`, así que comparaba contra `1` incluso después de editar el ticket.
   La suite mostró conflictos falsos en ediciones de una comanda válida. Se selecciona
   la versión real dentro de la transacción.
6. **Endpoints directos de tickets vinculados.** Tres reproducciones dejaron una
   comanda OPEN tras confirmar/cancelar su ticket o conservaron su versión al editarlo.
   Se mantienen las rutas de ventas y se sincroniza la comanda dentro de la misma
   transacción, con evento y auditoría de cierre/cancelación. Anular una venta de una
   comanda cerrada conserva su cierre histórico y aumenta su versión.

Las primeras tres reproducciones PostgreSQL fallaron antes de corregir; el test del
helper falló con 2 casos existentes aprobados; los tres casos de endpoints vinculados
también fallaron antes de corregir. Durante implementación se corrigieron fixtures
unitarias que carecían de cliente transaccional/delegate `tableOrder` y el formato
de los archivos nuevos. Ningún fallo se convirtió en skip ni se eliminó una prueba.

## Garantías PostgreSQL verificadas

`test/foundation.e2e-spec.ts` agrega **22 casos** con fixtures propias, Decimal,
Prisma real, servicios reales y endpoints HTTP autenticados. Los proxies de tests
solo insertan barreras/fallos después de operaciones reales; las lecturas y escrituras
siguen ocurriendo en PostgreSQL. Las barreras esperan dos solicitudes antes de liberar
el punto crítico; los reintentos no vuelven a esperar. No hay sleeps para crear carreras.

| Riesgo | Resultado observado / invariante protegida |
| --- | --- |
| Dos aperturas de una mesa | Una solicitud exitosa, una comanda OPEN, un ticket |
| Dos ediciones con igual versión | Una exitosa, otra 409; versión incrementada una vez |
| Edición o eliminación mientras se cierra | Una gana; OPEN/DRAFT sin salida o CLOSED/CONFIRMED con contenido confirmado y salida coherente |
| Dos cierres | Una salida SALE_OUT; stock `5 → 3` |
| Dos anulaciones | Una reversión VOID_REVERSAL; stock `3 → 5` |
| Dos ventas de 4 sobre stock 5 | Una confirmación; stock final `1`, nunca negativo |
| Fallo al actualizar comanda / cerrar | Ticket, comanda, movimientos, auditoría y eventos vuelven al estado anterior |
| Fallo al persistir respuesta idempotente | Sin efectos parciales; reintento seguro con la misma clave |
| Dos claves idénticas simultáneas | Ambas recuperan el mismo resultado; una confirmación, salida y auditoría |
| Una clave con payloads distintos simultáneos | Una confirmación; el otro recibe `IDEMPOTENCY_KEY_REUSED` |
| Respuesta perdida después de confirmar | Mismo JSON al reintentar; sin movimiento/auditoría adicional |
| Respuesta todavía sin commit | Otro cliente sigue viendo DRAFT y stock original |
| Claves expiradas / incompletas antiguas | Resultado retenido o conflicto de reconciliación; no se repite la operación |
| Contratos HTTP | DELETE con versión string, rechazo de versión numérica, flags, bearer/cookie y revocación |

Se preservan SERIALIZABLE y hasta 3 reintentos adicionales por `P2034`, cálculo de
precios/totales en servidor, snapshots, Decimal, autorización vigente por roles y
auditoría transaccional. El test del helper prueba también el límite de reintentos y
la propagación inmediata de errores distintos de conflictos de serialización.

## Migraciones y seed independiente

Se ejecutaron las **16 migraciones reales** desde bases PostgreSQL vacías separadas
para negocio y seed. No se usó `db push` ni reset sobre datos privados. No se agregaron
migraciones de negocio: las restricciones existentes, incluyendo índice parcial de
comanda OPEN por mesa y límites de stock, siguen protegiendo las invariantes.

`test/seed.verify.ts` ejecuta el seed real tres veces: dos consecutivas y una después
de una venta real confirmada. Compara ids, conteos, cantidades, costos y precios.

| Entidad | Primera ejecución | Segunda ejecución | Después de venta + tercer seed |
| --- | ---: | ---: | ---: |
| Usuarios ficticios configurados | 1 | 1 | 1 |
| Categorías / canales / bancos / mesas | 5 / 5 / 3 / 5 | iguales | iguales |
| Productos / costos vigentes / precios vigentes | 4 / 4 / 20 | iguales | iguales |
| Movimientos de inventario | 3 | 3 | 4 |
| Tickets / ítems | 0 / 0 | 0 / 0 | 1 / 1 |
| Coca-Cola stock | 20 | 20 | 18 |
| Ítems huérfanos / FK sin validar / stocks negativos | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |

No se repone el stock vendido, no se multiplican precios/costos y no se duplican
referencias. Contraseñas/tokens no se registran. La lógica del seed ya era adecuada;
solo recibió formato para participar en el check ampliado.

## Contrato vigente para `restaurant-admin`

### Autenticación y revocación

- `POST /api/auth/login` devuelve `{accessToken, user}` por defecto; bearer en
  `Authorization: Bearer <JWT>`. `GET /api/auth/me` devuelve el usuario.
- `AUTH_COOKIE=false` y `AUTH_TOKEN_RESPONSE=true` son los defaults. Con cookie
  habilitada se agrega `restaurant_session`, HttpOnly, SameSite=Lax, Path=/ y Secure
  en producción. La cookie no tiene maxAge explícito. Con `AUTH_TOKEN_RESPONSE=false`
  se omite `accessToken`. No se cambió el modo de autenticación.
- El extractor acepta bearer primero y luego cookie. Tokens emitidos con cookie
  habilitada incluyen `jti` y registro `AuthSession`. Logout devuelve 204, revoca esa
  sesión y limpia la cookie. El mismo JWT deja de servir por bearer o cookie.
- Tokens legacy sin `jti` no tienen revocación individual persistida: logout limpia
  la cookie, pero ese bearer sigue válido hasta expirar o desactivar el usuario.
  La prueba HTTP protege explícitamente esta limitación vigente.
- CORS en producción requiere origen explícito. Credentials sigue `AUTH_COOKIE`.
  Los roles de ventas/comandas no cambiaron; no se agregaron reglas de propiedad.

### Versiones, idempotencia y errores

- `version` y `expectedVersion` son **strings decimales**, nunca números JS. Dinero y
  cantidades también se serializan como strings decimales. Versión inicia en `"1"`.
- Versiones de comanda y ticket son independientes. Usar versión de comanda en rutas
  `/table-orders`, versión de ticket en `/sales/tickets`. Cada cambio exitoso aumenta
  su versión; modificar un ticket vinculado también aumenta la de comanda.
- DTOs de mutación usan `expectedVersion`; DELETE de consumos en ambas familias usa
  `?expectedVersion=<string>`. Es opcional por defecto y obligatorio al habilitar
  `OPTIMISTIC_VERSIONING`. Una versión obsoleta devuelve 409 `STALE_VERSION` con
  `entityType`, `entityId`, `currentVersion` string. Una versión numérica se rechaza 400.
- `Idempotency-Key` aplica a confirmación de ticket, anulación de ticket y cierre de
  comanda. Se delimita por actor, operación (incluye recurso) y clave. Misma clave y
  payload recupera JSON confirmado. Reusar payload diferente devuelve 409
  `IDEMPOTENCY_KEY_REUSED`. Con `OPTIMISTIC_VERSIONING` habilitado la cabecera es
  obligatoria en esas rutas; su ausencia devuelve 400.
- Nuevos hashes de payload ordenan campos de objetos; conservan orden de arrays y
  tipos. La lectura también acepta el hash legacy del payload exacto. Se preservó
  la fórmula de hash de claves, para recuperar registros existentes.
- `expiresAt` marca 24 horas de retención mínima, **no autoriza a reutilizar la clave**.
  Los resultados completos se conservan/reproducen después de expirar. No hay borrado
  automático. Nuevos registros incompletos no se confirman separados del negocio.
  Registros legacy incompletos devuelven `IDEMPOTENCY_IN_PROGRESS` antes de expirar
  o `IDEMPOTENCY_RECOVERY_REQUIRED` después. Requieren reconciliación manual con
  ticket, movimientos y auditoría para persistir el resultado; no se eliminan ni se
  liberan automáticamente. La retención indefinida tiene costo de almacenamiento.
- 400 validación; 401 credenciales; 403 rol; 404 recurso; 409 estado/stock/versiones;
  500 error inesperado. El filtro HTTP incluye `statusCode`, `path`, `timestamp` y
  campos del error. Un fallo inesperado no expone detalles internos en la respuesta.
- La garantía cubre efectos dentro de PostgreSQL. No se promete ejecución exactamente
  una vez frente a servicios externos.

### SSE opcional

`GET /api/operations/events`, `OPERATIONS_SSE=false` por defecto. Requiere JWT y
presencia de cookie `restaurant_session`; un EventSource nativo usa credentials.
Máximo 3 conexiones por usuario; deshabilitado/límite devuelve 503. No hay filtro
de eventos por rol o propietario agregado en esta etapa.

Eventos producidos en esta base: `sale-ticket.changed` y `table-order.changed`.
`table.changed` e `inventory.changed` son escuchados por el frontend, pero no tienen
productores en el backend inspeccionado. El frontend debe conservar refetch para
mesas/stock y considerar las relaciones de eventos de ventas/comandas.

```text
id: 123
event: table-order.changed
data: {"entityType":"TableOrder","entityId":"uuid","version":"3","related":{"restaurantTableId":"uuid","saleTicketId":"uuid"}}
```

El id/cursor es string decimal de BigInt. Cursor de entrada: cabecera `Last-Event-ID`;
query `lastEventId` no se consume. Cursor ausente/inválido empieza en 0. Se reproducen
eventos posteriores al cursor de las últimas 24 horas. Más de 1000 produce
`event: resync.required` y `data: {"reason":"replay_limit"}`; el cliente debe refrescar
su estado. No hay señal específica para cursor anterior a la ventana de 24h.
Polling de respaldo cada 2s, heartbeat como comentario cada 25s; persistencia/evento
y `pg_notify` se ejecutan en la transacción. Tests unitarios protegen nombres, campos,
cursor, números grandes, `resync.required` y flag deshabilitado.

### Configuración

| Opción | Default / obligación |
| --- | --- |
| NODE_ENV, DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, SWAGGER_ENABLED | obligatorios; JWT_SECRET mínimo 32 caracteres en producción, 8 fuera |
| ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, ADMIN_LAST_NAME | obligatorios; password mínimo 8; para verificación son ficticios |
| PORT / TRUST_PROXY_HOPS | 3000 / 0 |
| CORS_ENABLED / CORS_ORIGIN | false / opcional; bootstrap habilita CORS fuera de producción |
| AUTH_COOKIE / AUTH_TOKEN_RESPONSE | false / true |
| OPTIMISTIC_VERSIONING / OPERATIONS_SSE | false / false |
| OBSERVABILITY_V1, HTTP_COMPRESSION, POS_CATALOG_V1 | false |
| STOCK_REPORT_PAGED, REPORT_QUERY_V2, SALE_TICKET_SUMMARY_LIST | false |
| HTTP_TIMEOUT_MS / REPORT_TIMEOUT_MS | 10000 / 30000 |
| CONNECTION_LIMIT / POOL_TIMEOUT_SECONDS | 10 / 10 |
| MANAGER, CASHIER, AUDITOR EMAIL/PASSWORD | opcionales para demo seed; configurar ambos por rol |

La referencia definitiva es `src/config/env.validation.ts` y `.env.example`.
Ninguna función opcional se habilitó automáticamente.

### Diferencias comprobadas en frontend (próxima etapa)

Consulta de solo lectura del SHA `2982f52136c7929d72b38bda29cbb5aa325a54b3` de
`ferchox920/restaurant-admin`:

1. `components/providers/operational-events.tsx` declara `relatedIds` y `version?: number`;
   el backend emite `related` y versión string. Ajustar tipo e invalidaciones por
   `restaurantTableId`/`saleTicketId`.
2. El proveedor envía cursor por query al recrear EventSource; el backend solo lee
   la cabecera. El navegador manda esa cabecera al reconectar la misma instancia,
   pero el cliente actual la cierra y crea otra. Acordar adaptación en la siguiente etapa.
3. No hay listener de `resync.required`; necesita refetch completo de estado visible.
4. APIs de cierre/confirmación/anulación generan UUID nuevo por llamada. Conservar
   una clave por intento lógico y reusarla al reintentar después de una respuesta perdida.
5. Tipos REST de ventas/comandas ya declaran `version?: string` y `expectedVersion?: string`;
   esa parte es compatible. Las APIs DELETE aún no envían versión; agregar la query
   antes de activar versionado obligatorio.
6. SSE exige cookie; habilitar y probar autenticación/cross-origin de forma conjunta
   después, sin migrarla en esta etapa. Atender también productores de mesa/inventario
   y replay fuera de ventana antes de declarar sincronización SSE completa.

## CI y publicación

PR/push main: `.github/workflows/ci.yml` separa controles/unitarias de PostgreSQL
comercial y seed, tiene permissions `contents: read`, timeout 15 minutos,
concurrency por workflow/ref y artifacts incluso con fallo. CodeQL tiene timeout
20 minutos, `security-events: write` acotado al job y JavaScript/TypeScript sin build.
Dependabot semanal limita PRs npm a 3 y Actions a 2; no hace auto-merge.

Actions fijadas a SHA de releases oficiales verificadas el 2026-09-30:
[checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1),
[setup-node v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0),
[upload-artifact v7.0.1](https://github.com/actions/upload-artifact/releases/tag/v7.0.1),
[CodeQL v4.38.2](https://github.com/github/codeql-action/releases/tag/v4.38.2).
Los manifests oficiales usan `node24`; Node del proyecto se fija en `.nvmrc` y
[la distribución oficial v24.19.0](https://nodejs.org/download/release/v24.19.0/).

El PR queda abierto hacia main; no se fusiona ni despliega. Los enlaces específicos
de PR, CI y CodeQL, el SHA local/remoto y cualquier bloqueo remoto se registran
en la entrega del PR. Los checks se deben evaluar sobre el último head.

## Limitaciones y próxima acción

Persisten la semántica legacy de logout, retención indefinida de claves, reconciliación
manual de registros legacy incompletos y las brechas SSE/frontend descriptas. npm ci
informa 14 vulnerabilidades de dependencias (1 baja, 2 moderadas, 11 altas) y deprecaciones
de glob/inflight; no se hicieron upgrades ajenos al lockfile requerido. Prisma avisa
que `package.json#prisma` se deprecará en Prisma 7. No son advertencias de runtime de Actions.

**Única próxima acción:** integrar `restaurant-admin` contra este contrato y cerrar
las brechas de claves, DELETE y SSE, manteniendo este PR abierto para revisión conjunta.
