# MVP Demo Flow

Guia para probar el MVP de punta a punta usando la API y los endpoints reales bajo `/api`.

## Requisitos previos

- PostgreSQL disponible.
- Variables de entorno configuradas.
- Migraciones aplicadas.
- Seed ejecutado.
- Aplicacion corriendo.

Comandos de preparacion:

```bash
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

## Flujo usando seed

El seed deja listos:

- `ADMIN` inicial;
- categorias base;
- canales base;
- productos demo;
- costos demo;
- precios demo por canal;
- stock inicial de productos inventariables.

Si configuraste variables opcionales, tambien deja usuarios demo `MANAGER`, `CASHIER` y `AUDITOR`.

Advertencias:

- este seed demo esta pensado para `local` o `demo/staging`;
- no debe ejecutarse por defecto en produccion real;
- las credenciales de ejemplo deben reemplazarse por valores propios del entorno.

## 1. Login como ADMIN

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "<ADMIN_EMAIL>",
  "password": "<ADMIN_PASSWORD>"
}
```

Guardar el token y usarlo en el resto del flujo:

```text
Authorization: Bearer <ACCESS_TOKEN>
```

## 2. Crear o usar categoria

Si usas seed, podes reutilizar `Hamburguesas`, `Papas`, `Bebidas` o `Promociones`.

Si queres crear una nueva:

```http
POST /api/categories
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

```json
{
  "name": "Combos"
}
```

## 3. Crear o usar canal de venta

Si usas seed, podes reutilizar `Mostrador`, `PedidosYa`, `Uber Eats` o `WhatsApp`.

Creacion manual:

```http
POST /api/sales-channels
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

```json
{
  "name": "Canal Demo",
  "code": "DEMO_CHANNEL",
  "commissionType": "NONE",
  "commissionValue": 0
}
```

## 4. Crear o usar producto

El seed ya crea productos demo. Si queres crear uno nuevo:

```http
POST /api/products
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

```json
{
  "name": "Producto Demo",
  "description": "Producto creado durante la prueba manual.",
  "sku": "DEMO-001",
  "categoryId": "<CATEGORY_ID>",
  "unit": "UNIT",
  "stockManagementType": "FINISHED_PRODUCT"
}
```

## 5. Definir costo historico

```http
POST /api/products/<PRODUCT_ID>/costs
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

```json
{
  "cost": 3500
}
```

## 6. Definir precio por canal

```http
POST /api/products/<PRODUCT_ID>/prices
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

```json
{
  "salesChannelId": "<CHANNEL_ID>",
  "price": 8000
}
```

## 7. Agregar stock

Si usas los productos demo inventariables, el seed ya deja stock inicial. Para carga manual:

```http
POST /api/inventory/products/<PRODUCT_ID>/stock-in
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

```json
{
  "quantity": 10,
  "reason": "Seed inicial MVP"
}
```

## 8. Crear ticket DRAFT

```http
POST /api/sales/tickets
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

```json
{
  "salesChannelId": "<CHANNEL_ID>",
  "notes": "Pedido demo MVP"
}
```

Guardar `<TICKET_ID>`.

## 9. Agregar item al ticket

```http
POST /api/sales/tickets/<TICKET_ID>/items
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

```json
{
  "productId": "<PRODUCT_ID>",
  "quantity": 2
}
```

## 10. Confirmar ticket

```http
POST /api/sales/tickets/<TICKET_ID>/confirm
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

```json
{}
```

## 11. Verificar que el ticket quedo CONFIRMED

```http
GET /api/sales/tickets/<TICKET_ID>
Authorization: Bearer <ACCESS_TOKEN>
```

Confirmar que `status` sea `CONFIRMED`.

## 12. Ver que el stock bajo

```http
GET /api/inventory/products/<PRODUCT_ID>
Authorization: Bearer <ACCESS_TOKEN>
```

Verificar que `currentStock` sea menor al valor previo.

## 13. Ver movimiento SALE_OUT

```http
GET /api/inventory/products/<PRODUCT_ID>/movements
Authorization: Bearer <ACCESS_TOKEN>
```

Verificar un movimiento con:

- `movementType = SALE_OUT`
- `referenceType = SALE_TICKET`
- `referenceId = <TICKET_ID>`

## 14. Ver audit log de confirmacion

```http
GET /api/audit-logs?entityType=SALE_TICKET&entityId=<TICKET_ID>
Authorization: Bearer <ACCESS_TOKEN>
```

Buscar una entrada con `action = SALE_TICKET_CONFIRMED`.

## 15. Consultar reporte de ventas por canal

```http
GET /api/reports/sales-by-channel?salesChannelId=<CHANNEL_ID>
Authorization: Bearer <ACCESS_TOKEN>
```

## 16. Consultar reporte de ventas por producto

```http
GET /api/reports/sales-by-product?productId=<PRODUCT_ID>&salesChannelId=<CHANNEL_ID>
Authorization: Bearer <ACCESS_TOKEN>
```

## 17. Anular venta confirmada

```http
POST /api/sales/tickets/<TICKET_ID>/void
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

```json
{
  "reason": "Void de prueba MVP"
}
```

## 18. Ver que el stock volvio

```http
GET /api/inventory/products/<PRODUCT_ID>
Authorization: Bearer <ACCESS_TOKEN>
```

Verificar que el stock haya vuelto al valor previo a la confirmacion.

## 19. Ver movimiento VOID_REVERSAL

```http
GET /api/inventory/products/<PRODUCT_ID>/movements
Authorization: Bearer <ACCESS_TOKEN>
```

Verificar un movimiento con:

- `movementType = VOID_REVERSAL`
- `referenceType = SALE_VOID`
- `referenceId = <TICKET_ID>`

## 20. Ver audit log de void

```http
GET /api/audit-logs?entityType=SALE_TICKET&entityId=<TICKET_ID>
Authorization: Bearer <ACCESS_TOKEN>
```

Buscar una entrada con `action = SALE_TICKET_VOIDED`.

## 21. Consultar reporte de stock

```http
GET /api/reports/stock?stockManagementType=FINISHED_PRODUCT
Authorization: Bearer <ACCESS_TOKEN>
```

## Flujo creando datos manualmente

Si no configuraste usuarios demo opcionales:

1. hacer login como `ADMIN`;
2. crear `MANAGER`, `CASHIER` o `AUDITOR` con `POST /api/users`;
3. repetir el flujo con esos usuarios segun el rol que quieras validar.

Ejemplo de creacion de usuario:

```http
POST /api/users
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

```json
{
  "email": "<DEMO_USER_EMAIL>",
  "password": "<DEMO_USER_PASSWORD>",
  "firstName": "Demo",
  "lastName": "Cashier",
  "role": "CASHIER"
}
```
