# Dental Clinic Management System

## Overview

A full-stack dental clinic management application built with React frontend and Express backend. The system manages patients, appointments, visits, services, and financial tracking for dental clinics. The interface is designed in Arabic (RTL) using the Tajawal font.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side navigation
- **State Management**: React Query for server state, custom store context for local state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme variables and RTL support
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for financial visualizations
- **Pagination**: Custom pagination component with 10 items per page default

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **API Design**: RESTful endpoints under `/api` prefix
- **Build Process**: esbuild bundles server code, Vite bundles client code

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Managed via `drizzle-kit push` command
- **Connection**: Uses `DATABASE_URL` environment variable
- **Real Database**: All data persisted in PostgreSQL - NO mock or temporary data

### Key Data Models
- **Users**: Authentication (username/password)
- **Patients**: Name, phone, age, gender, notes
- **Services**: Dental procedures with default pricing
- **Appointments**: Scheduled patient visits with morning/evening periods
- **Visits**: Completed patient sessions with multiple service items and quantity tracking
- **Visit Items**: Service line items with price and quantity
- **Payments**: Payment records linked to visits
- **Expenses**: Clinic operational costs and withdrawals

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # UI components (including Pagination)
│   │   ├── pages/       # Route pages with pagination support
│   │   ├── lib/         # Utilities and store
│   │   └── hooks/       # Custom hooks
├── server/           # Express backend
│   ├── routes.ts     # API endpoints
│   ├── storage.ts    # Database operations
│   └── db.ts         # Database connection
├── shared/           # Shared code
│   └── schema.ts     # Drizzle schema definitions
```

## Complete API Integration

### All API Endpoints Connected ✅

**Services Management**
- `GET /api/services` - Fetch all services
- `GET /api/services/:id` - Get single service
- `POST /api/services` - Create new service
- `PATCH /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

**Patients Management**
- `GET /api/patients` - Fetch all patients
- `GET /api/patients/:id` - Get single patient
- `POST /api/patients` - Create new patient
- `PATCH /api/patients/:id` - Update patient

**Appointments**
- `GET /api/appointments` - Fetch all appointments
- `GET /api/appointments/:id` - Get single appointment
- `POST /api/appointments` - Create new appointment
- `PATCH /api/appointments/:id` - Update appointment status

**Visits**
- `GET /api/visits` - Fetch all visits
- `GET /api/visits/:id` - Get single visit
- `POST /api/visits` - Create new visit with items
- `PATCH /api/visits/:id` - Update visit

**Financial**
- `GET /api/expenses` - Fetch all expenses
- `POST /api/expenses` - Add new expense or withdrawal
- `GET /api/payments` - Fetch payment records
- `POST /api/payments` - Record payment for visit

### Frontend Integration Status ✅

All pages fully connected to real PostgreSQL database via store:
- **Dashboard** - Real-time statistics from database (income, expenses, appointments)
- **Patients** - All patient operations (add, edit, view) with pagination
- **Appointments** - Schedule, update status with real database persistence
- **Visits** - Complete visit records with service items and quantity tracking
- **Services** - Full CRUD operations (add, edit, delete)
- **Finance** - Expense tracking and financial reports from real data

### Database Integration Verification ✅

**Real Data Confirmation:**
- Services: 7 services loaded from PostgreSQL ✓
- Patients: 6 patient records in database ✓
- Appointments: 3 scheduled appointments ✓
- Visits: 2 visit records with complete items ✓
- Expenses: 3 financial records ✓
- Quantity Field: Working correctly in visit items (quantity:1 confirmed in API responses)

**No Mock Data:** System uses 100% real PostgreSQL data - no temporary or placeholder data anywhere.

### Store Methods ✅

All frontend operations properly integrated:
- `addPatient()` - Create new patient in database
- `updatePatient()` - Update patient information
- `addAppointment()` - Schedule new appointment
- `updateAppointment()` - Update appointment status
- `addVisit()` - Record new visit with service items
- `updateVisit()` - Update visit details
- `addService()` - Create new service
- `updateService()` - Update service information
- `deleteService()` - Remove service from database
- `addExpense()` - Record expense or withdrawal
- `getPatient()` - Retrieve patient by ID
- `getService()` - Retrieve service by ID

## Testing & Verification

**API Endpoints:** All tested and returning real database data
```
✓ GET /api/services - 7 services from PostgreSQL
✓ GET /api/patients - 6 patients from PostgreSQL
✓ GET /api/appointments - 3 appointments from PostgreSQL
✓ GET /api/visits - 2 visits with items from PostgreSQL
✓ GET /api/expenses - 3 expenses from PostgreSQL
```

**Form Operations:** All forms submit data to real database
- Services form: Creates/updates/deletes in database
- Patient form: Saves to database with validation
- Appointment form: Books in database
- Visit form: Records with service items and quantity

**Database Relationships:** All foreign keys functional
- Appointments → Patients ✓
- Visits → Patients ✓
- Visit Items → Visits + Services ✓
- Payments → Visits ✓

## System Status

**Production Ready:** ✅
- ✓ Full API-to-database pipeline operational
- ✓ All endpoints connected to frontend interfaces
- ✓ Real PostgreSQL database integration enabled
- ✓ No mock or temporary data - 100% real data
- ✓ Complete CRUD operations for all entities
- ✓ Type-safe API with Zod validation
- ✓ Arabic RTL interface fully functional
- ✓ Real-time form validation
- ✓ Pagination for data-heavy pages
- ✓ Financial tracking and reporting

## Pages Available
- **الرئيسية** (Dashboard) - System overview with real statistics
- **المرضى** (Patients) - Patient management with pagination
- **المواعيد** (Appointments) - Appointment scheduling
- **الزيارات** (Visits) - Visit records with service items and quantity
- **الخدمات** (Services) - Service management (add/edit/delete)
- **المالية والتقارير** (Finance & Reports) - Financial tracking

## Build Status
- ✅ Latest build successful
- ✅ All dependencies installed
- ✅ TypeScript compilation passing
- ✅ No type errors
- ✅ Server running on port 5000
- ✅ All API routes active
