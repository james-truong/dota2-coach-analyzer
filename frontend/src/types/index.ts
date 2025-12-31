// Shared TypeScript types for the frontend

export interface User {
  id: string;
  email: string;
  username: string;
  steamId?: string;
  subscriptionTier: 'free' | 'premium' | 'pro';
  createdAt: string;
}

export interface Match {
  id: string;
  userId: string;
  matchId: number;
  replayFileUrl?: string;
  gameMode: string;
  lobbyType: string;
  duration: number;
  radiantWin: boolean;
  startTime: number;
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  parsedAt: string;
  createdAt: string;
}

export interface PlayerPerformance {
  id: string;
  matchId: string;
  userId?: string;
  isPrimaryPlayer: boolean;
  heroId: number;
  heroName: string;
  heroImage?: string;
  playerSlot: number;
  team: 'radiant' | 'dire';

  // Core stats
  kills: number;
  deaths: number;
  assists: number;
  lastHits: number;
  denies: number;
  goldPerMin: number;
  xpPerMin: number;
  heroDamage: number;
  towerDamage: number;
  heroHealing: number;
  level: number;

  // Advanced stats
  netWorth: number;
  campsStacked: number;
  runesPickedUp: number;
  observerWardsPlaced: number;
  sentryWardsPlaced: number;
  wardsDestroyed: number;
  stunsDuration: number;

  finalItems?: number[];
}

export interface MatchInsight {
  id: string;
  matchId: string;
  playerPerformanceId: string;
  insightType: 'mistake' | 'missed_opportunity' | 'good_play';
  category: 'positioning' | 'itemization' | 'farm_efficiency' | 'vision' | 'teamfight' | 'decision_making';
  severity: 'low' | 'medium' | 'high' | 'critical';
  gameTime?: number;
  title: string;
  description: string;
  recommendation: string;
  mapX?: number;
  mapY?: number;
  createdAt: string;
}

export interface PlayerTrend {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  totalMatches: number;
  wins: number;
  losses: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgLastHits: number;
  avgGpm: number;
  avgXpm: number;
  totalCriticalMistakes: number;
  totalHighMistakes: number;
  totalMediumMistakes: number;
  topMistakeCategories: string[];
  mistakeReductionRate?: number;
}

export interface PlayerHabit {
  id: string;
  userId: string;
  habitType: string;
  category: string;
  occurrences: number;
  firstDetectedAt: string;
  lastDetectedAt: string;
  status: 'active' | 'improving' | 'resolved';
  improvementPercentage: number;
  description: string;
}

export interface AnalysisResult {
  match: Match;
  playerPerformance: PlayerPerformance;
  insights: MatchInsight[];
  summary: {
    criticalMistakes: number;
    highMistakes: number;
    mediumMistakes: number;
    lowMistakes: number;
    topCategories: string[];
  };
}
