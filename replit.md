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

### Key Data Models
- **Users**: Authentication (username/password)
- **Patients**: Name, phone, age, gender, notes
- **Services**: Dental procedures with default pricing
- **Appointments**: Scheduled patient visits with morning/evening periods
- **Visits**: Completed patient sessions with multiple service items and quantity tracking
- **Visit Items**: Service line items with price and quantity (newly added)
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

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### UI Libraries
- **Radix UI**: Headless component primitives (dialog, select, tabs, etc.)
- **shadcn/ui**: Pre-built component variants using Radix
- **Lucide React**: Icon library
- **Recharts**: Charting library for financial reports

### Form Handling
- **React Hook Form**: Form state management
- **Zod**: Schema validation
- **@hookform/resolvers**: Zod integration with React Hook Form

### Date Handling
- **date-fns**: Date manipulation and formatting with Arabic locale support

### Build Tools
- **Vite**: Frontend bundler with HMR
- **esbuild**: Server bundler for production
- **TypeScript**: Type checking across the codebase

## Recent Updates (December 23, 2025)

### Quantity Field for Services
- Added `quantity` field to `visitItems` table in PostgreSQL
- Updated `visitItems` schema with quantity (default: 1, minimum: 1)
- Modified visit creation form to include quantity input for each service
- Enhanced total calculation formula: `sum(price × quantity)` for all visit items
- Quantity field properly integrated with database validation

### Financial System
- Implemented dual amount tracking: `totalAmount` (sum of all visit items including quantity) and `paidAmount` (actual payment)
- Remaining balance calculated as: `totalAmount - paidAmount`
- Payment records linked to visits with date and amount tracking
- All financial calculations based on actual database data

### Database Integration
- Complete PostgreSQL implementation with all foreign key relationships:
  - Appointments → Patients
  - Visits → Patients
  - Visit Items → Visits and Services (with quantity support)
  - Payments → Visits
- All CRUD operations fully functional with real database persistence
- Type safety maintained throughout with Drizzle ORM

### Pagination
- Created reusable `Pagination` component in `client/src/components/pagination.tsx`
- Implemented pagination logic in patients page (10 items per page)
- Page state management with current page tracking
- First/Previous/Page numbers/Next/Last navigation controls

## Testing & Verification

API logs confirm full system integration:
- Services loading: 7 dental services from database
- Patients loading: Multiple patient records with proper filtering
- Visits with items: Quantity field working correctly (quantity:1 showing in API responses)
- Financial data: Expenses and payments properly tracked
- All database relationships functioning with referential integrity

## Deployment Status

Ready for production deployment. System includes:
- ✓ Full database persistence with PostgreSQL
- ✓ Type-safe API with Zod validation
- ✓ Complete financial tracking with payments
- ✓ Quantity support for service items
- ✓ Pagination for data-heavy pages
- ✓ Arabic RTL interface
- ✓ Real-time form validation
