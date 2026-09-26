# StockSense

A modular Inventory Management System that replaces manual registers and Excel sheets with one real-time app for receipts, deliveries, internal transfers, stock adjustments and a full stock ledger.

## Tech stack

- **Next.js 15** (App Router, Server Actions) + TypeScript
- **Tailwind CSS 4**
- **Prisma** ORM + **SQLite**, so there is no database server to install
- Custom auth: bcrypt password hashing, JWT session in an httpOnly cookie, role-based access, OTP password reset via email (Nodemailer + Gmail SMTP)

## Getting started

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run db:setup          # creates prisma/dev.db and loads demo data
npm run dev
```

Open http://localhost:3000 and log in with a demo account, or sign up:

| Login ID | Password | Role |
|---|---|---|
| admin01 | Admin@123 | Inventory Manager |
| staff01 | Staff@123 | Warehouse Staff |

`npm run db:reset` wipes the database and reseeds it.

### Password reset emails

The OTP for password reset is emailed to the user. To enable it, set `SMTP_USER` and `SMTP_PASS` in `.env`:

1. Turn on 2-Step Verification for the Gmail account that will send the emails.
2. Create an App Password at https://myaccount.google.com/apppasswords.
3. Put the Gmail address in `SMTP_USER` and the 16-character app password in `SMTP_PASS`, then restart `npm run dev`.

The demo accounts use placeholder emails. To try password reset, sign up with a real email address.

## Roles

| Action | Manager | Staff |
|---|---|---|
| View dashboard, stock, move history | ✅ | ✅ |
| Receipts & deliveries (create, validate, cancel) | ✅ | View only |
| Internal transfers | ✅ | ✅ |
| Stock adjustments / counts | ✅ | ✅ |
| Products, categories, reordering rules | ✅ | View only |
| Settings (warehouses, locations) | ✅ | ❌ |
| Manage users and roles (Profile page) | ✅ | ❌ |

The first account that signs up becomes a Manager, and later sign-ups join as Staff. Managers can change roles from **My Profile → Team & roles**. Permissions are enforced on the server in every action, not only by hiding buttons.

## Features

| Module | What it does |
|---|---|
| **Authentication** | Sign up (unique 6–12 character login ID, unique email, strong password), log in, OTP password reset by email, logout, Manager/Staff roles |
| **Dashboard** | KPIs (products in stock, low/out of stock, pending receipts, deliveries and transfers), Late/Waiting counts, low-stock alerts, filters by type, status, warehouse and category |
| **Products** | Create and edit products (name, SKU, category, UoM, cost, initial stock), categories, reordering rules, stock per location |
| **Stock** | On hand and free-to-use per location, stock value, inline count update |
| **Receipts** | Draft → Ready → Done; validating increases stock |
| **Deliveries** | Draft → Waiting → Ready → Done; out-of-stock lines turn red and the order waits; validating decreases stock |
| **Internal transfers** | Move stock between locations; the total stays the same |
| **Adjustments** | Enter a physical count; the difference is applied and logged |
| **Move history** | Stock ledger with every move; incoming in green, outgoing in red; list and Kanban views |
| **Settings** | Warehouses (name, short code, address) and locations (racks, rooms, zones) |

References are generated automatically as `<Warehouse>/<Operation>/<ID>`, for example `WH/IN/0001` or `WH/OUT/0002`.

## Project structure

```
app/(auth)/            login, signup, forgot-password + auth actions
app/(app)/dashboard    KPIs and filters
app/(app)/products     products, categories
app/(app)/stock        stock per location
app/(app)/operations   receipts, deliveries, transfers, adjustments (shared list + detail)
app/(app)/moves        stock ledger
app/(app)/settings     warehouses, locations
app/print/[id]         printable receipt / delivery slip
lib/stock.ts           stock engine: confirm, validate, cancel, adjust
lib/reference.ts       reference number sequences
prisma/schema.prisma   data model
prisma/seed.ts         demo data
```
