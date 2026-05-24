# Allo Inventory Reservation

Temporary inventory reservation system for checkout flows. The app reserves stock while payment is pending so multiple customers cannot oversell the same warehouse inventory.

## Tech Stack

- Next.js App Router
- TypeScript
- Prisma
- Hosted Postgres / Neon
- Tailwind CSS / shadcn-style UI

## Features

- Product listing
- Warehouse listing
- Stock levels with total, reserved, and available units
- Create reservations
- Confirm reservations
- Release reservations
- Expiry handling for pending reservations
- Visible JSON errors for 409 and 410 cases
- Concurrency-safe reservation logic

## API

### `GET /api/products`

Returns products with per-warehouse stock information. Each stock row includes total units, reserved units, available units, and warehouse details.

### `GET /api/warehouses`

Returns all warehouses.

### `POST /api/reservations`

Creates a pending reservation.

Request body:

```json
{
  "productId": "product_id",
  "warehouseId": "warehouse_id",
  "quantity": 1
}
```

If there is not enough available stock, the API returns:

```json
{
  "error": "NOT_ENOUGH_STOCK",
  "message": "Not enough stock available"
}
```

### `GET /api/reservations/:id`

Returns reservation details with product and warehouse information. Returns 404 if the reservation does not exist.

### `POST /api/reservations/:id/confirm`

Confirms a pending reservation. If the reservation has expired, the API releases it and returns:

```json
{
  "error": "RESERVATION_EXPIRED",
  "message": "Reservation has expired"
}
```

### `POST /api/reservations/:id/release`

Releases a pending reservation and returns reserved units to available stock. Already released reservations return the existing reservation. Confirmed reservations return 409.

## Local Setup

```bash
npm install
```

Create `.env` with a hosted Postgres connection string:

```bash
DATABASE_URL="postgresql://..."
```

Run migrations and seed data:

```bash
npx prisma migrate dev
npx prisma db seed
```

Start the app:

```bash
npm run dev
```

## Database Setup

This project requires hosted Postgres. `DATABASE_URL` should point to a Postgres database such as Neon, Supabase, or Railway Postgres.

## Concurrency Model

Reservation creation uses a database transaction plus an atomic conditional `StockLevel` update. `reservedUnits` is increased only when:

```sql
totalUnits - reservedUnits >= requested quantity
```

If no stock row is updated, the API returns 409 `NOT_ENOUGH_STOCK`. This prevents two simultaneous requests from reserving the same last unit.

## Expiry Mechanism

The app uses lazy cleanup. Before important reads and writes, expired `PENDING` reservations are marked `RELEASED`, and their reserved units are returned to stock. This keeps the implementation simple for the take-home project.

In production, this could be complemented with Vercel Cron or a background worker to release expired reservations on a schedule.

## Trade-offs

- Redis is not implemented.
- Idempotency keys are not implemented.
- Lazy cleanup was chosen for simplicity.
- Authentication is not included because the assessment focuses on inventory reservation behavior.
- The UI is intentionally simple.

## Testing Notes

Manual verification completed:

- 409 insufficient stock response tested.
- Concurrent reservation behavior tested with two parallel requests for the last available unit: one request succeeded and one returned 409.
- 410 expired reservation behavior tested by manually expiring a reservation before confirmation.
