# Go Travels ✈️🏨

A full-stack flight & hotel booking app inspired by MakeMyTrip, built as a portfolio project.

**Stack:** React 19 + TypeScript (Vite, Tailwind CSS 4, TanStack Query, Zustand, React Hook Form + Zod, Leaflet) ·
Django 5 + Django REST Framework (SimpleJWT, drf-spectacular) · PostgreSQL · Redis · Celery · Razorpay · Docker.

## Features

- **Flights:** airport autocomplete, one-way & round-trip search, 7-day fare calendar, filters (stops, airlines,
  departure time, price, refundable), sorting, fare details, multi-traveller booking.
- **Hotels:** city search, availability by date & rooms, filters (price, stars, rating, amenities, property type),
  list/map view, gallery, room selection, reviews, wishlist.
- **Booking engine:** inventory is **held** (row-locked with `select_for_update`) when a booking is created, released
  automatically after 15 minutes if unpaid (Celery beat), and re-acquired if a late payment arrives.
- **Payments:** Razorpay orders, server-side HMAC signature verification and webhook, refunds on cancellation.
  Without keys, a built-in **mock gateway** is used so the full flow works offline.
- **Post-booking:** PDF e-ticket / hotel voucher (ReportLab), confirmation & cancellation emails (Celery),
  My Trips, cancellation with policy-based refunds.
- **Accounts:** JWT auth with refresh, email OTP verification, profile, saved travellers.
- **Offers:** coupon codes validated server-side.

## Run locally (no Docker)

```bash
# Backend: http://localhost:8000  (API docs at /api/docs/, admin at /admin/)
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
cp .env.example .env
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed
.venv/bin/python manage.py runserver

# Frontend: http://localhost:5173 (proxies /api to :8000)
cd frontend
npm install
npm run dev
```

With no `DATABASE_URL`/`REDIS_URL` set, the backend uses SQLite, in-memory cache and runs Celery tasks inline,
so nothing else is needed. Emails (OTP codes, tickets) are printed in the Django console.

## Run with Docker

```bash
docker compose up --build
```

App at http://localhost:8080, API docs at http://localhost:8080/api/docs/. Runs Postgres, Redis, a Celery worker,
Celery beat, Django (gunicorn) and the React build behind nginx.

## Demo accounts (created by `manage.py seed`)

| Role  | Email               | Password    |
|-------|---------------------|-------------|
| User  | demo@gotravels.dev  | Demo@12345  |
| Admin | admin@gotravels.dev | Admin@12345 |

Change or remove these before deploying anywhere public.

Coupons: `WELCOME10`, `FLYHIGH`, `STAYCATION`, `GOINTL`.

## Razorpay (optional)

Create test keys at dashboard.razorpay.com (Test Mode → API Keys) and set in `backend/.env`:

```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...   # webhook URL: <your-backend>/api/payments/webhook/
```

## Tests

```bash
cd backend && .venv/bin/pytest          # booking holds, overbooking, expiry, refunds, coupons, payments, auth
cd frontend && npm test                 # utils, error parsing, components
```

## Project structure

```
backend/
  config/            settings (base/dev/test/prod), urls, celery
  apps/accounts      custom user, JWT, OTP, saved travellers
  apps/locations     cities, airports, seed data & `seed` command
  apps/flights       airlines, flights, fares, deterministic schedule generator
  apps/hotels        hotels, rooms, per-night inventory, reviews
  apps/offers        coupons
  apps/bookings      booking lifecycle services, PDF tickets, Celery tasks
  apps/payments      Razorpay + mock gateway, verification, webhook, refunds
frontend/src/
  components/        layout, auth modal, search widgets, UI primitives
  features/          flights, hotels, booking (checkout), trips, account
  lib/               API client (token refresh), types, utils
  store/             auth & preferences (Zustand, persisted)
```

## Notes

- Flight schedules are generated on demand per route/date (seeded, so results are stable). Real inventory would
  come from a GDS/airline API such as Amadeus.
- Airline logos are replaced with coloured code badges; hotel/destination photos are Unsplash URLs with a
  placeholder fallback.
- This is a demo: no real tickets are issued and payments run in test mode.
