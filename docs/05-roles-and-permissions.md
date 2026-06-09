# Roles and Permissions

Este documento define los roles iniciales del sistema y sus permisos funcionales dentro del MVP de la API administrativa del restaurante. La intencion es establecer una primera capa de autorizacion orientada a negocio, suficiente para operar el MVP sin llegar todavia a un esquema granular de permisos tecnicos.

## Objetivo del Documento

- Definir los roles iniciales del MVP.
- Delimitar que acciones puede ejecutar cada perfil.
- Establecer restricciones basicas de segregacion de responsabilidades.
- Servir como base para una futura evolucion hacia permisos mas granulares.

## Roles Iniciales del MVP

- `ADMIN`
- `MANAGER`
- `CASHIER`
- `AUDITOR`

## Principios Generales de Autorizacion

- Toda accion critica debe quedar asociada a un usuario responsable.
- Los permisos del MVP se asignan inicialmente por rol.
- Los roles definidos en este documento son iniciales y pueden evolucionar.
- Las acciones de lectura y escritura deben diferenciarse claramente.
- Los roles operativos no deben tener acceso innecesario a configuraciones sensibles.

## 1. ADMIN

**Descripcion**

Es el rol con mayor nivel de acceso funcional dentro del MVP. Administra configuraciones maestras, operaciones sensibles, usuarios y visibilidad completa del sistema.

**Que puede hacer**

- Gestionar usuarios.
- Crear y editar productos.
- Crear y editar categorias.
- Crear y editar canales de venta.
- Definir costos historicos.
- Definir precios historicos por canal.
- Gestionar stock mediante movimientos validos.
- Crear tickets.
- Confirmar tickets.
- Anular tickets.
- Ver reportes.
- Ver auditoria.

**Que no deberia poder hacer**

- No deberia omitir trazabilidad en acciones criticas.
- No deberia modificar stock por fuera del mecanismo de movimientos.
- No deberia eliminar fisicamente entidades con historial operativo relevante.

**Ejemplos de acciones permitidas**

- Crear un nuevo usuario para caja.
- Registrar un nuevo costo vigente de un producto.
- Cargar stock inicial con un movimiento `STOCK_IN`.
- Anular un ticket confirmado indicando motivo.

## 2. MANAGER

**Descripcion**

Es un rol de gestion operativa con capacidad para administrar catalogo, inventario y ventas. Su alcance es amplio en la operacion diaria, pero no necesariamente incluye administracion total del sistema.

**Que puede hacer**

- Crear y editar productos.
- Gestionar stock mediante movimientos.
- Definir precios y costos si el negocio lo permite.
- Crear tickets.
- Confirmar tickets.
- Anular tickets con motivo.
- Ver reportes operativos.

**Que no deberia poder hacer**

- No deberia crear ni administrar usuarios, salvo que el negocio lo habilite expresamente en una etapa posterior.
- No deberia alterar auditoria.
- No deberia eliminar fisicamente productos, canales o usuarios con historial.

**Ejemplos de acciones permitidas**

- Crear un nuevo producto de temporada.
- Registrar una merma mediante `WASTE`.
- Confirmar un ticket de venta en mostrador.
- Anular una venta confirmada por error operativo, dejando motivo.

**Nota funcional**

La capacidad de definir costos y precios para `MANAGER` debe tratarse como politica configurable del negocio. En algunos restaurantes puede estar permitida y en otros reservada a `ADMIN`.

## 3. CASHIER

**Descripcion**

Es el rol operativo de caja o venta diaria. Su foco principal es registrar tickets y cerrar ventas dentro de los limites definidos por el negocio.

**Que puede hacer**

- Crear tickets.
- Agregar productos a tickets.
- Modificar tickets en estado `DRAFT`.
- Confirmar tickets.
- Ver sus propias ventas o ventas operativas basicas, segun la politica final.

**Que no deberia poder hacer**

- No deberia modificar costos.
- No deberia modificar precios.
- No deberia crear usuarios.
- No deberia gestionar roles.
- No deberia realizar ajustes administrativos de inventario.
- No deberia anular tickets confirmados salvo que el negocio lo habilite de manera excepcional.
- No deberia acceder a auditoria completa.

**Ejemplos de acciones permitidas**

- Crear un ticket para una venta en mostrador.
- Agregar 2 bebidas y 1 hamburguesa a un ticket.
- Confirmar el ticket si hay stock suficiente.
- Consultar ventas del turno o ventas propias si la politica lo permite.

## 4. AUDITOR

**Descripcion**

Es un rol de consulta y control. No participa de la operacion diaria modificando datos, sino revisando informacion historica y trazabilidad.

**Que puede hacer**

- Consultar ventas.
- Consultar stock.
- Consultar movimientos de inventario.
- Consultar auditoria.

**Que no deberia poder hacer**

- No puede modificar datos.
- No puede crear tickets.
- No puede confirmar tickets.
- No puede anular tickets.
- No puede definir costos ni precios.
- No puede gestionar stock.
- No puede crear ni editar usuarios.

**Ejemplos de acciones permitidas**

- Revisar ventas anuladas de una fecha determinada.
- Consultar movimientos de inventario de un producto.
- Ver quien modifico un precio historico.
- Analizar trazabilidad de confirmaciones y anulaciones.

## Permisos por Modulo

### Usuarios y Roles

- `ADMIN`: si
- `MANAGER`: no
- `CASHIER`: no
- `AUDITOR`: solo lectura si el negocio lo permite

### Productos y Categorias

- `ADMIN`: crear, editar, consultar
- `MANAGER`: crear, editar, consultar
- `CASHIER`: consulta limitada para venta
- `AUDITOR`: solo lectura

### Canales de Venta

- `ADMIN`: crear, editar, consultar
- `MANAGER`: consulta; edicion solo si el negocio lo habilita
- `CASHIER`: consulta limitada al uso operativo
- `AUDITOR`: solo lectura

### Costos Historicos

- `ADMIN`: crear y consultar
- `MANAGER`: crear y consultar si el negocio lo permite
- `CASHIER`: no
- `AUDITOR`: solo lectura

### Precios Historicos por Canal

- `ADMIN`: crear y consultar
- `MANAGER`: crear y consultar si el negocio lo permite
- `CASHIER`: no
- `AUDITOR`: solo lectura

### Inventario

- `ADMIN`: gestionar movimientos y consultar stock
- `MANAGER`: gestionar movimientos y consultar stock
- `CASHIER`: consulta operativa limitada si el negocio lo permite
- `AUDITOR`: solo lectura

### Tickets de Venta

- `ADMIN`: crear, confirmar, anular, consultar
- `MANAGER`: crear, confirmar, anular, consultar
- `CASHIER`: crear, confirmar y consultar ventas operativas basicas
- `AUDITOR`: solo lectura

### Reportes y Auditoria

- `ADMIN`: lectura completa
- `MANAGER`: reportes operativos; auditoria segun necesidad del negocio
- `CASHIER`: reportes operativos basicos propios o del turno si aplica
- `AUDITOR`: lectura completa

## Matriz Resumida Rol-Permiso

| Modulo o accion | ADMIN | MANAGER | CASHIER | AUDITOR |
| --- | --- | --- | --- | --- |
| Gestionar usuarios | Si | No | No | No |
| Gestionar roles | Si | No | No | No |
| Crear y editar productos | Si | Si | No | No |
| Crear y editar categorias | Si | Si | No | No |
| Crear y editar canales | Si | Parcial | No | No |
| Definir costos | Si | Parcial | No | No |
| Definir precios | Si | Parcial | No | No |
| Gestionar stock | Si | Si | No | No |
| Crear tickets | Si | Si | Si | No |
| Confirmar tickets | Si | Si | Si | No |
| Anular tickets | Si | Si | No | No |
| Ver ventas | Si | Si | Parcial | Si |
| Ver reportes | Si | Si | Parcial | Si |
| Ver auditoria | Si | Parcial | No | Si |

`Parcial` indica que depende de la politica del negocio o del alcance especifico definido para la operacion.

## Restricciones Especiales

- Ningun rol debe poder modificar stock fuera del mecanismo de movimientos.
- Ningun rol debe poder alterar tickets historicos ya confirmados para cambiar snapshots de nombre, costo o precio.
- Las anulaciones de tickets confirmados deben exigir motivo y usuario responsable.
- Las entidades con historial no deben eliminarse fisicamente; deben desactivarse.
- La visibilidad de ventas para `CASHIER` puede limitarse a ventas propias, del turno o de caja segun decision operativa.

## Evolucion Futura

Estos roles son iniciales y mas adelante podrian evolucionar hacia permisos granulares, por ejemplo:

- `products:create`
- `products:update`
- `sales:create`
- `sales:confirm`
- `sales:void`
- `inventory:adjust`
- `inventory:read`
- `reports:read`
- `audit:read`
- `users:create`

Un modelo granular permitiria separar mejor capacidades y adaptar el sistema a restaurantes con estructuras operativas distintas.

## Pendientes de Definicion

- Definir si `MANAGER` puede siempre editar costos y precios o si eso quedara restringido a `ADMIN`.
- Definir si `CASHIER` podra consultar stock en tiempo real o solo recibir validacion al confirmar.
- Definir si `AUDITOR` podra consultar usuarios y roles o solo eventos de auditoria y ventas.
