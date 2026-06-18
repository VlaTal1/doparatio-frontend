// ─── Enums ──────────────────────────────────────────────
export type Difficulty = 'ROUTINE' | 'MEDIUM' | 'HARD';
export type LogType = 'BINARY' | 'NUMERIC';

// ─── DTOs (mirrors backend) ────────────────────────────
export interface TaskLogDTO {
  id?: number;
  logDate: string; // YYYY-MM-DD
}

export interface TaskDTO {
  id?: number;
  name: string;
  difficulty: Difficulty;
  recurring: boolean;
  dueDate?: string | null; // YYYY-MM-DD
  scheduleDays?: number[] | null;
  active: boolean;
  userId?: string;
  logs?: TaskLogDTO[];
}

export interface HabitLogDTO {
  id?: number;
  logDate: string; // YYYY-MM-DD
  currentValue?: number;
}

export interface HabitDTO {
  id?: number;
  name: string;
  icon: string;
  color: string; // 6-char hex without #
  logType: LogType;
  targetValue: number;
  scheduleDays?: number[] | null;
  active: boolean;
  userId?: string;
  logs?: HabitLogDTO[];
  totalExecutions?: number;
  completedDays?: number;
  bestStreak?: number;
}

export interface UserBalanceDTO {
  userId: string;
  balance: number;
}

export interface AuthValidateResponse {
  valid: boolean;
  role?: string;
  personId?: string;
  personName?: string;
  message?: string;
}

// ─── Difficulty config ─────────────────────────────────
export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; minutes: number; emoji: string }> = {
  ROUTINE: { label: 'Routine', minutes: 5, emoji: '📋' },
  MEDIUM:  { label: 'Medium',  minutes: 15, emoji: '⚡' },
  HARD:    { label: 'Hard',    minutes: 30, emoji: '🔥' },
};

// ─── Streak bonus table ────────────────────────────────
export const STREAK_BONUSES = [
  { minDays: 31, bonus: 10, total: 20 },
  { minDays: 15, bonus: 7,  total: 17 },
  { minDays: 8,  bonus: 5,  total: 15 },
  { minDays: 4,  bonus: 2,  total: 12 },
  { minDays: 1,  bonus: 0,  total: 10 },
];
