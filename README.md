# RIPOMA GLOBAL

RIPOMA GLOBAL is a full-stack trade operations platform for managing inventory, procurement, sales, finance, documents, reporting, and customer-facing storefront workflows from a single admin hub.

The repository is split into a **React (Vite)** frontend and a **Node.js (Express + MongoDB)** backend with real-time notifications via Socket.IO.

---

## Features

| Module | Capabilities |
|--------|--------------|
| **Command Centre** | KPI scorecards, alerts, charts, global search |
| **Inventory** | Products, warehouses, stock movements, low-stock alerts |
| **CRM** | Suppliers, customers, contact directory |
| **Procurement & Imports** | Purchase orders, approvals, goods receipt, import tracking, delivery calendar |
| **Sales & Exports** | Sales orders, invoices, five-stage order status board |
| **Financial Control** | Payments, expenses, P&L, tax & duties, multi-currency |
| **Intelligence Center** | Sales/financial reports, business analytics, custom report builder, scheduled exports |
| **Document Management** | Document library, invoice archive, activity log |
| **Alerts & Activity** | Notification centre, reminders, preferences, system audit log |
| **Admin** | Users, roles & permissions, profile management |
| **Customer Portal** | Public storefront, registration, login, profile, product browsing |

---

## Tech Stack

### Frontend (`client/`)

- React 18, Vite 5, React Router 6
- Tailwind CSS, Lucide icons
- TanStack Query, React Hook Form, Zod
- Recharts, React Big Calendar, Leaflet
- Socket.IO client, Axios

### Backend (`server/`)

- Node.js, Express 4
- MongoDB with Mongoose
- JWT authentication (staff + customer portals)
- Socket.IO for live notifications
- Node-cron background jobs
- Local filesystem or AWS S3 storage
- Excel/PDF/CSV report generation
- Nodemailer for email digests and scheduled reports

---

## Project Structure

```text
Rippoma/
├── client/                 # React admin + customer portal UI
│   ├── src/
│   │   ├── components/     # Shared UI components
│   │   ├── pages/          # Route-level screens
│   │   ├── hooks/          # API/data hooks
│   │   ├── context/        # Auth & notification providers
│   │   └── services/       # Axios API client
│   └── package.json
├── server/                 # Express API + cron jobs
│   ├── controllers/        # Route handlers
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route definitions
│   ├── middleware/         # Auth, roles, activity logging
│   ├── jobs/               # Scheduled background tasks
│   ├── utils/              # Helpers, storage, report builders
│   └── server.js           # App entry point
└── README.md
```

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- **MongoDB** 6+ running locally or via Atlas

---

## Quick Start

### 1. Clone and install dependencies

```bash
git clone https://github.com/vipooshans/Ripoma_global.git
cd Ripoma_global

cd client && npm install
cd ../server && npm install
```

### 2. Configure environment variables

Create `server/.env`:

```env
# Core
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ripoma_global
FRONTEND_URL=http://localhost:5173

# Staff auth (change in production)
JWT_SECRET=your_staff_access_secret
JWT_REFRESH_SECRET=your_staff_refresh_secret

# Customer portal auth (change in production)
CUSTOMER_JWT_SECRET=your_customer_access_secret
CUSTOMER_JWT_REFRESH_SECRET=your_customer_refresh_secret

# When "false", customers may log in before verifying email (dev convenience)
# Development: verification is OFF by default. Set to "true" to test the verify flow locally.
# Production: verification is ON by default.
CUSTOMER_REQUIRE_EMAIL_VERIFICATION=false

# File storage: local (default) or s3
STORAGE_PROVIDER=local

# Optional — AWS S3 (when STORAGE_PROVIDER=s3)
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=ripoma-documents
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Product image storage: local (default) or r2
PRODUCT_IMAGE_STORAGE_PROVIDER=local

# Cloudflare R2 product images (when PRODUCT_IMAGE_STORAGE_PROVIDER=r2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PRODUCT_BUCKET=ripoma-product-images
R2_PUBLIC_URL=https://images.example.com

# Optional — email (auth verification/reset, reports, digests)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=notifications@ripomaglobal.com
```

For hosted product images, create a dedicated public R2 bucket and attach a custom
domain, then set `R2_PUBLIC_URL` to that domain without a trailing slash. Do not
reuse the private document bucket: product image URLs are intentionally public.
The R2 API token needs Object Read & Write access to the product-image bucket.
If the frontend will fetch image data with JavaScript, configure the bucket CORS
policy to allow `GET` and `HEAD` from the deployed frontend origin.

Optional client override in `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start MongoDB

Make sure MongoDB is running before starting the API server.

### 4. Run the application

Use two terminals:

```bash
# Terminal 1 — API server (port 5000)
cd server
npm run dev

# Terminal 2 — frontend (port 5173)
cd client
npm run dev
```

Open the app:

- **Staff admin:** [http://localhost:5173/login](http://localhost:5173/login)
- **Customer portal:** [http://localhost:5173/customer](http://localhost:5173/customer)
- **API health check:** [http://localhost:5000/health](http://localhost:5000/health)

---

## Default Admin Account

On first startup, the server seeds roles and a default administrator if none exists:

| Field | Value |
|-------|-------|
| Email | `admin@ripoma.com` |
| Password | `AdminPassword123!` |

Change this password immediately after first login in any non-local environment.

---

## User Roles

| Role | Access |
|------|--------|
| `admin` | Full system control |
| `manager` | Operations management; limited user/finance admin |
| `staff` | Day-to-day order and inventory operations |
| `viewer` | Read-only dashboards and reports |

Finance modules additionally require the `finance:read` / `finance:write` permissions configured per role.

---

## API Overview

All staff-protected routes are prefixed with `/api` and require a valid JWT (cookie or bearer token).

| Area | Base path |
|------|-----------|
| Staff auth | `/api/auth` |
| Customer auth | `/api/customer-auth` |
| Storefront | `/api/storefront` |
| Users & roles | `/api/users`, `/api/roles` |
| Inventory | `/api/products`, `/api/warehouses`, `/api/inventory`, `/api/stock-movements` |
| CRM | `/api/suppliers`, `/api/customers`, `/api/contacts` |
| Imports | `/api/import-orders`, `/api/goods-receipts` |
| Exports | `/api/export-orders`, `/api/invoices`, `/api/dispatches` |
| Finance | `/api/payments`, `/api/expenses`, `/api/tax-duty`, `/api/currency`, `/api/profit-analysis` |
| Documents | `/api/documents`, `/api/document-activity` |
| Reports | `/api/reports` |
| Notifications | `/api/notifications`, `/api/reminders`, `/api/activity-log` |
| Dashboard | `/api/dashboard`, `/api/search` |

---

## Background Jobs

The server runs scheduled tasks automatically after MongoDB connects:

- Low-stock monitoring
- Overdue delivery and invoice checks
- Document expiry alerts
- Exchange rate updates
- Payment and tax/duty due alerts
- Scheduled report generation
- Reminder checks
- Notification email digests

---

## Production Build

```bash
# Build frontend static assets
cd client
npm run build

# Preview production build locally
npm run preview

# Start API server
cd ../server
npm start
```

Serve the `client/dist` folder with your preferred static host (Nginx, Vercel, S3 + CloudFront, etc.) and point `VITE_API_URL` / `FRONTEND_URL` to your deployed URLs.

---

## Development Notes

- Uploaded files are stored under `server/uploads/` when using local storage.
- Real-time updates use Socket.IO on the same port as the API server.
- Activity logging middleware records create/update/delete actions across major modules.
- Use `server/seed-users.js` to seed additional demo users if needed.

---

## Contributing

1. Create a feature branch from `dev` or `main`.
2. Keep changes focused and match existing code style.
3. Test both `client` and `server` locally before opening a PR.
4. Describe what changed and why in the pull request.

---

## License

License not specified. Add a `LICENSE` file to the repository if you intend to open-source or distribute this project.
