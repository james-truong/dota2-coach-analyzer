# Quick Start Guide

## What You Have Now

A fully scaffolded Dota 2 replay analysis web application with:

✅ **Frontend** (React + TypeScript + Tailwind CSS)
- Upload page with drag-and-drop for .dem files
- Analysis results page with insights and stats
- Modern, gaming-themed UI

✅ **Backend** (Express + TypeScript + PostgreSQL)
- REST API for replay upload and match analysis
- Database schema for matches, insights, and trends
- Placeholder services ready for implementation

✅ **Database Schema**
- Comprehensive PostgreSQL schema
- Tables for users, matches, performances, insights, trends, and habits
- Indexes and triggers for performance

## Get Started in 5 Minutes

### 1. Install Everything

```bash
npm run install:all
```

### 2. Set Up PostgreSQL (if not already installed)

```bash
# macOS (using Homebrew)
brew install postgresql
brew services start postgresql

# Create database
createdb dota2coach

# Load schema
psql dota2coach < backend/schema.sql
```

### 3. Set Up Environment

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Create uploads directory
mkdir -p backend/uploads
```

Edit `backend/.env`:
```env
DATABASE_URL=postgresql://localhost:5432/dota2coach
PORT=5000
```

### 4. Start Development

```bash
# Start both frontend and backend
npm run dev
```

Visit: **http://localhost:3000**

## What Works Right Now

- ✅ Upload interface (accepts .dem files)
- ✅ Mock analysis display
- ✅ API structure
- ✅ Database schema

## What Needs Implementation

Priority order:

1. **Replay Parser Integration** (CRITICAL)
   - Integrate [odota/rapier](https://github.com/odota/rapier) or OpenDota API
   - Parse .dem files to extract match data

2. **Database Queries** (HIGH)
   - Connect backend services to PostgreSQL
   - Store and retrieve match data

3. **Analysis Logic** (HIGH)
   - Implement mistake detection rules
   - Generate coaching insights

4. **Authentication** (MEDIUM)
   - User registration/login
   - JWT tokens

## Unique Features to Build (Your Competitive Edge)

Based on our research, these features will differentiate you from existing tools:

1. **Context-Aware Moment Analysis** - Explain WHY decisions were bad
2. **Bad Habit Tracker** - Track patterns across 10+ games
3. **Role-Specific Coaching** - Different advice for pos 1-5
4. **Tilt Detection** - Warn when gameplay patterns show tilting

See [ROADMAP.md](ROADMAP.md) for the full development plan.

## File Structure

```
frontend/src/
├── App.tsx              # Main component
├── main.tsx             # Entry point
├── pages/
│   ├── UploadPage.tsx   # Replay upload UI
│   └── AnalysisPage.tsx # Results display
└── types/index.ts       # TypeScript interfaces

backend/src/
├── index.ts             # Server entry
├── routes/              # API endpoints
├── services/            # Business logic (TODO: implement)
└── db/                  # Database connection
```

## Next Steps

1. Read [SETUP.md](SETUP.md) for detailed setup instructions
2. Read [ROADMAP.md](ROADMAP.md) for development phases
3. Start with integrating a replay parser (see recommendations below)

## Recommended Approach

### Option 1: Quick Win (Use OpenDota API)

Instead of parsing .dem files yourself, use match IDs and the OpenDota API:

```typescript
// User provides match ID instead of uploading file
const matchData = await fetch(`https://api.opendota.com/api/matches/${matchId}`)
```

**Pros**: No parsing needed, fast MVP
**Cons**: Only works for public matches

### Option 2: Full Control (Parse Locally)

Use [odota/rapier](https://github.com/odota/rapier) to parse .dem files:

```bash
cd backend
npm install @odota/rapier
```

**Pros**: Works for all replays, full control
**Cons**: More complex, parsing can be slow

### Recommended: Start with Option 1, add Option 2 later

## Getting Help

- **Dota 2 Replay Parsing**: https://github.com/odota/rapier
- **OpenDota API**: https://docs.opendota.com/
- **Discord**: Join Dota 2 dev communities

## Resources

- [Existing Tools Research](README.md#market-opportunity) - Know your competition
- [Unique Features List](ROADMAP.md#phase-3-ai-integration) - Your differentiators

---

**You're all set!** Start with `npm run dev` and begin building. 🚀
