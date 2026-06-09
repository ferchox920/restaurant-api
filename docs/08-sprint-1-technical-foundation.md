# Sprint 1 - Technical Foundation

Este documento resume la base tecnica creada en Sprint 1 para iniciar el backend de la API administrativa del restaurante. Su objetivo es dejar preparado el proyecto para evolucionar en siguientes sprints sin introducir todavia logica de negocio del dominio.

## Objetivo del Sprint 1

El objetivo principal de Sprint 1 fue construir la fundacion tecnica del backend para permitir:

- Levantar una aplicacion `NestJS` funcional.
- Configurar el proyecto en `TypeScript`.
- Preparar integracion con `PostgreSQL` mediante `Prisma`.
- Centralizar configuracion por variables de entorno.
- Exponer documentacion tecnica inicial con `Swagger`.
- Habilitar validacion global de futuros DTOs.
- Contar con un health check basico.
- Dejar una imagen Docker inicial lista para despliegues futuros.
- Definir una estructura modular clara para el crecimiento del dominio.

## Estructura tecnica del proyecto

La estructura principal implementada en Sprint 1 es:

```text
src/
|- auth/
|- users/
|- products/
|- categories/
|- sales-channels/
|- inventory/
|- sales/
|- audit/
|- common/
|  |- decorators/
|  |- dto/
|  |- exceptions/
|  |- filters/
|  `- interceptors/
|- config/
|- database/
|- health/
|- app.module.ts
`- main.ts
```

### Responsabilidad de las carpetas base

- `src/config/`: configuracion global, validacion de entorno y Swagger.
- `src/database/`: integracion tecnica con Prisma.
- `src/health/`: endpoint de health check.
- `src/common/`: espacio comun para filtros, DTOs, decoradores, interceptores y excepciones futuras.
- `src/auth/`, `src/users/`, `src/products/`, `src/categories/`, `src/sales-channels/`, `src/inventory/`, `src/sales/`, `src/audit/`: modulos reservados para futuros sprints.

## Dependencias principales

Las dependencias tecnicas principales definidas en Sprint 1 son:

- `@nestjs/common`
- `@nestjs/core`
- `@nestjs/platform-express`
- `@nestjs/config`
- `@nestjs/swagger`
- `@prisma/client`
- `prisma`
- `class-validator`
- `class-transformer`
- `joi`
- `swagger-ui-express`

Adicionalmente se configuraron herramientas de desarrollo para compilacion, testing, linting y formateo, como `typescript`, `jest`, `eslint` y `prettier`.

## Variables de entorno

El proyecto incorpora manejo centralizado de variables mediante `@nestjs/config` y validacion de arranque con `Joi`.

### Variables requeridas

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `SWAGGER_ENABLED`

### Archivo de ejemplo

Existe el archivo `.env.example` con la configuracion base:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user@localhost:5432/restaurant_admin?schema=public
JWT_SECRET=change_me
JWT_EXPIRES_IN=1d
SWAGGER_ENABLED=true
```

### Criterio de validacion

Si falta una variable critica o su formato es invalido, la aplicacion falla al iniciar con un error de configuracion explicito.

## Scripts disponibles

Los scripts iniciales definidos en `package.json` son:

- `npm run start`
- `npm run start:dev`
- `npm run build`
- `npm run test`
- `npm run lint`
- `npm run format`
- `npm run prisma`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:migrate:deploy`

## Configuracion de Prisma

`Prisma` fue configurado como capa de acceso a datos para `PostgreSQL`.

### Puntos implementados

- Archivo `prisma/schema.prisma`.
- `datasource db` con `provider = "postgresql"`.
- `generator client` con `provider = "prisma-client-js"`.
- `DATABASE_URL` tomada desde variables de entorno.
- `PrismaService` reutilizable dentro de Nest.
- Cierre limpio de conexiones mediante `onModuleDestroy`.

### Modelo tecnico actual

Se definio un modelo tecnico minimo `SystemMetadata` para permitir evolucionar el esquema sin introducir aun entidades de negocio del dominio.

### Alcance actual

No se implementaron todavia modelos como `User`, `Product`, `SaleTicket`, `InventoryMovement` u otros objetos funcionales del negocio.

## Configuracion de Swagger

La documentacion tecnica de la API fue configurada con `@nestjs/swagger`.

### Comportamiento actual

- Swagger se expone en `GET /docs` cuando `SWAGGER_ENABLED=true`.
- Si `SWAGGER_ENABLED=false`, la ruta no se publica.
- El documento usa:
  - Titulo: `Restaurant Admin API`
  - Descripcion: `API administrativa para gestion de restaurante, productos, inventario, ventas, usuarios y auditoria.`
  - Version: `0.1.0`
- Se agrego soporte `Bearer Auth` para futuros endpoints protegidos.

Actualmente solo se documentan los endpoints que existen, en especial el health check.

## Validacion global

La API fue preparada para validar futuros DTOs de manera global usando `ValidationPipe`.

### Configuracion activa

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

### Complementos comunes

Se dejo creada la estructura `src/common/` para soportar:

- filtros
- interceptores
- decoradores
- DTOs compartidos
- excepciones personalizadas

Ademas, se agrego un filtro HTTP global basico para mantener una respuesta de error consistente sin sobreingenierizar la base del proyecto.

## Health check

Se implemento un endpoint basico de liveness:

- `GET /health`

### Respuesta esperada

```json
{
  "status": "ok",
  "service": "restaurant-admin-api",
  "timestamp": "ISO_DATE",
  "environment": "development"
}
```

### Caracteristicas

- No requiere autenticacion.
- Esta documentado en Swagger.
- Usa `NODE_ENV` desde configuracion.
- No consulta la base de datos.
- Sirve para verificar que la API esta viva tanto en local como en despliegues futuros.

## Dockerfile

Sprint 1 deja un `Dockerfile` inicial y un `.dockerignore`.

### Caracteristicas principales

- Usa imagen `Node LTS`.
- Instala dependencias con `npm ci`.
- Genera `Prisma Client`.
- Compila el proyecto `NestJS`.
- Ejecuta la aplicacion en modo produccion.
- Expone `PORT`.
- Evita copiar `.env` real y otros archivos innecesarios al contexto de build.

## Que NO se implemento todavia

En Sprint 1 no se implemento logica funcional de negocio. En particular:

- No existen CRUDs de dominio.
- No se implemento autenticacion ni autorizacion real.
- No se crearon entidades de negocio finales como `User`, `Product`, `Category`, `SalesChannel`, `InventoryMovement`, `SaleTicket` o `AuditLog`.
- No se implementaron reglas de stock, ventas, costos, precios ni auditoria operativa.
- No se configuro Railway todavia, solo se dejo preparado el proyecto para futuro despliegue.

## Criterios de aceptacion del Sprint 1

Sprint 1 se considera aceptado si se cumplen los siguientes puntos:

- La API levanta localmente.
- `GET /health` responde correctamente.
- Swagger esta disponible en `/docs` si esta habilitado.
- Prisma esta configurado para `PostgreSQL`.
- Existe `.env.example`.
- Existe `Dockerfile`.
- Existe estructura modular inicial.
- No se implemento logica de negocio prematura.
- La documentacion del Sprint 0 se mantiene intacta.

## Resultado del Sprint 1

El proyecto queda listo para iniciar los siguientes sprints sobre una base tecnica consistente, con convenciones iniciales claras y sin adelantar implementaciones de negocio fuera de su momento planificado.
