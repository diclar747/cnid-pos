# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Next.js 15** Point of Sale (POS) system called "CNID POS System" built for restaurants and retail businesses. The application uses:

- **Frontend**: Next.js 15 with React 19 and TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **State Management**: React Context API
- **Package Manager**: pnpm

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## Architecture Overview

### Core Application Structure

- **`/app`**: Next.js App Router pages and layouts
  - `/admin`: Administrative dashboard with nested routes
  - `/pos`: Point of sale interface
  - `/checkout`: Order checkout flow
  - `/landing`: Marketing/landing page

### Context Providers (State Management)

The application uses multiple React contexts in a hierarchical order (see `app/layout.tsx:30-37`):

1. **AuthProvider**: User authentication state
2. **ThemeProvider**: Dark/light mode theming
3. **CompanyProvider**: Company configuration
4. **SalesProvider**: Sales transactions management
5. **PurchasesProvider**: Purchase orders management
6. **SuppliersProvider**: Supplier information
7. **CartProvider**: Shopping cart state
8. **NotificationsProvider**: Toast notifications

### Database Layer

- **`/services/database.ts`**: Main database service layer with typed methods for:
  - Product management (CRUD, stock updates)
  - User management
  - Sales transactions with items
  - Expenses tracking
  - Categories and company configuration
  - Customer management

- **`/lib/supabase.ts`**: Supabase client configuration
- **`/types/database.ts`**: TypeScript database schema types

### UI Components

- **`/components/ui`**: Core shadcn/ui components
- **`/app/components`**: Feature-specific components (admin navigation, product grid, cart, etc.)

### Key Features

- Multi-role user system (admin/cashier)
- Product catalog with categories and stock management
- Point of sale with barcode scanning
- Sales reporting and analytics
- Expense tracking
- Supplier management
- QR code generation for products
- Responsive design with dark mode support

## Database Schema

The application expects these main Supabase tables:
- `products` (with categories relation)
- `users`, `sales`, `sale_items`
- `expenses`, `expense_categories`
- `suppliers`, `customers`
- `stock_movements`, `company_config`

Database scripts are available in `/scripts/` directory.

## Configuration Notes

- **TypeScript**: Strict mode enabled with path aliases (`@/*` maps to root)
- **Next.js**: ESLint and TypeScript errors ignored during builds
- **Images**: Unoptimized (for static hosting compatibility)
- **Tailwind**: Extended with custom color scheme and animations
- **Environment Variables**: Requires Supabase URL and keys

## Development Workflow

1. The project structure follows Next.js App Router conventions
2. Use the database service layer in `/services/database.ts` for all data operations
3. Components should use the appropriate context providers for state management
4. Follow existing patterns for new features (check similar components/pages)
5. Database types are auto-generated in `/types/database.ts`