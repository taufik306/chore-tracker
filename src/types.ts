export type PriorityLevel = 'low' | 'medium' | 'high';
export type ChoreStatus = 'active' | 'completed' | 'cancelled';

export interface Chore {
  id: string;
  userId: string;
  title: string;
  priority: PriorityLevel;
  limitMinutes: number | null; // null represents no time limit
  startTime: number; // Milliseconds timestamp
  status: ChoreStatus;
  completedAt: number | null; // Milliseconds timestamp
  createdAt: number; // Milliseconds timestamp
  updatedAt: number; // Milliseconds timestamp
}

export interface AppNotification {
  id: string;
  choreId: string;
  choreTitle: string;
  type: 'timeout' | 'one-day-warning';
  timestamp: number;
  read: boolean;
}

export interface ActivityStats {
  totalCreated: number;
  totalCompleted: number;
  totalCancelled: number;
  completionRate: number;
  averageCompletedDurationMinutes: number;
}

export interface DailyTrendPoint {
  dayName: string;
  dateStr: string;
  completedCount: number;
  activeCount: number;
}
