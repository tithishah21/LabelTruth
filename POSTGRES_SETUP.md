# PostgreSQL Setup for LabelTruth

## Prerequisites

- macOS with Homebrew installed
- Node.js >= 22 (already installed)

## Quick Start (macOS)

### 1. Install PostgreSQL with Homebrew

```bash
brew install postgresql@15
```

### 2. Start PostgreSQL Service

```bash
# Start the service
brew services start postgresql@15

# Verify it's running
brew services list
```

You should see `postgresql@15` listed as `started`.

### 3. Create Database & User

```bash
# Connect to PostgreSQL default database
psql postgres

# Inside psql, run:
CREATE USER labeltruth WITH PASSWORD 'labeltruth_dev_password';
CREATE DATABASE labeltruth_dev OWNER labeltruth;
ALTER USER labeltruth CREATEDB;
\q
```

### 4. Configure LabelTruth

Create `.env` file in `apps/api/`:

```bash
cd apps/api
cp .env.example .env
```

Edit `.env` and set:

```
DATABASE_URL="postgresql://labeltruth:labeltruth_dev_password@localhost:5432/labeltruth_dev"
JWT_SECRET="dev-secret-key-change-in-production-3x8kL9mQ2wPz"
PORT=4000
```

### 5. Initialize Prisma Schema

```bash
cd /Users/tithishah/Desktop/LabelTruth/LabelTruth

# Install dependencies
npm install

# Run migrations (creates tables in your DB)
npx prisma migrate dev --name init
```

This will:
- Create all tables in PostgreSQL
- Generate Prisma Client
- Optionally seed the database

### 6. Verify Connection

```bash
npx prisma studio
```

This opens a web UI at http://localhost:5555 where you can inspect your database.

---

## Troubleshooting

**Error: "could not connect to server"**
- Check if PostgreSQL is running: `brew services list`
- Restart if needed: `brew services restart postgresql@15`

**Error: "role does not exist"**
- Recreate the user in psql:
  ```sql
  CREATE USER labeltruth WITH PASSWORD 'labeltruth_dev_password';
  ```

**Error: "database does not exist"**
- Create it:
  ```sql
  CREATE DATABASE labeltruth_dev OWNER labeltruth;
  ```

**Reset everything (dev only):**
```bash
# Drop and recreate
dropdb labeltruth_dev
createdb labeltruth_dev -O labeltruth

# Resync Prisma
npx prisma migrate dev --name init
```

---

## Next Steps

1. Copy `.env.example` → `.env` in `apps/api/`
2. Update DATABASE_URL with your credentials
3. Run `npm install && npx prisma migrate dev --name init`
4. Start servers: `npm run dev` (web) and `npm run dev:api` (API)
