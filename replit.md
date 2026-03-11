# Dental Clinic Management System

## Overview

A full-stack dental clinic management application built with React frontend and Express backend. The system manages patients, appointments, visits, services, and financial tracking for dental clinics. The interface is designed in Arabic (RTL) using the Tajawal font.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side navigation
- **State Management**: Custom store context with auth integration
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme variables and RTL support
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for financial visualizations
- **Export**: exceljs for Excel, jspdf + jspdf-autotable for PDF

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: express-session with role-based access control
- **API Design**: RESTful endpoints under `/api` prefix
- **Build Process**: esbuild bundles server code, Vite bundles client code

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Permissions**: `shared/permissions.ts` defines RBAC permission map
- **Migrations**: Managed via `drizzle-kit push` command
- **Connection**: Uses `DATABASE_URL` environment variable

### Key Data Models
- **Users**: Authentication with role (receptionist/dentist/manager)
- **Patients**: Name, phone, age, gender, notes
- **Services**: Dental procedures with default pricing and teeth selection flag
- **Appointments**: Scheduled patient visits with morning/evening periods
- **Visits**: Completed patient sessions with multiple service items, quantity, and tooth mapping
- **Visit Items**: Service line items with price, quantity, tooth numbers, and jaw type
- **Payments**: Payment records linked to visits
- **Expenses**: Clinic operational costs and withdrawals
- **Audit Logs**: Track all create/update/delete operations

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # UI components (Pagination, ToothSelector, etc.)
│   │   ├── pages/       # Route pages
│   │   ├── lib/         # Utilities and store with auth
│   │   └── hooks/       # Custom hooks
├── server/           # Express backend
│   ├── routes.ts     # API endpoints with RBAC middleware
│   ├── storage.ts    # Database operations
│   ├── scheduler.ts  # Appointment reminder scheduler
│   └── db.ts         # Database connection
├── shared/           # Shared code
│   ├── schema.ts     # Drizzle schema definitions
│   └── permissions.ts # RBAC permission map
```

## Features

### 1. Tooth & Jaw Mapping
- Interactive 2D tooth selector component (FDI system)
- Support for single tooth, multiple teeth, full jaw, full mouth selection
- Services can be flagged as requiring teeth selection
- Tooth history tracking per visit item
- Filter visits by tooth number

### 2. Role-Based Access Control (RBAC)
- Three roles: Receptionist, Dentist, Manager
- Session-based authentication
- Permission-based route protection (frontend + backend)
- User management page (manager only)
- Role-specific UI visibility

### 3. Edit Past Visits
- Full edit mode for existing visits
- Modify services, quantities, prices, tooth selections
- Auto-recalculate totals
- Payment safeguards (cannot delete visit with payments)

### 4. Audit Log
- Tracks all create/update/delete operations
- Records old and new values
- Filterable by entity type
- Manager-only access

### 5. Reports & Export
- Excel export (multi-sheet with summary, visits, expenses)
- PDF export (landscape with financial summary and tables)
- Filter by date range, doctor, service type
- Detailed financial reports endpoint

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user info
- `POST /api/auth/register` - Register new user

### Patients
- `GET /api/patients` - Fetch all patients
- `GET /api/patients/:id` - Get single patient
- `POST /api/patients` - Create patient (+ audit log)
- `PATCH /api/patients/:id` - Update patient (+ audit log)

### Services
- `GET /api/services` - Fetch all services (includes requiresTeethSelection)
- `GET /api/services/:id` - Get single service
- `POST /api/services` - Create service (+ audit log)
- `PATCH /api/services/:id` - Update service (+ audit log)
- `DELETE /api/services/:id` - Delete service (+ audit log)

### Appointments
- `GET /api/appointments` - Fetch all appointments
- `POST /api/appointments` - Create appointment
- `PATCH /api/appointments/:id` - Update appointment

### Visits
- `GET /api/visits` - Fetch all visits with items (includes tooth data)
- `GET /api/visits/:id` - Get single visit
- `POST /api/visits` - Create visit with items and tooth data (+ audit log)
- `PATCH /api/visits/:id` - Update visit, supports items array for full edit (+ audit log)
- `DELETE /api/visits/:id` - Delete visit (cascades payments and items)

### Financial
- `GET /api/expenses` - Fetch all expenses
- `POST /api/expenses` - Add expense (+ audit log)
- `GET /api/payments` - Fetch all payments
- `POST /api/payments` - Record payment
- `GET /api/reports/financial` - Filtered financial report

### Audit
- `GET /api/audit-logs` - Fetch audit logs (manager only)

### Users
- `GET /api/users` - List users (manager only)
- `POST /api/users` - Create user (manager only)
- `PATCH /api/users/:id/role` - Update user role (manager only)

## Pages
- **الرئيسية** (Dashboard) - System overview with role-based stats
- **المرضى** (Patients) - Patient management
- **المواعيد** (Appointments) - Appointment scheduling and management
- **الزيارات** (Visits) - Visit records with tooth selector, edit mode
- **الخدمات** (Services) - Service management with teeth selection toggle
- **المالية والتقارير** (Finance) - Financial tracking with Excel/PDF export
- **سجل التدقيق** (Audit Log) - Modification history (manager only)
- **إدارة المستخدمين** (Users) - User/role management (manager only)
- **تسجيل الدخول** (Login) - Authentication page

## UI/UX Improvements
- Smart PatientSearch component with real-time filtering (name+phone), keyboard navigation, click-outside handling
- Lazy loading for all page components via React.lazy + Suspense
- Skeleton loading states for all pages
- Pagination (10 items/page) on visits and patients pages (12 items/page)
- Improved sidebar with gradient header, role-colored badges, smooth mobile overlay
- Breadcrumb navigation
- Improved login page with visual branding
- Improved dashboard with financial summary card and today's appointments
- All pages use inline forms instead of popup dialogs (patients, appointments, services, users, finance, visits)
- Card-based expandable visit list for mobile responsiveness
- All numeric fields default to empty with placeholder text instead of 0
- Visit notes field removed from forms, detail view, and card list
- 12 realistic seed visits with tooth data and varied payment statuses

## Validation & Security
- `shared/validation.ts` - Shared validation utilities (calculateTotalFromItems, validatePaymentAmount, validateEditVisitTotal)
- Server-side total recalculation: backend calculates totalAmount from items, ignores frontend value
- Overpayment prevention: server validates payment doesn't exceed remaining balance
- Edit visit safeguard: prevents reducing totalAmount below paidAmount
- Negative value prevention: all prices (.min(0)), amounts (.positive()), quantities (.min(1)) validated via Zod
- Phone format validation: must match /^05\d{8}$/
- Date format validation: must match YYYY-MM-DD
- Service deletion protection: FK constraint prevents deleting services used in visits (returns 409)
- Required field enforcement: all critical fields have .min(1) or .min(2)

## Testing
- `vitest` test runner configured via `vitest.config.ts`
- 67 unit tests in `tests/validation.test.ts` covering:
  - Schema validation (positive/negative cases for all entities)
  - Business logic (total calculation, payment chains, edit constraints)
  - Edge cases (string coercion, boundary values, combined scenarios)
- Run with: `npx vitest run`

## Build Status
- ✅ All 6 features implemented
- ✅ Server running on port 5000
- ✅ All API routes active with RBAC
- ✅ Cascade delete for patients, visits, and expenses
- ✅ PDF export fixed (autoTable import)
- ✅ Lazy loading enabled
- ✅ Pagination on visits and patients pages
- ✅ 67 unit tests passing
- ✅ Server-side validation hardened
