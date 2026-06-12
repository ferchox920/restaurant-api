# Sprint 11 - Railway Deploy Guide

## 1. Requisitos previos

- tener el repositorio con `npm install` ejecutado localmente;
- contar con build y tests pasando antes del deploy;
- tener definida una `JWT_SECRET` fuerte;
- conocer el dominio que consumira la API si se habilitara CORS;
- decidir si Swagger quedara habilitado o no en produccion.

## 2. Variables necesarias en Railway

Variables de runtime requeridas:

- `NODE_ENV=production`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `SWAGGER_ENABLED`
- `CORS_ENABLED`
- `CORS_ORIGIN` cuando `CORS_ENABLED=true`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_FIRST_NAME`
- `ADMIN_LAST_NAME`

Variables opcionales para seed demo:

- `MANAGER_EMAIL`
- `MANAGER_PASSWORD`
- `CASHIER_EMAIL`
- `CASHIER_PASSWORD`
- `AUDITOR_EMAIL`
- `AUDITOR_PASSWORD`

## 3. Crear proyecto en Railway

1. Crear un nuevo proyecto en Railway.
2. Conectar el repositorio de la API.
3. Verificar que Railway detecte el `Dockerfile` del proyecto.
4. Confirmar que no se use un deploy automatico antes de cargar las variables necesarias.

## 4. Agregar PostgreSQL en Railway

1. Desde el proyecto, agregar un servicio PostgreSQL administrado por Railway.
2. Esperar a que la instancia quede provisionada.
3. Confirmar que el servicio de base y el servicio de la API queden dentro del mismo proyecto.

## 5. Obtener `DATABASE_URL`

1. Abrir el servicio PostgreSQL dentro de Railway.
2. Copiar la variable de conexion provista por Railway.
3. Usar esa URL como valor de `DATABASE_URL` en el servicio de la API.

Nota:

- no agregar una variable `DATABASE_SSL` a la aplicacion;
- si Railway entrega parametros SSL en la propia URL, usar la URL completa provista por la plataforma.

## 6. Configurar variables

Configurar al menos:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d
SWAGGER_ENABLED=false
CORS_ENABLED=true
CORS_ORIGIN=https://admin.example.com
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace_with_production_admin_password
ADMIN_FIRST_NAME=System
ADMIN_LAST_NAME=Admin
```

Recomendaciones:

- usar `SWAGGER_ENABLED=false` si el entorno es publico;
- no dejar `CORS_ORIGIN` vacio ni en `*` cuando `CORS_ENABLED=true`;
- no usar credenciales demo en `ADMIN_PASSWORD`.

## 7. Build command sugerido

Si Railway pide un comando de build explicito:

```bash
npm run build
```

## 8. Start command sugerido

Si Railway pide un comando de inicio explicito:

```bash
npm run start:prod
```

## 9. Comando para migraciones

Ejecutar migraciones como paso separado antes de abrir trafico:

```bash
npm run prisma:migrate:deploy
```

## 10. Comando para seed

Ejecutar el seed solo si se necesita poblar datos iniciales:

```bash
npm run prisma:seed
```

## 11. Validacion post-deploy

Validar como minimo:

- `GET /health`
- `GET /health/readiness`
- `GET /api`
- `GET /docs` si `SWAGGER_ENABLED=true`
- `POST /api/auth/login`

Se espera:

- `/health` responda liveness sin tocar base;
- `/health/readiness` confirme conectividad de base;
- `/api` devuelva metadata publica del servicio;
- `/docs` solo este disponible si Swagger esta habilitado;
- el login funcione con las credenciales cargadas en seed o usuarios ya existentes.

## 12. Recomendaciones de produccion

- deshabilitar Swagger si el entorno es publico;
- usar un `JWT_SECRET` fuerte y unico;
- restringir `CORS_ORIGIN` a dominios reales;
- no usar credenciales demo;
- revisar backups de la base;
- revisar logs de aplicacion y plataforma;
- revisar costos del servicio y la base;
- revisar dominio y TLS antes de publicar clientes.

Hardening pendiente recomendado:

- rate limiting;
- politicas operativas de rotacion de credenciales;
- monitoreo externo y alertas.

## 13. Troubleshooting

### Error de `DATABASE_URL`

- verificar que la variable exista en el servicio de la API;
- confirmar que se copio la URL del servicio PostgreSQL correcto;
- revisar si la URL provista por Railway incluye parametros adicionales requeridos.

### Error de migraciones

- ejecutar `npm run prisma:migrate:deploy` antes de levantar trafico;
- revisar que el usuario de la base tenga permisos suficientes;
- confirmar que la base apunte al entorno correcto.

### Error de Prisma Client

- verificar que el build del contenedor haya ejecutado `prisma generate`;
- reconstruir el deploy si hubo cambios en `schema.prisma`.

### Error de puerto

- confirmar que la app escucha en `PORT`;
- revisar la variable inyectada por Railway y que no haya override incorrecto.

### Error de CORS

- revisar `CORS_ENABLED`;
- confirmar que `CORS_ORIGIN` incluya el dominio exacto del cliente;
- en produccion, no usar `*` con CORS habilitado.

### Error de credenciales admin

- confirmar que `ADMIN_EMAIL` y `ADMIN_PASSWORD` fueron definidos antes de correr el seed;
- si el usuario inicial ya existia, revisar si el password quedo preservado o fue reemplazado segun el comportamiento actual del seed.
