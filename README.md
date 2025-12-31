# Dota 2 Coach Analyzer

An AI-powered tool that analyzes Dota 2 replays and provides personalized coaching insights to help players improve their gameplay.

## Features (MVP)

- Upload and parse Dota 2 replay files (.dem)
- Extract key performance metrics (KDA, CS, GPM, XPM, positioning)
- Identify critical mistakes and missed opportunities
- Generate actionable coaching tips based on match analysis
- Track improvement trends across multiple games

## Tech Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Recharts for data visualization
- React Router for navigation

### Backend
- Node.js + Express + TypeScript
- PostgreSQL for data persistence
- Redis for caching and job queue
- Bull for async replay processing
- Dota 2 replay parser (Clarity or Manta)

### Infrastructure
- Frontend: Vercel/Netlify
- Backend: Railway/Render
- Database: PostgreSQL (hosted)
- Storage: AWS S3 for replay files

## Project Structure

```
dota2-coach-analyzer/
├── frontend/               # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API client services
│   │   └── types/         # TypeScript type definitions
│   └── package.json
│
├── backend/               # Express API server
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic
│   │   ├── parsers/       # Replay parsing logic
│   │   ├── models/        # Database models
│   │   ├── jobs/          # Background job processors
│   │   └── utils/         # Utility functions
│   └── package.json
│
├── shared/                # Shared types and utilities
│   └── types/             # TypeScript interfaces
│
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- pnpm (recommended) or npm

### Installation

1. Clone the repository
2. Install dependencies for both frontend and backend
3. Set up environment variables
4. Run database migrations
5. Start development servers

## Roadmap

### Phase 1: MVP (Current)
- [ ] Basic replay upload and parsing
- [ ] Extract core statistics
- [ ] Simple mistake detection
- [ ] User authentication
- [ ] Match history dashboard

### Phase 2: Enhanced Analysis
- [ ] AI-powered coaching tips using LLM
- [ ] Multi-game trend tracking
- [ ] Role-specific analysis
- [ ] Comparative benchmarking vs. higher ranks

### Phase 3: Advanced Features
- [ ] Real-time analysis integration
- [ ] Video clip generation
- [ ] Team synergy analysis
- [ ] Mobile-responsive design improvements

### Phase 4: Monetization
- [ ] Freemium tier implementation
- [ ] Payment integration (Stripe)
- [ ] Premium feature gates
- [ ] Subscription management

## Contributing

This is currently a private project under development.

## License

TBD
