# Test de aceptacion de mesas y ordenes

## Objetivo

Validar de punta a punta si el backend alcanza el objetivo funcional completo de mesas y ordenes de consumo:

- administrar mesas;
- abrir una orden sobre una mesa activa;
- asociar la orden a un `SaleTicket` en estado `DRAFT`;
- cargar y modificar consumos sin descontar stock;
- cerrar la orden confirmando la venta;
- descontar stock solamente al cierre;
- registrar movimiento `SALE_OUT`;
- liberar la mesa para una nueva orden.

El test esta en `test/table-orders.acceptance.e2e-spec.ts`.

## Alcance tecnico

El test levanta la aplicacion Nest real con `AppModule`, usa Prisma contra la base configurada y consume la API por HTTP. No usa mocks para la logica principal de mesas, ventas ni inventario.

La preparacion de datos crea usuarios, categoria, canal de venta, producto terminado, costo vigente, precio vigente, stock inicial y mesas aisladas con un prefijo unico por corrida.

## Flujo principal validado

1. Crea una mesa activa por `POST /api/tables`.
2. Lista y obtiene el detalle de la mesa.
3. Abre una orden por `POST /api/tables/:tableId/orders/open`.
4. Verifica que no se pueda abrir una segunda orden simultanea en la misma mesa.
5. Agrega un consumo por `POST /api/table-orders/:id/items`.
6. Verifica snapshots de precio/costo y que el stock no cambie al cargar consumo.
7. Modifica el consumo por `PATCH /api/table-orders/:id/items/:itemId` y vuelve a verificar que el stock no cambie.
8. Cierra la orden por `POST /api/table-orders/:id/close`.
9. Verifica ticket confirmado, snapshots, stock descontado, movimiento `SALE_OUT` y reutilizacion de mesa.

## Casos negativos

- Mesa inactiva rechaza apertura con `409`.
- Doble orden abierta rechaza con `409`.
- Cierre de orden sin items rechaza con `409`.
- Producto sin precio vigente rechaza carga de item.
- Producto sin costo vigente rechaza carga de item.
- Stock insuficiente al cierre mantiene orden `OPEN`, ticket `DRAFT` y stock intacto.
- Cancelar orden abierta no descuenta stock y cancela el ticket asociado.
- Permisos: `401` sin token, `403` para roles no autorizados y lectura permitida para auditor.

## Resultado esperado

Si todo el flujo se cumple, el test pasa y el backend puede considerarse alineado con el objetivo de mesas y ordenes.

Si falta una pieza funcional, el test falla con el encabezado:

```text
OBJETIVO BACKEND NO ALCANZADO
```

Ese fallo es intencional: el test funciona como prueba de aceptacion y debe mostrar exactamente que parte del objetivo falta.

## Requisitos de ejecucion

La base de datos de test debe estar disponible y migrada antes de ejecutar:

```bash
npm run test:e2e
```

Si la base no esta disponible, el test falla rapido con `OBJETIVO BACKEND NO ALCANZADO` y el detalle de conexion.
