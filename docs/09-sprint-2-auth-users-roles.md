# Sprint 2 - Auth, Users and Roles

Este documento resume la implementacion tecnica realizada en Sprint 2 para incorporar usuarios internos, autenticacion JWT y una primera capa conservadora de autorizacion por rol.

## Objetivo del Sprint 2

El objetivo principal de Sprint 2 fue agregar una base funcional de acceso seguro a la API, manteniendo el alcance acotado a autenticacion y gestion administrativa de usuarios.

Sprint 2 permitio:

- Crear y consultar usuarios internos.
- Iniciar sesion con email y password.
- Emitir tokens JWT.
- Obtener el usuario autenticado desde un Bearer token.
- Restringir la gestion de usuarios a rol `ADMIN`.
- Preparar decoradores, guards y estrategia JWT para proteger futuros modulos.

## Entidades tecnicas implementadas

### Enum `Role`

Se implemento el enum `Role` en Prisma con los siguientes valores:

- `ADMIN`
- `MANAGER`
- `CASHIER`
- `AUDITOR`

### Modelo `User`

Se implemento el modelo `User` en Prisma con estos campos:

- `id`: UUID
- `email`: string unico
- `passwordHash`: string
- `firstName`: string
- `lastName`: string
- `role`: `Role`
- `active`: boolean con default `true`
- `lastLoginAt`: `DateTime?`
- `createdAt`: `DateTime`
- `updatedAt`: `DateTime`

### Consideraciones del modelo

- La password nunca se guarda en texto plano.
- El sistema no elimina usuarios fisicamente en este sprint.
- La desactivacion logica se maneja con `active=false`.
- Un usuario inactivo no puede iniciar sesion.

## Reglas de autenticacion

- El login se realiza con `email` y `password`.
- Si el email no existe, la API responde `401 Unauthorized`.
- Si la password no coincide, la API responde `401 Unauthorized`.
- Si el usuario esta inactivo, la API responde `401 Unauthorized`.
- En login exitoso:
  - se actualiza `lastLoginAt`
  - se genera un `accessToken`
  - se devuelve el usuario autenticado sin `passwordHash`

### Payload JWT

El JWT contiene:

```json
{
  "sub": "user-id",
  "email": "admin@example.com",
  "role": "ADMIN"
}
```

### Variables utilizadas

- `JWT_SECRET`
- `JWT_EXPIRES_IN`

## Reglas de autorizacion

Sprint 2 aplica una politica conservadora para la gestion de usuarios.

### Politica actual

- Todos los endpoints de `/api/users` requieren JWT.
- Todos los endpoints de `/api/users` quedan restringidos a rol `ADMIN`.
- `MANAGER`, `CASHIER` y `AUDITOR` no pueden gestionar usuarios en este sprint.

### Infraestructura de autorizacion agregada

- `JwtStrategy`
- `JwtAuthGuard`
- `RolesGuard`
- `@Roles()`
- `@CurrentUser()`

## Endpoints implementados

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`

### Users

- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/deactivate`
- `PATCH /api/users/:id/reactivate`

## Variables de entorno agregadas

Ademas de las variables tecnicas del Sprint 1, Sprint 2 utiliza:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_FIRST_NAME`
- `ADMIN_LAST_NAME`

Estas variables se usan para bootstrap del usuario administrador inicial mediante seed.

## Seed de usuario ADMIN

Se implemento `prisma/seed.ts` para crear un usuario `ADMIN` inicial.

### Comportamiento

- Lee las credenciales y datos del admin desde variables de entorno.
- Hashea la password con `bcrypt`.
- Crea un usuario activo con rol `ADMIN`.
- Si ya existe un usuario con `ADMIN_EMAIL`, no crea duplicados.

### Ejecucion

```bash
npm run prisma:seed
```

### Advertencia

Las credenciales iniciales del usuario administrador son solo para bootstrap. Deben cambiarse antes de usar el sistema fuera de desarrollo local o en cualquier entorno real.

## Casos de error relevantes

- Login invalido: `401 Unauthorized`
- Usuario inactivo en login: `401 Unauthorized`
- Token ausente o invalido en rutas protegidas: `401 Unauthorized`
- Rol insuficiente en rutas protegidas: `403 Forbidden`
- Email duplicado al crear o actualizar usuario: `409 Conflict`
- Usuario inexistente en endpoints administrativos: `404 NotFound`
- Payload invalido: `400 Bad Request`
- Intento de desactivar el ultimo `ADMIN` activo: `409 Conflict`

## Respuesta estandarizada

Las respuestas exitosas de usuario usan un shape consistente y no exponen `passwordHash`.

### User response

```json
{
  "id": "uuid",
  "email": "admin@example.com",
  "firstName": "System",
  "lastName": "Admin",
  "role": "ADMIN",
  "active": true,
  "lastLoginAt": "ISO_DATE_OR_NULL",
  "createdAt": "ISO_DATE",
  "updatedAt": "ISO_DATE"
}
```

### Auth response

```json
{
  "accessToken": "JWT_TOKEN",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "firstName": "System",
    "lastName": "Admin",
    "role": "ADMIN",
    "active": true,
    "lastLoginAt": "ISO_DATE_OR_NULL",
    "createdAt": "ISO_DATE",
    "updatedAt": "ISO_DATE"
  }
}
```

## Criterios de aceptacion del Sprint 2

Sprint 2 se considera aceptado si se cumplen los siguientes puntos:

- Existe modelo `User` en Prisma.
- Existe enum `Role`.
- Se puede generar y aplicar migracion correspondiente.
- Se puede crear un usuario con password hasheada.
- `POST /api/auth/login` devuelve JWT en caso exitoso.
- `GET /api/auth/me` devuelve el usuario autenticado con Bearer token valido.
- `/api/users` queda protegido con JWT y restringido a `ADMIN`.
- No se expone `passwordHash` en respuestas.
- El seed inicial de `ADMIN` funciona y no duplica usuarios.
- Existen tests para flujo critico de `UsersService`, `AuthService` y autorizacion por rol.

## Que NO se implemento todavia

Sprint 2 no implementa aun:

- Productos
- Categorias
- Canales de venta
- Inventario operativo
- Ventas
- Auditoria de negocio completa
- Permisos granulares por accion
- Refresh tokens
- Recuperacion de password
- Revocacion de sesiones
- Multi-tenant o sucursales

La auditoria completa y el resto de modulos funcionales quedaran para sprints posteriores.
