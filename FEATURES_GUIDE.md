# LabelTruth: Full Feature Implementation Guide

This document covers the three new features that have been fully implemented:

## Overview of Features

### ✨ Feature 1: Personalized Health Profile Matching
- **User Accounts:** JWT-based auth with email/password registration and login
- **Health Profile:** Store allergies (multi-select), medical conditions (diabetes/hypertension), diet types (vegan/vegetarian/gluten-free/low-sodium)
- **Rules Engine:** Deterministic matching of ingredients against profile (no LLM calls)
- **Personalized Scoring:** Same product shows different scores based on user profile conflicts
- **Visual Distinction:** Generic and personalized scores both visible with highlighting for conflicts

### 🎯 Feature 2: Cumulative Exposure Tracking
- **Rolling Windows:** Aggregate scans over "today" and "this week"
- **Tracked Metrics:**
  - Hidden sugar grams (conservative estimate: 4-12g per flagged ingredient)
  - Ultra-processed scan count
  - Allergen flag count
- **Dashboard:** Real-time exposure summary showing trends
- **Real Data Only:** Excludes incomplete or missing fields from aggregates

### 💡 Feature 3: Healthier Alternative Suggestions
- **Open Food Facts Integration:** Queries OFF API for products in same category
- **Scoring:** Based on Nutri-Score and NOVA processing levels
- **Personalization:** Filters alternatives matching user's allergen profile
- **7-Day Cache:** Reduces API calls, ensures data freshness
- **Transparency:** Shows up to 3 alternatives with specific improvement reasons

---

## Database Setup (PostgreSQL)

### Prerequisites
- macOS with Homebrew
- Node.js >= 22
- Terminal access

### Quick Setup (Follow POSTGRES_SETUP.md)

```bash
# 1. Install PostgreSQL
brew install postgresql@15

# 2. Start service
brew services start postgresql@15

# 3. Create database and user
psql postgres
```

Inside psql:
```sql
CREATE USER labeltruth WITH PASSWORD 'labeltruth_dev_password';
CREATE DATABASE labeltruth_dev OWNER labeltruth;
ALTER USER labeltruth CREATEDB;
\q
```

### Initialize Prisma

```bash
cd /Users/tithishah/Desktop/LabelTruth/LabelTruth

# Create .env file
cat > apps/api/.env << EOF
DATABASE_URL="postgresql://labeltruth:labeltruth_dev_password@localhost:5432/labeltruth_dev"
JWT_SECRET="dev-secret-key-change-in-production-3x8kL9mQ2wPz"
PORT=4000
EOF

# Install dependencies
npm install

# Run migrations
npx prisma migrate dev --name init

# Verify setup
npx prisma studio  # Opens web UI at http://localhost:5555
```

---

## API Endpoints Summary

### Authentication
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Log in and get JWT token

### Profile Management
- `GET /api/profile` — Fetch user's health profile
- `PUT /api/profile` — Update allergies, medical condition, diet type

### Scan Analysis
- `POST /api/scans/analyze` — Analyze ingredients with personalized scoring
- `GET /api/scans/:scanId` — Retrieve specific scan (with personalized/generic scores)
- `GET /api/scans/history` — List user's scan history (paginated)

### Exposure Tracking
- `GET /api/exposure/summary` — Get today's + this week's aggregated stats

### Alternatives
- `GET /api/scans/:scanId/alternatives` — Get 2-3 healthier product suggestions (cached)

### Legacy (Guest)
- `POST /api/analyze-text` — Guest analysis (no auth required, no persistence)

---

## Frontend Components

### Pages
- **LoginPage** — Email + password login
- **RegisterPage** — Account creation with validation

### Components
- **ProfileEditor** — Modal for allergies, medical condition, diet type
- **ExposureDashboard** — Today's + week's exposure metrics
- **PersonalizedBadge** — Shows generic vs. personalized rating with highlighting
- **ProfileMatches** — Displays allergen conflicts
- **AlternativeSuggestions** — Shows up to 3 OFF alternatives with reasons

### Styling
All pastel theme (cream, sage, coral, yellow):
- `auth.css` — Login/register forms
- `profile.css` — Profile editor modal
- `dashboard.css` — Exposure tracking UI
- `personalized.css` — Badges and profile matches
- `alternatives.css` — Alternative suggestions cards
- `styles.css` — Updated with auth bar + exposure section

---

## Running the Full Stack

### Terminal 1: Start PostgreSQL (if not running)
```bash
brew services start postgresql@15
```

### Terminal 2: Start API Server
```bash
cd /Users/tithishah/Desktop/LabelTruth/LabelTruth
npm run dev:api
```

Should log:
```
LabelTruth API listening on http://localhost:4000
Features:
  ✓ User authentication (JWT)
  ✓ Health profile matching
  ✓ Personalized scoring
  ✓ Scan history tracking
  ✓ Exposure aggregation
  ✓ Open Food Facts alternatives
```

### Terminal 3: Start Web Frontend
```bash
cd /Users/tithishah/Desktop/LabelTruth/LabelTruth
npm run dev
```

Should show Vite dev server at `http://localhost:5173`

### Open in Browser
Visit **http://localhost:5173** and:
1. Create account or log in
2. Edit profile (Settings icon in auth bar)
3. Scan products
4. View personalized analysis
5. See alternatives and exposure dashboard

---

## Privacy & Security Notes

### Sensitive Data
- **Health data (allergies, conditions)** is stored in PostgreSQL — handle deliberately
- **Passwords** are hashed with bcrypt (12-round salt)
- **JWTs** expire after 7 days
- **Scan history** tied to user account — not shared

### Environment Variables
- `JWT_SECRET` — MUST change in production
- `DATABASE_URL` — Use strong password in production
- `.env` file should never be committed to git

### Data Handling
- No third-party health data sharing
- LLM layer only explains ingredients, never generates medical claims
- Alternatives sourced only from OFF's public data
- Conservative estimates used when exact nutrition data unavailable

---

## Verification Checklist

- [ ] PostgreSQL running and accessible
- [ ] Prisma migrations applied (`npx prisma migrate dev`)
- [ ] API running on http://localhost:4000
- [ ] Web running on http://localhost:5173
- [ ] Can register new account
- [ ] Can log in
- [ ] Can edit profile (settings button)
- [ ] Can scan and get personalized score
- [ ] Exposure dashboard shows metrics
- [ ] Alternatives section appears for yellow/red products

---

## Next Steps for Production

1. **Secrets Management:** Use environment variable service (AWS Secrets Manager, etc.)
2. **Database:** Migrate to production PostgreSQL (AWS RDS, etc.)
3. **API Deployment:** Deploy to server (Vercel, AWS Lambda, DigitalOcean, etc.)
4. **Frontend Build:** `npm run build` and deploy to CDN
5. **Rate Limiting:** Add rate limiting to OFF API queries
6. **Monitoring:** Set up error tracking (Sentry, etc.)
7. **Testing:** Add unit and integration tests
8. **Documentation:** Generate OpenAPI spec for API

---

## Troubleshooting

**"Cannot connect to database"**
- Check PostgreSQL is running: `brew services list`
- Verify DATABASE_URL in `.env`
- Test connection: `psql $DATABASE_URL`

**"JWT expired"**
- Token expires after 7 days. User must log in again.
- To extend: update `JWT_EXPIRY` in `apps/api/src/utils/auth.ts`

**"No alternatives found"**
- OFF API may rate-limit or be slow
- Results cached for 7 days to reduce calls
- Check network tab for API errors

**"Personalized score not changing"**
- Verify profile is saved (check in ProfileEditor modal)
- Health profile may have empty allergen list
- Ingredient text must match aliases in `profileMatcher.ts`

---

## Code Organization

```
apps/
├── api/
│   ├── src/
│   │   ├── server.ts              ← Main API server with all routes
│   │   └── utils/
│   │       ├── auth.ts            ← JWT & password functions
│   │       ├── profileMatcher.ts   ← Rules engine for personalization
│   │       ├── exposure.ts         ← Aggregation logic
│   │       ├── openFoodFacts.ts    ← OFF API integration
│   │       └── middleware.ts       ← Auth middleware
│   └── prisma/
│       └── schema.prisma           ← Database schema
│
└── web/
    └── src/
        ├── App.tsx                 ← Updated with auth & features
        ├── pages/
        │   ├── LoginPage.tsx
        │   └── RegisterPage.tsx
        ├── components/
        │   ├── ProfileEditor.tsx
        │   ├── ExposureDashboard.tsx
        │   ├── PersonalizedBadge.tsx
        │   └── AlternativeSuggestions.tsx
        └── styles/
            ├── auth.css
            ├── profile.css
            ├── dashboard.css
            ├── personalized.css
            └── alternatives.css
```

---

## Architecture Decisions

### Why No LLM for Personalization?
- Deterministic rules engine is faster and more transparent
- Medical data should not be processed by third-party LLMs
- User can trust exact matching logic in code
- Reduces API costs and latency

### Why Conservative Sugar Estimates?
- Real nutrition data not always available from OCR
- Conservative estimate (4-12g) is safer than guessing zero
- Actual values should come from OFF's nutrition API when available
- Better to overestimate exposure than underestimate

### Why 7-Day Cache for Alternatives?
- OFF API has rate limits (< 1 req/sec)
- Same product unlikely to change ingredients in 7 days
- Balances freshness and performance
- Can be adjusted in `isCacheExpired()` function

### Why Both Scores Visible?
- Transparency: user understands how profile affects rating
- Education: shows why their personal profile matters
- Safety: generic score still visible if they share product

---

For questions or issues, see the API server logs and browser console for detailed error messages.
