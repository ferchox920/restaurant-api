# Sprint Tables 1 - Restaurant Table Management

Este documento resume el primer sprint real de la capa de mesas. El alcance queda limitado al CRUD administrativo de mesas del local.

## Objetivo

- Crear la entidad `RestaurantTable`.
- Administrar mesas mediante endpoints protegidos.
- Permitir desactivacion/reactivacion logica.
- Registrar auditoria de mutaciones.
- Sembrar mesas demo de forma idempotente.

## Modelo

`RestaurantTable` contiene:

- `id`: UUID.
- `code`: identificador unico visible para operacion.
- `name`: nombre opcional.
- `area`: sector opcional del local.
- `capacity`: entero positivo opcional.
- `active`: estado administrativo.
- `createdById`: usuario que creo la mesa, si aplica.
- `createdAt` y `updatedAt`.

El estado operativo no se persiste. En este sprint se expone como:

- `AVAILABLE` cuando `active = true`.
- `INACTIVE` cuando `active = false`.

## Endpoints

Todos usan prefijo global `/api` y requieren JWT.

- `GET /api/tables`
- `POST /api/tables`
- `GET /api/tables/:id`
- `PATCH /api/tables/:id`
- `PATCH /api/tables/:id/deactivate`
- `PATCH /api/tables/:id/reactivate`

Filtros de listado:

- `active=true|false`
- `area`
- `search`, sobre `code`, `name` y `area`

## Permisos

Lectura:

- `ADMIN`
- `MANAGER`
- `CASHIER`
- `AUDITOR`

Mutaciones:

- `ADMIN`
- `MANAGER`

`CASHIER` y `AUDITOR` no pueden crear, actualizar, desactivar ni reactivar mesas.

## Reglas

- `code` es obligatorio y unico.
- `name` es opcional.
- `area` es opcional.
- `capacity` debe ser entero positivo si se informa.
- No existe eliminacion fisica de mesas.
- Una mesa inactiva no debe usarse para futuras ordenes.
- Las lecturas no generan audit log.

## Auditoria

Se registran audit logs para:

- `RESTAURANT_TABLE_CREATED`
- `RESTAURANT_TABLE_UPDATED`
- `RESTAURANT_TABLE_DEACTIVATED`
- `RESTAURANT_TABLE_REACTIVATED`

## Seeds

El seed crea de forma idempotente:

- `M01`
- `M02`
- `M03`
- `Barra 01`
- `Terraza 01`

## Fuera De Alcance

No se implementa todavia:

- apertura de ordenes;
- carga de consumos;
- cierre de mesa;
- conversion a venta;
- pagos;
- caja;
- reservas;
- cambio de mesa;
- division de cuenta.

## Validacion Esperada

Antes de cerrar el sprint:

```bash
npm run build
npm run test
```

`npm run lint` puede ejecutarse manualmente, pero el script actual usa `--fix` y por lo tanto puede modificar archivos.
