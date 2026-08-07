# Integracion Mercado Pago Checkout API Orders

## Alcance

La API integra Mercado Pago Checkout API mediante Orders online en modo
`automatic`. El frontend tokeniza la tarjeta con MercadoPago.js o Card Payment
Brick. La API nunca recibe datos crudos de tarjeta y nunca acepta el importe
calculado por el cliente.

El backend:

1. valida que el ticket este en `DRAFT`, tenga items y un total positivo;
2. toma importe, descripcion e items desde los snapshots del ticket;
3. crea una Order con `X-Idempotency-Key`;
4. persiste el estado y la transaccion sin guardar el CardToken;
5. confirma el ticket con `paymentMethod=MERCADO_PAGO` cuando la Order queda
   `processed/accredited`;
6. recibe Webhooks firmados y vuelve a consultar la Order antes de actualizar
   el estado local.

Los reembolsos no anulan automaticamente el ticket ni revierten inventario. Se
registran en `reconciliationError` para revision operativa.

## Configuracion

```dotenv
MERCADO_PAGO_ENABLED=true
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...
MERCADO_PAGO_WEBHOOK_SECRET=...
MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS=300
MERCADO_PAGO_CURRENCY=ARS
MERCADO_PAGO_STATEMENT_DESCRIPTOR=RESTAURANTE
```

El Access Token y el secreto Webhook son privados y solo pertenecen al backend.
La Public Key usada por MercadoPago.js debe configurarse en el frontend.

## Crear una Order

```http
POST /api/integrations/mercado-pago/tickets/{ticketId}/orders
Authorization: Bearer {jwt}
Idempotency-Key: {uuid-generado-por-el-cliente}
Content-Type: application/json
```

```json
{
  "cardToken": "token-generado-por-mercadopago-js",
  "paymentMethodId": "master",
  "paymentTypeId": "credit_card",
  "installments": 1,
  "payerEmail": "comprador@testuser.com",
  "payerFirstName": "Maria",
  "payerLastName": "Gonzalez",
  "identificationType": "DNI",
  "identificationNumber": "12345678"
}
```

La misma clave de idempotencia y el mismo body devuelven la respuesta anterior.
No debe reutilizarse la clave para otro intento o ticket. Un CardToken es de un
solo uso; para un nuevo intento de cobro el frontend debe generar otro token y
otra clave.

## Webhook

Configurar en Tus integraciones de Mercado Pago el evento **Order (Mercado
Pago)** con una URL HTTPS publica:

```text
https://api.example.com/api/integrations/mercado-pago/webhooks/orders
```

El receptor exige:

- query param `data.id`;
- headers `x-signature` y `x-request-id`;
- body con `type=order` y el mismo `data.id`;
- firma valida dentro de la tolerancia configurada.

Después de validar la firma, la API obtiene `/v1/orders/{id}` con el Access
Token. No confia en el estado incluido en el body del Webhook.

## Estados y operacion

- `processed/accredited`: confirma el ticket y descuenta stock.
- pendiente o con autenticacion adicional: conserva el ticket en `DRAFT`; un
  Webhook o `POST /orders/:id/refresh` continuara la reconciliacion.
- rechazado/fallido: conserva el ticket en `DRAFT`, permitiendo un nuevo intento.
- reembolsado: registra una alerta; un administrador debe decidir si anula el
  ticket para revertir inventario.
- pago acreditado sin stock suficiente: conserva el pago y registra
  `reconciliationError`; requiere resolucion operativa inmediata.

## Pruebas antes de produccion

1. Usar usuarios y tarjetas de prueba de Mercado Pago.
2. Verificar aprobacion, rechazo y pago pendiente.
3. Simular el Webhook desde Tus integraciones.
4. Confirmar que una repeticion no duplica Orders ni movimientos de stock.
5. Simular falta de stock entre creacion del ticket y acreditacion.
6. Verificar el tratamiento manual de un reembolso.

## Puerta automatica de regresion

Ejecutar:

```bash
npm run test:mercado-pago
```

La configuracion dedicada falla si el modulo baja de 90% de cobertura en
sentencias o lineas, 75% en ramas o 95% en funciones. La suite incluye contrato
HTTP, validacion de DTOs, firma HMAC real, idempotencia, estados de pago,
conciliacion con tickets y aislamiento del importe calculado por el backend.
