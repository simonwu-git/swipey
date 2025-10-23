# Finances Web

A modern web interface for importing and managing financial transactions, built with Next.js and PostgreSQL.

## Features

- **Drag & Drop CSV Upload**: Upload transaction CSV files with a modern drag-and-drop interface
- **Account Management**: Create and manage multiple bank accounts
- **Transaction Preview**: Preview transactions before import with duplicate detection
- **Multi-Bank Support**: Supports Chase and Capital One CSV formats
- **Duplicate Detection**: Automatically detects and highlights duplicate transactions

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **File Upload**: react-dropzone

## Setup

### Prerequisites

- Node.js 20+ (use `nvm use 20` if you have nvm)
- Docker and Docker Compose
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up the database**:
   ```bash
   # Start PostgreSQL with Docker
   docker-compose up -d
   
   # Generate Prisma client
   npm run db:generate
   
   # Run database migrations
   npm run db:push
   ```

3. **Set up environment variables**:
   ```bash
   # Copy the example environment file
   cp env.example .env.local
   
   # The default DATABASE_URL should work with the docker-compose setup
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Create Accounts

1. Go to the "Accounts" page
2. Click "Add Account"
3. Fill in the account details:
   - **Account Name**: e.g., "Chase Sapphire ****2313"
   - **Bank Type**: Select Chase or Capital One
   - **Table Key**: Unique identifier (e.g., "chase_2313")

### 2. Import Transactions

1. Go to the main "Upload" page
2. Select an account from the dropdown
3. Drag and drop a CSV file or click to select
4. Preview the parsed transactions
5. Review any duplicate warnings
6. Click "Confirm Import" to save to the database

### 3. Supported CSV Formats

**Chase Bank**:
```
Transaction Date,Post Date,Description,Category,Type,Amount
8/17/25,8/17/25,LYFT   *1 RIDE 08-15,Travel,Sale,-21.1
```

**Capital One**:
```
Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit
8/17/25,8/17/25,****1234,LYFT   *1 RIDE 08-15,Travel,21.1,
```

## Development

### Database Management

```bash
# View database in Prisma Studio
npm run db:studio

# Reset database
npm run db:push --force-reset

# Generate new migration
npm run db:migrate
```

### Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── accounts/      # Accounts page
│   └── page.tsx       # Main upload page
├── components/        # React components
├── lib/
│   ├── parsers/       # CSV parsing logic
│   ├── db.ts         # Database connection
│   └── types.ts      # TypeScript types
└── prisma/           # Database schema
```

## API Endpoints

- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create new account
- `PUT /api/accounts/[id]` - Update account
- `DELETE /api/accounts/[id]` - Delete account
- `POST /api/parse-csv` - Parse uploaded CSV file
- `POST /api/import` - Import transactions to database

## Database Schema

### Accounts Table
- `id`: Primary key
- `name`: Account display name
- `tableKey`: Unique identifier for database table
- `bankType`: Bank type (chase, capital_one)
- `createdAt`: Creation timestamp

### Transactions Table
- `id`: Primary key
- `transactionDate`: Date of transaction
- `postDate`: Date transaction was posted
- `description`: Transaction description
- `category`: Transaction category
- `transactionType`: Type of transaction
- `amount`: Transaction amount
- `accountId`: Foreign key to accounts table
- `createdAt`: Creation timestamp

## Troubleshooting

### Database Connection Issues
- Ensure Docker is running: `docker-compose ps`
- Check database logs: `docker-compose logs postgres`
- Verify DATABASE_URL in `.env.local`

### CSV Parsing Issues
- Ensure CSV has correct headers for your bank type
- Check that dates are in MM/DD/YY format
- Verify amount format (no currency symbols)

### Build Issues
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 20+)

## Future Enhancements

- Transaction viewing and search
- Monthly spending analytics
- Export functionality
- Multi-file batch upload
- Transaction categorization
- Spending reports and charts