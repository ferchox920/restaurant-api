# Post-Deploy Checklist

Checklist manual para validar que el deploy quedo operativo despues de publicar la API. Reemplazar placeholders antes de ejecutar:

- `<BASE_URL>`
- `<ACCESS_TOKEN>`
- `<PRODUCT_ID>`
- `<CHANNEL_ID>`
- `<TICKET_ID>`

## 1. Verificar servicio vivo

- [ ] `GET /health` responde `200`.

```bash
curl -i <BASE_URL>/health
```

## 2. Verificar metadata publica

- [ ] `GET /api` responde `200`.
- [ ] La respuesta incluye `service`, `version`, `status`, `docs`, `health` y `environment`.

```bash
curl -i <BASE_URL>/api
```

## 3. Verificar readiness de base de datos

- [ ] `GET /health/readiness` responde `200` si la base esta disponible.
- [ ] Si falla, revisar conectividad o migraciones antes de abrir trafico.

```bash
curl -i <BASE_URL>/health/readiness
```

## 4. Verificar Swagger

- [ ] Si `SWAGGER_ENABLED=true`, `GET /docs` responde `200`.
- [ ] Si `SWAGGER_ENABLED=false`, `/docs` no debe quedar expuesto.

```bash
curl -i <BASE_URL>/docs
```

## 5. Verificar login

- [ ] `POST /api/auth/login` responde `200`.
- [ ] La respuesta entrega `accessToken` y usuario sanitizado sin `passwordHash`.

```bash
curl -i -X POST <BASE_URL>/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"<ADMIN_EMAIL>\",\"password\":\"<ADMIN_PASSWORD>\"}"
```

## 6. Verificar seed demo o datos base

- [ ] Listar categorias.
- [ ] Listar canales de venta.
- [ ] Listar productos demo si el seed demo fue ejecutado.

```bash
curl -i <BASE_URL>/api/categories -H "Authorization: Bearer <ACCESS_TOKEN>"
curl -i <BASE_URL>/api/sales-channels -H "Authorization: Bearer <ACCESS_TOKEN>"
curl -i <BASE_URL>/api/products -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## 7. Verificar inventario y stock report

- [ ] `GET /api/reports/stock` responde `200`.
- [ ] Si hubo seed demo, confirmar que existan productos inventariables con stock esperado.

```bash
curl -i "<BASE_URL>/api/reports/stock?stockManagementType=FINISHED_PRODUCT" ^
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## 8. Verificar flujo minimo de venta

- [ ] Crear ticket.
- [ ] Agregar item.
- [ ] Confirmar ticket.
- [ ] Validar stock descontado.
- [ ] Validar movimiento `SALE_OUT`.
- [ ] Validar audit log de confirmacion.
- [ ] Validar reportes.

```bash
curl -i -X POST <BASE_URL>/api/sales/tickets ^
  -H "Authorization: Bearer <ACCESS_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"salesChannelId\":\"<CHANNEL_ID>\",\"notes\":\"Post-deploy smoke sale\"}"
```

```bash
curl -i -X POST <BASE_URL>/api/sales/tickets/<TICKET_ID>/items ^
  -H "Authorization: Bearer <ACCESS_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"productId\":\"<PRODUCT_ID>\",\"quantity\":1}"
```

```bash
curl -i -X POST <BASE_URL>/api/sales/tickets/<TICKET_ID>/confirm ^
  -H "Authorization: Bearer <ACCESS_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{}"
```

```bash
curl -i <BASE_URL>/api/inventory/products/<PRODUCT_ID> ^
  -H "Authorization: Bearer <ACCESS_TOKEN>"
curl -i <BASE_URL>/api/inventory/products/<PRODUCT_ID>/movements ^
  -H "Authorization: Bearer <ACCESS_TOKEN>"
curl -i "<BASE_URL>/api/audit-logs?entityType=SALE_TICKET&entityId=<TICKET_ID>" ^
  -H "Authorization: Bearer <ACCESS_TOKEN>"
curl -i "<BASE_URL>/api/reports/sales-by-product?productId=<PRODUCT_ID>&salesChannelId=<CHANNEL_ID>" ^
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## 9. Verificar void de ticket confirmado

- [ ] Anular ticket confirmado.
- [ ] Validar stock revertido.
- [ ] Validar movimiento `VOID_REVERSAL`.
- [ ] Validar audit log de void.

```bash
curl -i -X POST <BASE_URL>/api/sales/tickets/<TICKET_ID>/void ^
  -H "Authorization: Bearer <ACCESS_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"reason\":\"Post-deploy void validation\"}"
```

```bash
curl -i <BASE_URL>/api/inventory/products/<PRODUCT_ID> ^
  -H "Authorization: Bearer <ACCESS_TOKEN>"
curl -i <BASE_URL>/api/inventory/products/<PRODUCT_ID>/movements ^
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## 10. Verificar seguridad

- [ ] Endpoint protegido sin token devuelve `401`.
- [ ] Usuario con rol insuficiente recibe `403`.
- [ ] Swagger puede apagarse por variable.

```bash
curl -i <BASE_URL>/api/users
```

- [ ] Repetir sobre un endpoint administrativo con un token valido de rol insuficiente y confirmar `403`.

```bash
curl -i <BASE_URL>/api/users -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## 11. Verificar CORS desde cliente autorizado

- [ ] El cliente autorizado recibe headers CORS correctos.
- [ ] Un origen no autorizado no queda habilitado si `CORS_ENABLED=true`.

```bash
curl -i <BASE_URL>/api ^
  -H "Origin: https://allowed-client.example.com"
```

## 12. Verificar logs basicos en plataforma

- [ ] Revisar logs del servicio en Railway u otra plataforma.
- [ ] Confirmar que no haya errores de arranque, migracion o Prisma Client.
- [ ] Confirmar que no se impriman JWT, passwords ni connection strings completas.

## 13. Verificar que no hay secretos expuestos

- [ ] Las respuestas HTTP no incluyen `passwordHash`.
- [ ] Audit logs no muestran tokens ni passwords.
- [ ] README, docs y Swagger no exponen credenciales reales.
- [ ] El deploy no publica `.env` ni secretos por error.
