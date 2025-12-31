# Dota 2 Coach Analyzer - Setup Guide

## Prerequisites

Make sure you have the following installed:
- Node.js 18+ ([Download here](https://nodejs.org/))
- PostgreSQL 14+ ([Download here](https://www.postgresql.org/download/))
- Redis 7+ ([Download here](https://redis.io/download/))
- Git (optional, for version control)

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm run install:all
```

Or manually:

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

### 2. Set Up Database

#### Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE dota2coach;

# Exit psql
\q
```

#### Run Database Schema

```bash
# From the project root
psql -U postgres -d dota2coach -f backend/schema.sql
```

### 3. Set Up Environment Variables

#### Backend Environment

```bash
# Copy example environment file
cp backend/.env.example backend/.env

# Edit backend/.env with your settings
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT tokens

### 4. Create Upload Directory

```bash
mkdir -p backend/uploads
```

### 5. Start Development Servers

#### Option 1: Start everything at once (from root)

```bash
npm run dev
```

This will start both frontend (port 3000) and backend (port 5000) concurrently.

#### Option 2: Start separately

Terminal 1 - Frontend:
```bash
cd frontend
npm run dev
```

Terminal 2 - Backend:
```bash
cd backend
npm run dev
```

Terminal 3 - Redis (if not running as service):
```bash
redis-server
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## Project Structure

```
dota2-coach-analyzer/
├── frontend/               # React + TypeScript frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   │   ├── UploadPage.tsx
│   │   │   └── AnalysisPage.tsx
│   │   ├── services/      # API client services
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript definitions
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── backend/               # Express + TypeScript backend
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   │   ├── replay.ts  # Replay upload
│   │   │   ├── match.ts   # Match analysis
│   │   │   └── user.ts    # User auth
│   │   ├── services/      # Business logic
│   │   │   ├── replayService.ts
│   │   │   └── matchService.ts
│   │   ├── db/            # Database connection
│   │   ├── parsers/       # Replay parsing (TODO)
│   │   ├── jobs/          # Background jobs (TODO)
│   │   └── index.ts       # Server entry point
│   ├── schema.sql         # Database schema
│   ├── package.json
│   └── tsconfig.json
│
├── README.md
├── SETUP.md
└── package.json
```

## API Endpoints

### Replay Endpoints
- `POST /api/replays/upload` - Upload a replay file

### Match Endpoints
- `GET /api/matches/:matchId/analysis` - Get analysis for a match
- `GET /api/matches/user/:userId` - Get all matches for a user

### User Endpoints (TODO)
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user

## Next Steps

### Immediate TODOs

1. **Implement Replay Parser**
   - Research and integrate a Dota 2 replay parser (odota/rapier recommended)
   - Extract match data from .dem files
   - Parse player performance metrics

2. **Database Integration**
   - Connect services to PostgreSQL
   - Implement data models
   - Add database queries for all endpoints

3. **Add Authentication**
   - Implement JWT authentication
   - Add auth middleware
   - Secure upload endpoints

4. **Implement Analysis Logic**
   - Define mistake detection algorithms
   - Calculate benchmarks vs. higher ranks
   - Generate actionable recommendations

5. **Add Background Jobs**
   - Set up Bull queue with Redis
   - Process replays asynchronously
   - Handle job failures

### Future Enhancements

- AI-powered coaching using OpenAI/Anthropic API
- Trend tracking across multiple games
- Real-time progress monitoring
- Video clip generation
- Premium subscription features

## Troubleshooting

### Port Already in Use

If ports 3000 or 5000 are already in use:

```bash
# Frontend (change in vite.config.ts)
server: { port: 3001 }

# Backend (change in .env)
PORT=5001
```

### Database Connection Issues

1. Ensure PostgreSQL is running:
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

2. Check connection string in `.env`
3. Verify database exists: `psql -l`

### Redis Connection Issues

1. Ensure Redis is running:
```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis
```

2. Check connection: `redis-cli ping` (should return PONG)

## Development Tips

- Use mock data initially to test the UI/UX before implementing full parsing
- Start with basic features and iterate
- Test with real .dem files from your own matches
- Monitor console logs for errors and debugging info

## Resources

- [Dota 2 Replay Parsers Research](#)
- [OpenDota API Docs](https://docs.opendota.com/)
- [Vite Documentation](https://vitejs.dev/)
- [Express.js Guide](https://expressjs.com/)
