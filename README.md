# FlowStock: Production-Grade Inventory Management System

A production-ready, full-stack Inventory Management System featuring a **Node.js + Express + Prisma + MySQL** backend and a **Next.js 14 (App Router) + TypeScript + Tailwind CSS** frontend with real-time WebSocket telemetry.

---

## 🏗️ System Architecture

```
nxt_pr_prod/
├── backend-node/                 # REST & Real-time WebSocket Node.js Service
│   ├── prisma/
│   │   ├── schema/              # Multi-file Prisma Schema (Folders feature)
│   │   │   ├── base.prisma      # DB Connection & Generator
│   │   │   ├── enums.prisma     # Roles, Order & Movement Enums
│   │   │   ├── user.prisma      # Users, Roles, Permissions, Auth Tokens
│   │   │   ├── catalog.prisma   # Categories, Products, Images
│   │   │   ├── inventory.prisma # Warehouses, Stock, Movement ledger
│   │   │   ├── partners.prisma  # Suppliers, Customers
│   │   │   └── orders.prisma    # Purchase & Sales Orders, Receipts, Fulfillments
│   │   └── seeds/               # Idempotent database seeder
│   └── src/
│       ├── docs/                # OpenAPI 3.0 specification & Swagger UI
│       ├── modules/             # Auth, Users, Products, Categories, Warehouses,
│       │                        # Inventory, Suppliers, Customers, Purchase Orders,
│       │                        # Sales Orders, Dashboard, Reports, Notifications
│       ├── socket/              # Socket.IO WebSocket server & broadcast helpers
│       └── middlewares/         # JWT Auth, RBAC, Rate-limiting, CORS, Error Handling
│
└── frontend-next/                # Next.js 14 App Router SaaS Dashboard
    ├── app/
    │   ├── (auth)/login/        # Secure Authentication Page with Role Presets
    │   └── (dashboard)/         # Protected Administrative Shell
    │       ├── dashboard/       # Recharts Analytics & Metric KPI Cards
    │       ├── products/        # Catalog, SKU Search, Creation Dialog
    │       ├── inventory/       # Stock In / Out / Adjustments, Warehouse Transfers
    │       ├── warehouses/      # Warehouse Facility Management
    │       ├── purchase-orders/ # PO Lifecycle & Physical Goods Receipt
    │       ├── sales-orders/    # SO Lifecycle & Order Fulfillment
    │       ├── categories/      # Category Hierarchy Management
    │       ├── suppliers/       # Vendor Cards & Contact Profiles
    │       ├── customers/       # Commercial Customer Profiles
    │       └── reports/         # Stock Valuation & Instant CSV Downloads
    ├── components/layout/       # Responsive Sidebar & Top Navigation Bar
    ├── lib/                     # Axios API Client & Socket.IO Client Hook
    └── providers/               # TanStack Query & Auth Session Context
```

---

## ⚡ Quick Start & Run Commands

### 1. Backend Service
```bash
cd backend-node
npm install

# Push Prisma multi-schema to MySQL & Generate Client
npx prisma db push

# Seed roles, permissions, admin users, warehouses, and initial catalog
npm run db:seed

# Start development server with tsx watch
npm run dev
# -> Server URL:  http://localhost:5001
# -> Health Check: http://localhost:5001/api/v1/health
# -> Swagger Docs: http://localhost:5001/api/v1/docs
# -> WebSockets:  ws://localhost:5001/socket.io
```

### 2. Frontend Application
```bash
cd frontend-next
npm install

# Start Next.js development server
npm run dev
# -> Frontend: http://localhost:3000
```

---

## 🔐 Demo Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@inventory.com` | `Admin@123456` | Full unrestricted access |
| **Inventory Manager** | `manager@inventory.com` | `Manager@123456` | Catalog, Stock, Transfers, Purchase Approvals |
| **Staff Associate** | `staff@inventory.com` | `Staff@123456` | Order entry & dispatch |

---

## 📊 Real-Time WebSockets Integration
- **Live Stock Sync:** Emitted on `stock:updated` whenever physical inventory changes.
- **Instant Invalidation:** Next.js TanStack Query automatically refetches KPIs, analytics, and stock levels without manual page refresh.
