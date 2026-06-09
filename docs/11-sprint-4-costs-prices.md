# Sprint 4 - Costs and Prices

Este documento resume la implementacion tecnica realizada en Sprint 4 para incorporar costos historicos por producto y precios historicos por producto/canal, manteniendo versionado inmediato y sin editar versiones anteriores.

## Objetivo del Sprint 4

El objetivo principal de Sprint 4 es habilitar una primera capa administrativa para:

- registrar costos versionados por producto;
- registrar precios versionados por producto y canal;
- consultar version vigente;
- consultar historial consistente para trazabilidad futura.

Sprint 4 prepara el dominio para que sprints posteriores puedan resolver tickets con snapshots historicos de costo y precio, sin depender de valores actuales del catalogo.

## Politica de vigencias del MVP

En el MVP de Sprint 4, los costos y precios se versionan con una politica simple y estricta.

### Decisiones funcionales

- Los cambios de costo y precio son efectivos inmediatamente.
- No se permiten cargas retroactivas.
- No se permiten costos o precios con vigencia futura.
- Cada producto puede tener un solo costo vigente.
- Cada producto puede tener un solo precio vigente por canal.
- Al crear un nuevo costo, se cierra automaticamente el costo vigente anterior del producto.
- Al crear un nuevo precio, se cierra automaticamente el precio vigente anterior del mismo producto/canal.
- Las versiones cerradas no se editan destructivamente.
- Cambiar costo o precio no modifica datos historicos existentes.
- Los tickets todavia no existen, pero cuando se implementen deberan guardar snapshots historicos de costo y precio.

### Definiciones de vigencia

- `validFrom`: fecha y hora en la que empieza la vigencia de una version.
- `validTo`: fecha y hora en la que termina la vigencia de una version.
- Una version vigente es aquella cuyo `validTo = null`.
- En este sprint, `validFrom` lo asigna el servidor al crear la nueva version.
- En este sprint, el cliente no debe enviar `validFrom` ni `validTo`.

## Modelos agregados

### `ProductCostHistory`

Campos principales:

- `id`: UUID
- `productId`: UUID
- `cost`: decimal
- `validFrom`: `DateTime`
- `validTo`: `DateTime` nullable
- `createdById`: UUID nullable
- `createdAt`: `DateTime`

Relaciones y reglas:

- Pertenece a `Product`.
- Un `Product` puede tener muchas versiones de costo.
- La version vigente se identifica con `validTo = null`.
- La unicidad de “una sola version vigente” se controla por logica transaccional del servicio.

### `ProductPriceHistory`

Campos principales:

- `id`: UUID
- `productId`: UUID
- `salesChannelId`: UUID
- `price`: decimal
- `validFrom`: `DateTime`
- `validTo`: `DateTime` nullable
- `createdById`: UUID nullable
- `createdAt`: `DateTime`

Relaciones y reglas:

- Pertenece a `Product`.
- Pertenece a `SalesChannel`.
- Un `Product` puede tener muchas versiones de precio.
- Un `SalesChannel` puede tener muchas versiones de precio.
- La version vigente se identifica con `validTo = null`.
- La unicidad de “una sola version vigente por producto/canal” se controla por logica transaccional del servicio.

## Reglas de negocio implementadas

### Costos

- Solo se puede crear costo para un producto existente.
- Si el producto no existe, se responde `404 Not Found`.
- Si el producto esta inactivo, no se permite crear nuevo costo.
- `cost` debe ser mayor o igual a `0`.
- El cliente no define `validFrom`, `validTo` ni `createdById`.
- Crear nuevo costo cierra el costo vigente anterior y crea una nueva version vigente.
- Si no existe costo vigente, se crea la primera version.
- El historial se devuelve ordenado por `validFrom desc`.
- No se editan ni eliminan versiones historicas.

### Precios

- Solo se puede crear precio para un producto existente y activo.
- Solo se puede crear precio para un canal existente y activo.
- Si el producto o el canal no existen, se responde `404 Not Found`.
- Si el producto o el canal estan inactivos, no se permite crear nuevo precio.
- `price` debe ser mayor o igual a `0`.
- El cliente no define `validFrom`, `validTo` ni `createdById`.
- Crear nuevo precio cierra el precio vigente anterior del mismo producto/canal y crea una nueva version vigente.
- Cambiar precio en un canal no afecta precios vigentes de otros canales.
- El historial se devuelve ordenado por `validFrom desc`.
- No se editan ni eliminan versiones historicas.

### Integridad transaccional

- La creacion versionada de costos usa transaccion.
- La creacion versionada de precios usa transaccion.
- Si algo falla en la operacion, no debe consolidarse un cierre parcial de la version anterior.

## Roles y permisos aplicados

### Costos

- `ADMIN` y `MANAGER`: crear costos.
- `ADMIN`, `MANAGER` y `AUDITOR`: consultar historial de costos.
- `ADMIN`, `MANAGER` y `AUDITOR`: consultar costo vigente.
- `CASHIER`: no puede crear ni consultar costos.

### Precios

- `ADMIN` y `MANAGER`: crear precios.
- `ADMIN`, `MANAGER` y `AUDITOR`: consultar historial de precios.
- `ADMIN`, `MANAGER`, `AUDITOR` y `CASHIER`: consultar precio vigente por canal.
- `CASHIER`: no puede crear precios ni consultar historial completo.

## Endpoints de costos

Todos los endpoints requieren Bearer token.

- `POST /api/products/:id/costs`
- `GET /api/products/:id/costs`
- `GET /api/products/:id/costs/current`

## Endpoints de precios

Todos los endpoints requieren Bearer token.

- `POST /api/products/:id/prices`
- `GET /api/products/:id/prices`
- `GET /api/products/:id/prices/current?channelId=<uuid>`

## Ejemplos de payload

### Crear costo

```json
{
  "cost": 3000
}
```

### Crear precio

```json
{
  "salesChannelId": "0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4",
  "price": 7000
}
```

## Ejemplos de respuestas

### Costo vigente

```json
{
  "id": "8cc7f7ef-a2b2-4d7f-99c4-7b0fba0eb8ef",
  "productId": "3d7784e2-9df7-4f8f-b3ec-799e271a5f5d",
  "cost": "3000",
  "validFrom": "2026-06-09T03:00:00.000Z",
  "validTo": null,
  "createdById": "c690b6a5-5bec-4b85-98a6-3e5f8318dd29",
  "createdAt": "2026-06-09T03:00:00.000Z",
  "isCurrent": true
}
```

### Precio vigente por canal

```json
{
  "id": "ba9d01f5-99cf-47b8-9a50-75180f27b03a",
  "productId": "3d7784e2-9df7-4f8f-b3ec-799e271a5f5d",
  "salesChannelId": "0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4",
  "salesChannelName": "Mostrador",
  "price": "7000",
  "validFrom": "2026-06-09T03:00:00.000Z",
  "validTo": null,
  "createdById": "c690b6a5-5bec-4b85-98a6-3e5f8318dd29",
  "createdAt": "2026-06-09T03:00:00.000Z",
  "isCurrent": true
}
```

## Casos de error relevantes

- Payload invalido: `400 Bad Request`
- `cost` o `price` negativo: `400 Bad Request`
- `channelId` invalido: `400 Bad Request`
- Producto inexistente: `404 Not Found`
- Canal inexistente: `404 Not Found`
- Producto inactivo al crear costo o precio: `400 Bad Request`
- Canal inactivo al crear precio: `400 Bad Request`
- Token ausente o invalido: `401 Unauthorized`
- Rol insuficiente: `403 Forbidden`
- Costo vigente no encontrado: `404 Not Found`
- Precio vigente no encontrado: `404 Not Found`

## Criterios de aceptacion del Sprint 4

Sprint 4 se considera aceptado si se cumplen los siguientes puntos:

- Existen `ProductCostHistory` y `ProductPriceHistory` en Prisma.
- La migracion correspondiente fue creada.
- Prisma Client fue generado.
- Existen servicios para crear y consultar costos historicos.
- Existen servicios para crear y consultar precios historicos por canal.
- Los endpoints de costos y precios estan protegidos con JWT y roles.
- Crear nuevo costo cierra el anterior sin editar historico.
- Crear nuevo precio cierra solo el anterior del mismo producto/canal.
- El cliente no puede enviar `validFrom` ni `validTo`.
- `GET /products` y `GET /products/:id` no exponen costos ni precios.
- Existen tests unitarios para servicios, DTOs y metadata de roles.

## Que NO se implemento todavia

Sprint 4 no implementa aun:

- stock;
- movimientos de inventario;
- tickets de venta;
- ventas operativas;
- auditoria completa;
- insumos;
- recetas;
- integracion con plataformas externas.

Plan previsto:

- Stock e inventario se implementaran en Sprint 5.
- Tickets de venta se implementaran en Sprint 6.
