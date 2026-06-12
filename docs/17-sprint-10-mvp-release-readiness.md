# Sprint 10 - MVP Release Readiness

## Objetivo del Sprint 10

Sprint 10 cierra el MVP a nivel tecnico y documental. No agrega modulos grandes de negocio. Su foco es estabilizar lo ya implementado, ordenar el contrato publico de la API y dejar una guia de entrega verificable.

## Politica de cierre MVP

1. Sprint 10 no agrega modulos grandes de negocio.
2. Sprint 10 estabiliza lo ya implementado.
3. El MVP se considera entregable si la API permite:
   - autenticar usuarios;
   - gestionar usuarios;
   - gestionar categorias;
   - gestionar canales de venta;
   - gestionar productos;
   - definir costos historicos;
   - definir precios historicos por canal;
   - manejar inventario de producto finalizado;
   - crear tickets `DRAFT`;
   - agregar lineas con snapshots;
   - confirmar ventas;
   - descontar stock;
   - anular ventas confirmadas;
   - revertir stock;
   - consultar auditoria;
   - consultar reportes basicos.
4. El MVP no incluye frontend.
5. El MVP no incluye pagos ni caja.
6. El MVP no incluye facturacion fiscal.
7. El MVP no incluye insumos ni recetas.
8. El MVP no incluye proveedores ni compras.
9. El MVP no incluye exportaciones.
10. El MVP no incluye multi-sucursal.
11. El MVP debe poder levantarse localmente con PostgreSQL.
12. El MVP debe tener documentacion clara de variables de entorno.
13. El MVP debe tener seed minimo funcional.
14. El MVP debe tener Swagger usable.
15. El MVP debe tener Dockerfile valido.
16. El MVP debe pasar build y tests.
17. El MVP debe tener un flujo demo end-to-end documentado.

## Criterios globales de aceptacion MVP

- La aplicacion inicia con variables validas y expone `GET /health`.
- La aplicacion expone `GET /api` como metadata publica simple, sin secretos ni autenticacion.
- Swagger queda disponible en `GET /docs` cuando `SWAGGER_ENABLED=true`.
- El login funciona con `POST /api/auth/login`.
- Los endpoints documentados usan prefijo `/api`, excepto `GET /health` y `GET /docs`.
- El seed minimo crea o conserva un usuario `ADMIN` y catalogos base sin duplicar datos.
- Se puede ejecutar una demo guiada que cubra catalogo, precios, inventario, ticket `DRAFT`, confirmacion, auditoria y reportes.
- El Dockerfile compila la aplicacion y queda apto para uso en entorno de deploy futuro.
- `npm run build` pasa.
- `npm run test` pasa.

## Estado tecnico consolidado

- Base: `NestJS` + `TypeScript`.
- Persistencia: `PostgreSQL` + `Prisma`.
- Seguridad: JWT + roles `ADMIN`, `MANAGER`, `CASHIER`, `AUDITOR`.
- Modulos implementados:
  - `auth`
  - `users`
  - `categories`
  - `sales-channels`
  - `products`
  - `inventory`
  - `sales`
  - `audit`
  - `reports`
- Endpoints tecnicos:
  - `GET /api`
  - `GET /health`
  - `GET /docs`

## Variables de entorno requeridas

Variables de runtime:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `SWAGGER_ENABLED`

Variables del seed:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_FIRST_NAME`
- `ADMIN_LAST_NAME`

## Seed minimo funcional

El seed del MVP debe:

- crear o conservar el usuario `ADMIN` inicial;
- crear categorias base;
- crear canales de venta base;
- no duplicar el `ADMIN`;
- no duplicar categorias ni canales;
- no depender de datos manuales previos.

El seed no precarga el flujo completo de ventas. La demo se completa con carga manual guiada.

## Flujo demo end-to-end documentado

1. Levantar PostgreSQL local con `docker compose up -d` o una instancia propia.
2. Configurar `.env` desde `.env.example`.
3. Ejecutar `npm run prisma:generate`.
4. Ejecutar `npm run prisma:migrate`.
5. Ejecutar `npm run prisma:seed`.
6. Iniciar la API con `npm run start:dev`.
7. Verificar `GET /health`.
8. Verificar `GET /api`.
9. Abrir `GET /docs`.
10. Hacer login con el usuario `ADMIN` del seed.
11. Crear categoria, canal y producto si hace falta.
12. Cargar costo historico y precio por canal.
13. Ingresar stock inicial.
14. Crear ticket `DRAFT`.
15. Agregar items al ticket.
16. Confirmar venta y verificar `SALE_OUT`.
17. Consultar auditoria y reportes.
18. Anular una venta confirmada y verificar `VOID_REVERSAL`.

## Checklist de release local

- `.env.example` existe y cubre las variables necesarias.
- `README.md` refleja el estado real hasta Sprint 10.
- Existe la carpeta `docs` con documentos de Sprint 0 a Sprint 10.
- `Dockerfile` existe y compila.
- `.dockerignore` existe.
- `prisma/seed.ts` existe y cubre seed minimo funcional.
- Swagger esta configurado.
- `GET /api` responde metadata publica simple.
- `GET /health` responde liveness.
- Los modulos principales estan registrados en `AppModule`.
- `npm run build` pasa.
- `npm run test` pasa.

## Decisiones de contrato publico

- `GET /api` se mantiene como endpoint informativo del sistema.
- `GET /api` no es health check.
- `GET /health` sigue siendo liveness.
- Swagger y README forman parte del contrato publico de entrega del MVP.
- Auditoria complementa la trazabilidad del sistema y no reemplaza historiales de negocio como costos, precios, stock o snapshots de venta.

## Lo que sigue fuera de Sprint 10

- pagos;
- caja;
- facturacion fiscal;
- exportacion Excel/PDF;
- dashboard visual;
- reembolsos;
- anulaciones parciales;
- insumos;
- recetas;
- proveedores;
- compras;
- multi-sucursal;
- reportes financieros avanzados.
