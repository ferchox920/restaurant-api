# Sprint 11 - Demo Environment Notes

## Objetivo

Definir una politica simple para demostrar el MVP sin contaminar produccion real ni introducir una arquitectura de sandbox mas compleja.

## Tipos de entorno

### Local

- uso diario de desarrollo;
- puede usar seed demo;
- puede resetearse libremente;
- no debe tratarse como evidencia de disponibilidad productiva.

### Demo o staging

- entorno aislado para demos funcionales, validaciones manuales y QA ligero;
- puede usar seed demo;
- puede reiniciarse o reseedearse de forma controlada;
- debe considerarse desechable frente a produccion.

### Produccion

- entorno real con datos operativos o camino a datos reales;
- no debe ejecutar seed demo por defecto;
- solo debe poblarse con seed demo si existe una decision explicita y documentada;
- nunca debe usar credenciales demo.

## Cuando usar seed demo

Usar el seed demo en:

- desarrollo local;
- demos guiadas;
- staging/demo aislado para mostrar el flujo del MVP.

Evitar seed demo en:

- produccion real;
- entornos conectados a clientes o datos sensibles;
- cualquier base donde la carga demo pueda confundirse con operacion real.

## Por que no usar credenciales demo en produccion

- son faciles de adivinar;
- pueden quedar conocidas por terceros internos o externos;
- contaminan auditoria y operaciones;
- complican el cierre de hallazgos de seguridad.

En produccion:

- definir `ADMIN_EMAIL` y `ADMIN_PASSWORD` propios del entorno;
- rotar la password inicial despues del alta si corresponde;
- dejar vacias las variables de usuarios demo opcionales salvo decision explicita.

## Como resetear una base demo

No se agregan scripts destructivos automaticos en Sprint 11.

Reset recomendado, siempre en un entorno demo aislado:

1. confirmar que la base no es productiva;
2. limpiar o recrear la base por medios administrativos;
3. aplicar migraciones de cero;
4. ejecutar seed demo solo si la demo lo requiere;
5. validar endpoints tecnicos y flujo minimo.

## Que validar despues de un reset demo

- `GET /health`
- `GET /health/readiness`
- `GET /api`
- login con credenciales del entorno demo
- categorias, canales y productos esperados
- stock report
- venta minima con confirmacion y void
- audit log y reportes

## Advertencias sobre costos y datos

- un entorno demo publico tambien genera costos de infraestructura;
- si se reutiliza mucho tiempo, puede acumular datos inconsistentes o antiguos;
- una URL demo publica debe tratarse como superficie expuesta y endurecerse como minimo con JWT fuerte, CORS estricto y Swagger deshabilitable;
- no mezclar datos demo con operacion real.
