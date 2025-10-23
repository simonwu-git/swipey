# Finances Web UI Implementation Plan

## Overview
Create a Next.js application in the `finances-web` directory that provides a modern web interface for the transaction-db-pipeline-v2, featuring drag-and-drop CSV uploads, account management, and transaction preview with duplicate detection.

## Tech Stack
- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **File Upload**: react-dropzone for drag-and-drop
- **Database**: PostgreSQL (separate from CLI database) via Prisma ORM
- **Validation**: Zod for schema validation
- **UI Components**: shadcn/ui for polished UI components

## Key Features for First Iteration

### 1. Database Setup
- Create new docker-compose.yml for the web app with separate PostgreSQL instance
- Design schema with:
  - `accounts` table: id, name, table_key (e.g., "chase_2313"), bank_type, created_at
  - Transaction tables: Reuse same structure as CLI (transaction_date, post_date, description, category, transaction_type, amount)
  - Migration files using Prisma

### 2. Account Management UI
- `/accounts` page to view all configured accounts
- "Add Account" form with fields:
  - Account name (e.g., "Chase Sapphire ****2313")
  - Bank type (Chase, Capital One) - dropdown
  - Table key (auto-generated or custom)
- Edit/Delete account functionality
- Store account configs in database

### 3. CSV Upload & Preview Flow
Main upload page (`/upload`) with:
- Account selector dropdown (fetch from accounts table)
- Drag-and-drop zone for CSV files
- File validation (CSV format, bank-specific headers)
- **Preview table** showing all parsed transactions:
  - Display transaction_date, description, amount, category, type
  - Highlight duplicate rows in red/yellow
  - Show duplicate count summary
  - Checkbox to toggle showing/hiding duplicates
- "Confirm Import" button (disabled until preview loaded)
- Import summary after completion (inserted count, skipped count)

### 4. Backend Logic (Next.js API Routes)
Reuse Python parser logic by porting to TypeScript:

**File**: `app/api/parse-csv/route.ts`
- Accept uploaded CSV file
- Port ParserFactory, BaseParser, ChaseParser, CapitalOneParser to TypeScript
- Return parsed transactions as JSON

**File**: `app/api/check-duplicates/route.ts`
- Accept array of transactions
- Query database for existing transactions using same logic as CLI (match on transaction_date, amount, description)
- Return array of duplicate indicators

**File**: `app/api/import/route.ts`
- Accept account_id and transactions array
- Insert using Prisma with `createMany` and `skipDuplicates: true`
- Return import summary (processed, inserted, skipped)

### 5. Core Files to Create

**New directory structure**:
```
finances-web/
├── app/
│   ├── layout.tsx (root layout with nav)
│   ├── page.tsx (home/upload page)
│   ├── accounts/
│   │   └── page.tsx (account management)
│   ├── api/
│   │   ├── parse-csv/route.ts
│   │   ├── check-duplicates/route.ts
│   │   ├── import/route.ts
│   │   └── accounts/route.ts
│   └── components/
│       ├── CSVDropzone.tsx
│       ├── TransactionPreview.tsx
│       ├── AccountSelector.tsx
│       └── AccountForm.tsx
├── lib/
│   ├── parsers/
│   │   ├── base.ts (port from Python)
│   │   ├── chase.ts
│   │   ├── capitalOne.ts
│   │   └── factory.ts
│   ├── db.ts (Prisma client)
│   └── types.ts (TypeScript types)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docker-compose.yml (separate Postgres for web)
└── package.json
```

## Implementation Steps

1. **Initialize Next.js project** in finances-web directory
   - Set up TypeScript, Tailwind CSS, shadcn/ui
   - Configure ESLint and Prettier

2. **Set up database infrastructure**
   - Create docker-compose.yml with PostgreSQL
   - Define Prisma schema for accounts and transactions
   - Run initial migrations

3. **Port parser logic to TypeScript**
   - Create base parser class with abstract methods
   - Implement Chase and CapitalOne parsers
   - Implement parser factory with auto-detection
   - Add unit tests for parsers

4. **Build account management**
   - Create accounts API routes (CRUD)
   - Build accounts page UI
   - Implement add/edit account forms

5. **Implement upload & preview flow**
   - Create CSV dropzone component
   - Build parse-csv API endpoint
   - Create transaction preview table with duplicate highlighting
   - Implement duplicate detection logic

6. **Build import functionality**
   - Create import API endpoint with batch processing
   - Add confirmation modal with import summary
   - Handle success/error states with toast notifications

7. **Polish & testing**
   - Add loading states and error handling
   - Responsive design for mobile
   - E2E testing with sample CSVs

## Reused Business Logic
- CSV parsing logic from `parsers/` directory
- Duplicate detection from `utils/duplicate_detection.py`
- Database insertion patterns from `ingestion.py`
- Table structure from existing migration files

## Future Enhancements (Not in First Iteration)
- Transaction viewing/searching dashboard
- Monthly spending analytics
- Export functionality
- Multi-file batch upload
- Transaction editing/categorization

## Implementation Checklist

- [ ] Initialize Next.js 14+ project with TypeScript, Tailwind CSS, and install dependencies (shadcn/ui, react-dropzone, Prisma, Zod)
- [ ] Create docker-compose.yml and Prisma schema for accounts and transaction tables
- [ ] Port Python parser logic to TypeScript (base, chase, capitalOne, factory)
- [ ] Build accounts API routes for CRUD operations
- [ ] Create accounts management page with add/edit/delete functionality
- [ ] Build parse-csv and check-duplicates API endpoints
- [ ] Create upload page with dropzone, account selector, and transaction preview table with duplicate highlighting
- [ ] Build import API endpoint with batch processing and duplicate handling
- [ ] Connect preview to import functionality with confirmation and summary display
- [ ] Add loading states, error handling, responsive design, and test with sample CSVs
