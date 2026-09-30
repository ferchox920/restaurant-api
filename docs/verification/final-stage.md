# Etapa técnica final del portafolio

Repositorio de interfaz: [restaurant-admin](https://github.com/ferchox920/restaurant-admin), [PR draft #1](https://github.com/ferchox920/restaurant-admin/pull/1). Backend: [PR draft #1](https://github.com/ferchox920/restaurant-api/pull/1). No se fusiona ni despliega esta etapa.

Inicio backend: `e25b7e1d136247210c6a73c5cdc6d0b50c1eacfd`; frontend: `de1d955b155a42cb097f8f06652a9cd4ade1192e`. Ambos se descargaron de sus ramas PR con árboles limpios; los checkouts originales y sus cambios ajenos se conservaron.

## Dependencias

[Registro por paquete/advisory, cadena, exposición y versión corregida](dependencies-final.md). La auditoría completa inicial encontró 14 paquetes (1 bajo, 2 moderados, 11 altos); producción: 10 (1 bajo, 1 moderado, 8 altos). Ambas consultas terminaron con código 1 por hallazgos, sin error de consulta. Después de instalación limpia, ambas consultas terminaron con código 0 y cero avisos. CodeQL y npm audit son controles distintos.

Se aplicaron actualizaciones compatibles con `npm audit fix`, sin `--force`. Su primera ejecución terminó con código 1: permanecieron cinco paquetes afectados. Swagger incorporó js-yaml 5.3.0, que tiene [GHSA-r3ph-w7gj-g6xm](https://github.com/advisories/GHSA-r3ph-w7gj-g6xm), corregido desde 5.4.1; se fijó 5.4.2 únicamente bajo Swagger. Prisma 6.19.3 incorpora deepmerge-ts 7.1.5 vulnerable: el override únicamente bajo `@prisma/config` usa 8.0.2. Esa migración mayor se verifica con generación, tipos, build, migraciones, operaciones PostgreSQL y seed; no se migra Prisma a otra versión mayor.

Revisar y retirar cada override cuando la dependencia padre resuelva por sí misma una versión corregida. La CI no admite excepciones: falla por cualquier advisory y también si la consulta no entrega un resultado válido. No se retiraron herramientas ni funciones.

## Política SSE

Conexión solo para ADMIN, MANAGER y CASHIER mediante JWT cookie firmado con `jti` y sesión persistida válida. AUDITOR conserva sus lecturas REST y no recibe el stream operativo. Anónimos, cookies arbitrarias y bearer combinado con una cookie arbitraria son rechazados.

Se admiten únicamente pares de tipo/recurso: `table-order.changed`/`TableOrder`, `sale-ticket.changed`/`SaleTicket`, `table.changed`/`RestaurantTable`, `inventory.changed`/`ProductStock`. CASHIER no recibe cambios de inventario. Datos enviados: tipo de entidad, identificador, versión decimal string y referencias string explícitas a mesa, venta, comanda o producto. Se omiten otros tipos, campos arbitrarios y datos personales/económicos adicionales. No existe ownership ni multitenancy.

La sesión se consulta cada 2000 ms con deadline de 1000 ms. Revocación, desactivación, cambio de rol y sesión inexistente cierran en un máximo nominal de **3000 ms**, probado por HTTP con PostgreSQL. El vencimiento JWT tiene además timer propio. Un error/deadline del almacenamiento cierra conservadoramente. Antes de enviar un replay se valida la sesión; la monitorización sigue activa mientras se espera una lectura. La garantía de plazo presupone un proceso y event loop en ejecución; una suspensión del proceso puede demorar cualquier timer.

Antes del cierre por invalidez se emite `session.invalid`; frontend debe detener reintentos y recuperar login. Nunca usar bearer para este stream. La desconexión durante la validación inicial no abre headers ni conserva un slot. Arranque fallido, escritura fallida, desconexión y apagado liberan listeners, timers, suscriptores y contadores. Tres conexiones por usuario; lecturas serializadas por conexión para evitar duplicados/cursor incoherente.

Replay máximo 1000 eventos y ventana de 24 horas. Un replay mayor emite `resync.required` (`replay_limit`) con checkpoint actual. Cursor desconocido o anterior a retención produce la misma señal (`cursor_unknown`/`cursor_expired`). El cliente debe invalidar/refetch sus lecturas autorizadas; no repetir mutaciones. Cursor y versiones permanecen strings y bigint, sin conversión a Number.

## Idempotencia y límites legacy

La reserva de clave, operación comercial, movimientos, auditoría, eventos y persistencia de respuesta usan la **misma transacción**. Un fallo antes de completar la respuesta revierte la operación y la reserva. Las pruebas PostgreSQL conservadas verifican fallo, concurrencia y respuesta perdida, además de las pruebas nuevas SSE.

Identificación conservadora de históricos incompletos, solo lectura:

```sql
SELECT id, "keyHash", "requestHash", "createdAt", "expiresAt"
FROM "IdempotencyRecord"
WHERE response IS NULL OR response = 'null'::jsonb
ORDER BY "createdAt";
```

No interpretar vencimiento como autorización para repetir. El hash no permite reconstruir por sí solo actor, clave, ruta o payload: recuperar los datos originales de evidencia operativa autorizada y comparar ticket, movimientos y auditoría antes de atribuir un efecto. Si no hay prueba suficiente, conservar la fila y el conflicto explícito. Si el efecto y resultado se demuestran inequívocamente, una reconciliación manual controlada puede registrar la respuesta autoritativa con revisión del autor, sin ejecutar otra vez el efecto. Nunca borrar automáticamente la clave ni inventar una respuesta. Este documento no ejecuta reconciliación ni limpieza.

Claves confirmadas se conservan **indefinidamente**, incluso después de `expiresAt`. Retención de eventos y retención de claves son diferentes. No se implementa limpieza que permita duplicación comercial.

Configuración recomendada: cookie persistida con AUTH_COOKIE=true, AUTH_TOKEN_RESPONSE=false, OPTIMISTIC_VERSIONING=true y OPERATIONS_SSE=true; frontend cookie mediante proxy del mismo origen. En bearer legacy sin `jti`, logout no revoca el JWT ya emitido: seguirá válido hasta su expiración, sujeto a usuario activo y rol vigente consultados por la API. Limpiar almacenamiento del navegador no revoca copias externas del bearer. No se reconstruyó autenticación.

## Verificación y alcance

Los conteos anteriores (304 unitarias, 32 aceptación/concurrencia, 1 seed) son antecedentes. Esta etapa añade 17 unitarias SSE y 7 escenarios HTTP reales. Se conservaron fallos iniciales: ocho reproducciones SSE, desconexión durante autenticación y un error local de secuencia al correr unitarias sin regenerar Prisma tras npm ci. Ese último fallo se corrigió ejecutando la generación requerida; no se cambiaron ni omitieron pruebas.

[Evidencia local resumida](final-stage-evidence.json) distingue ejecuciones de escenarios únicos. CI publica reportes JSON y logs de comandos, también ante fallos, durante 14 días. El estado CI final debe comprobarse sobre el último SHA publicado, no inferirse de la inspección ni de resultados locales.

Demo, capturas reales, guía visual y material laboral se publican en [la interfaz](https://github.com/ferchox920/restaurant-admin). La revisión visual humana permanece a cargo del autor; no se declara realizada.
