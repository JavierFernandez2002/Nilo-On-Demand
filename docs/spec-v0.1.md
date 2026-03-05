# Nilo On-Demand — Spec v0.1 (MVP)
**Rubro:** Impresión 3D on-demand + Service de impresoras  
**Objetivo:** App full-stack deployada (Railway + Vercel) lista para portfolio  
**Stack:** React + Tailwind (Front), Node.js + TypeScript (Back), PostgreSQL + Prisma (DB), Redis (fase 3), JWT (Auth)  
**Última actualización:** v0.1

---

## 1) Visión del producto
**Nilo On-Demand** ofrece un catálogo de modelos 3D imprimibles (sin stock) y permite a usuarios solicitar una orden con opciones (material/color/calidad) y envío.  
Incluye un módulo adicional de **Service de impresoras** para gestionar tickets de reparación/mantenimiento.

---

## 2) Alcance del MVP
### Incluye
- Catálogo con filtros + detalle de producto
- Carrito con ítems configurables (material/color/calidad/notas)
- Checkout con dirección de envío
- Órdenes y estados (seguimiento simple)
- Autenticación (Register/Login) + roles (USER/ADMIN)
- Admin: gestión de productos, cambio de estado de órdenes, tracking de envío
- Service: creación y seguimiento de tickets + admin notes

### No incluye (por ahora)
- Pagos reales (MercadoPago) → **simulado**
- Stock real / inventario
- Cálculo avanzado de precios por volumen/peso (se puede agregar luego)
- Notificaciones por email (fase futura)

---

## 3) Roles
### USER
- Navega catálogo, arma carrito y crea órdenes
- Ve sus órdenes y tickets de service

### ADMIN
- Crea/edita/publica productos y sus imágenes
- Actualiza estados de órdenes y tracking de envío
- Gestiona tickets de service (estado + notas internas)

---

## 4) User Stories (MVP)
### Cliente
1. Como cliente quiero ver un catálogo de modelos disponibles con filtros (categoría, búsqueda, ordenamiento).
2. Como cliente quiero ver el detalle de un modelo con imágenes, descripción y opciones.
3. Como cliente quiero agregar un modelo al carrito configurando material/color/calidad y notas.
4. Como cliente quiero registrarme e iniciar sesión.
5. Como cliente quiero confirmar un checkout con dirección de envío.
6. Como cliente quiero ver mis órdenes y su estado.
7. Como cliente quiero ver el detalle de una orden (ítems, envío, estado).

### Service
8. Como cliente quiero crear un ticket de service de impresora indicando marca/modelo, problema y urgencia.
9. Como cliente quiero ver el estado de mis tickets y el detalle de cada uno.

### Admin
10. Como admin quiero crear/editar/publicar modelos del catálogo con imágenes y categoría.
11. Como admin quiero cambiar el estado de una orden y cargar tracking.
12. Como admin quiero gestionar tickets de service (cambiar estado y agregar notas internas).

---

## 5) Modelo de Datos (PostgreSQL + Prisma)
> Nota: Sin stock. Los productos representan “modelos disponibles para imprimir”.

### Auth
**users**
- id (uuid)
- email (unique)
- passwordHash
- name
- role (USER | ADMIN)
- createdAt

### Catálogo
**categories**
- id
- name
- slug (unique)

**products**
- id
- name
- slug (unique)
- description
- basePrice (numeric)
- active (boolean)
- categoryId (FK)
- createdAt

**productImages**
- id
- productId (FK)
- url
- alt
- position (int)

**productOptions** (opciones predefinidas por producto)
- id
- productId (FK)
- material (PLA | PETG | RESIN | ...)
- color (string)
- quality (DRAFT | STANDARD | HIGH)
- priceDelta (numeric)

### Carrito y Órdenes
**carts**
- id
- userId (FK)
- updatedAt

**cartItems**
- id
- cartId (FK)
- productId (FK)
- quantity (int)
- material (string)
- color (string)
- quality (string)
- notes (text)

**orders**
- id
- userId (FK)
- status (PENDING | CONFIRMED | PRINTING | SHIPPED | DELIVERED | CANCELED)
- totalAmount (numeric)
- shippingAddressJson (jsonb)
- createdAt

**orderItems**
- id
- orderId (FK)
- productId (FK)
- quantity (int)
- unitPrice (numeric)
- material
- color
- quality
- notes

**payments** (simulado)
- id
- orderId (FK)
- provider (SIMULATED | MERCADOPAGO)
- status (PENDING | PAID | FAILED)
- amount (numeric)
- createdAt

**shipments**
- id
- orderId (FK)
- carrier (string)
- trackingCode (string)
- status (LABEL_CREATED | IN_TRANSIT | DELIVERED)
- updatedAt

### Service
**serviceTickets**
- id
- userId (FK)
- printerBrand
- printerModel
- issueText
- urgency (LOW | MEDIUM | HIGH)
- status (RECEIVED | DIAGNOSING | WAITING_PARTS | RESOLVED)
- addressJson (jsonb)
- createdAt

**serviceNotes** (admin)
- id
- ticketId (FK)
- note
- createdAt

---

## 6) API REST (v1)
### Auth
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- GET  `/api/v1/me`

### Catálogo
- GET `/api/v1/products?query=&category=&page=&limit=&sort=`
- GET `/api/v1/products/:slug`
- GET `/api/v1/categories`

### Carrito
- GET    `/api/v1/cart`
- POST   `/api/v1/cart/items`
- PATCH  `/api/v1/cart/items/:id`
- DELETE `/api/v1/cart/items/:id`
- DELETE `/api/v1/cart` (vaciar)

### Órdenes
- POST `/api/v1/orders` (crear desde carrito)
- GET  `/api/v1/orders` (mis órdenes)
- GET  `/api/v1/orders/:id`

### Service Tickets
- POST `/api/v1/service-tickets`
- GET  `/api/v1/service-tickets` (mis tickets)
- GET  `/api/v1/service-tickets/:id`

### Admin (role ADMIN)
- POST  `/api/v1/admin/products`
- PATCH `/api/v1/admin/products/:id`
- POST  `/api/v1/admin/products/:id/images`
- PATCH `/api/v1/admin/orders/:id/status`
- PATCH `/api/v1/admin/shipments/:orderId`
- GET   `/api/v1/admin/service-tickets`
- PATCH `/api/v1/admin/service-tickets/:id/status`
- POST  `/api/v1/admin/service-tickets/:id/notes`

---

## 7) Reglas de negocio (MVP)
- No hay stock: el producto siempre “está disponible” si `active=true`.
- `totalAmount` = suma(orderItems.quantity * unitPrice) + (fees futuros)
- `unitPrice` = basePrice + priceDelta (según opción elegida)
- Una orden nace en `PENDING`
- Admin puede pasar estados de orden en este orden:
  `PENDING -> CONFIRMED -> PRINTING -> SHIPPED -> DELIVERED`  
  o `PENDING/CONFIRMED -> CANCELED`
- Carrito:
  - si el usuario no está logueado, se guarda en localStorage (frontend)
  - si está logueado, se sincroniza con backend

---

## 8) Checklist de aceptación (MVP)
- [ ] Catálogo y detalle funcionando con filtros/búsqueda
- [ ] Carrito con cantidades y opciones
- [ ] Checkout crea orden y limpia carrito
- [ ] Usuario ve “Mis órdenes”
- [ ] Admin crea/edita productos e imágenes
- [ ] Admin cambia estado de orden y carga tracking
- [ ] Tickets de service: crear/ver estado + admin notes
- [ ] Deploy: Front en Vercel, Back + DB en Railway
- [ ] README completo (setup local + variables + endpoints + screenshots)

---

## 9) Roadmap inmediato (v0.2)
- Redis cache catálogo + rate limit login
- Refresh tokens
- Pago real con MercadoPago
- Emails transaccionales (confirmación / tracking)
