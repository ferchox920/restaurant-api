# E2E Test Plan

Sprint 10 no implementa un e2e real con base de datos porque la infraestructura actual no lo soporta de forma mantenible todavia.

## Estado actual

Hoy el proyecto cuenta con:

- tests unitarios;
- smoke tests HTTP livianos;
- compilacion pasando.

Hoy no cuenta con:

- script dedicado para e2e;
- base PostgreSQL aislada para tests;
- `DATABASE_URL` separada para e2e;
- estrategia de reset o migrate por suite;
- fixtures o setup transaccional para Prisma.

Los smoke actuales no sustituyen un flujo e2e real con persistencia.

## Que falta para e2e real

- una base PostgreSQL de test aislada;
- una variable `DATABASE_URL` exclusiva de e2e;
- bootstrap real de `AppModule` contra esa base;
- migraciones aplicadas antes de la suite;
- limpieza de datos entre casos;
- estrategia clara para seed o fixtures.

## Propuesta de infraestructura

### Base de test

- usar un Postgres separado del entorno local de desarrollo;
- ejecutar migraciones sobre esa base antes de correr la suite;
- no reutilizar datos manuales ni productivos.

### Configuracion

- definir `DATABASE_URL` especifica para e2e;
- agregar un script futuro tipo `npm run test:e2e`;
- levantar la app Nest real con `AppModule`.

### Limpieza

Elegir una de estas estrategias y mantenerla consistente:

- reset controlado del schema antes de cada suite;
- truncate ordenado de tablas despues de cada caso;
- schema dedicado por run.

La opcion recomendada es schema o base dedicada por run, para evitar interferencia entre desarrolladores.

## Flujo exacto a cubrir

La futura prueba e2e debe cubrir:

1. login admin;
2. crear categoria;
3. crear canal;
4. crear producto;
5. crear costo;
6. crear precio;
7. agregar stock;
8. crear ticket draft;
9. agregar item;
10. confirmar ticket;
11. verificar ticket `CONFIRMED`;
12. verificar stock descontado;
13. verificar movimiento `SALE_OUT`;
14. verificar audit log de confirmacion si la salida es estable;
15. consultar reporte de ventas por canal;
16. consultar reporte de ventas por producto;
17. hacer void del ticket;
18. verificar ticket `VOIDED`;
19. verificar stock revertido;
20. verificar movimiento `VOID_REVERSAL`.

## Reglas para la futura implementacion

- no depender del seed de desarrollo como unica fuente de datos;
- no usar timestamps fragiles en assertions;
- mantener ids y payloads deterministas;
- limpiar los datos usados por la suite;
- no romper los tests unitarios existentes.

## Relacion con la suite actual

La suite actual verifica:

- piezas unitarias de servicios, DTOs y mappers;
- smoke HTTP de `GET /api`, `GET /health` y `POST /api/auth/login`.

La suite actual no verifica el flujo MVP completo con Prisma y PostgreSQL reales. Ese vacio es el que debe cerrar el futuro `test/mvp-flow.e2e-spec.ts`.
