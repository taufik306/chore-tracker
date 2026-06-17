import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid 
} from 'recharts';
import { Chore, DailyTrendPoint, ActivityStats } from '../types';
import { 
  CheckCircle, Activity, Award, Hourglass, 
  TrendingUp, Calendar, AlertCircle 
} from 'lucide-react';

interface DashboardProps {
  chores: Chore[];
}

export default function Dashboard({ chores }: DashboardProps) {
  
  // Calculate historical performance metrics
  const stats: ActivityStats = useMemo(() => {
    const completed = chores.filter(c => c.status === 'completed');
    const cancelled = chores.filter(c => c.status === 'cancelled');
    const totalConcluded = completed.length + cancelled.length;
    
    // Average completion duration calculation:
    let avgMinutes = 0;
    if (completed.length > 0) {
      const totalMs = completed.reduce((sum, chore) => {
        const finish = chore.completedAt || Date.now();
        return sum + (finish - chore.startTime);
      }, 0);
      avgMinutes = Math.round(totalMs / (1000 * 60 * completed.length));
    }

    return {
      totalCreated: chores.length,
      totalCompleted: completed.length,
      totalCancelled: cancelled.length,
      completionRate: totalConcluded > 0 ? Math.round((completed.length / totalConcluded) * 100) : 100,
      averageCompletedDurationMinutes: avgMinutes
    };
  }, [chores]);

  // Generate 7-day weekly trend points (last 7 days backwards from today)
  const weeklyTrends: DailyTrendPoint[] = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trendMap: { [dateStr: string]: { completed: number; active: number; dayName: string } } = {};

    // Prime the last 7 calendar days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
      const dayName = days[d.getDay()];
      trendMap[dateStr] = { completed: 0, active: 0, dayName };
    }

    // Allocate chores to these days based on completion dates or start dates
    chores.forEach(chore => {
      if (chore.status === 'completed' && chore.completedAt) {
        const compDateObj = new Date(chore.completedAt);
        const compDateStr = compDateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
        if (trendMap[compDateStr]) {
          trendMap[compDateStr].completed += 1;
        }
      } else if (chore.status === 'active') {
        const startDateObj = new Date(chore.startTime);
        const startDateStr = startDateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
        if (trendMap[startDateStr]) {
          trendMap[startDateStr].active += 1;
        }
      }
    });

    return Object.keys(trendMap).map(key => ({
      dateStr: key,
      dayName: trendMap[key].dayName,
      completedCount: trendMap[key].completed,
      activeCount: trendMap[key].active,
    }));
  }, [chores]);

  // Daily chore completed completion target calculation for today
  const todayProgress = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const todayChores = chores.filter(c => c.createdAt >= todayStartMs || (c.completedAt && c.completedAt >= todayStartMs));
    const completedToday = todayChores.filter(c => c.status === 'completed').length;
    const activeToday = todayChores.filter(c => c.status === 'active').length;
    const totalToday = todayChores.length;

    const percent = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

    return {
      completedToday,
      activeToday,
      totalToday,
      percent
    };
  }, [chores]);

  return (
    <div id="dashboard-tab-content" className="space-y-6">
      
      {/* Today's Goal Progress Circle section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Progress circular representation card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between col-span-1 md:col-span-1">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Daily Target</span>
            <h3 className="text-2xl font-bold text-slate-850 dark:text-slate-100">{todayProgress.percent}%</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {todayProgress.completedToday} of {todayProgress.totalToday} completed today
            </p>
          </div>
          
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            {/* Custom SVG gauge circle to bypass external components */}
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                className="stroke-slate-100 dark:stroke-slate-800 fill-none"
                strokeWidth="5"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                className="stroke-indigo-650 dark:stroke-indigo-550 fill-none transition-all duration-1000"
                strokeWidth="5"
                strokeDasharray={175.92}
                strokeDashoffset={175.92 - (175.92 * todayProgress.percent) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-slate-700 dark:text-slate-300">
              {todayProgress.completedToday}/{todayProgress.totalToday}
            </span>
          </div>
        </div>

        {/* Completion summary rate metric */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Success Rate</span>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.completionRate}%</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Ratio of completed over cancelled chores</p>
          </div>
        </div>

        {/* Time duration average card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Hourglass className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg. Completion Time</span>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {stats.averageCompletedDurationMinutes} <span className="text-sm font-normal text-slate-500">mins</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Average time taken to resolve active chores</p>
          </div>
        </div>
      </div>

      {/* Historical totals metrics bento-grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-850">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Chores</span>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.totalCreated}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-850">
          <span className="text-[10px] uppercase font-bold text-emerald-500">Completed Chores</span>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.totalCompleted}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-850">
          <span className="text-[10px] uppercase font-bold text-slate-400">Active Handlers</span>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">
            {chores.filter(c => c.status === 'active').length}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-850">
          <span className="text-[10px] uppercase font-bold text-rose-500">Cancelled Chores</span>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.totalCancelled}</p>
        </div>
      </div>

      {/* Weekly trend performance review */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Weekly Chore Completion Trend
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Daily breakdown of completed tasks over the past 7 days</p>
          </div>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Last Week
          </span>
        </div>

        {/* Visual Charts Canvas */}
        <div className="h-64 relative font-sans text-xs">
          {chores.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-1.5">
              <AlertCircle className="w-7 h-7 text-slate-300" />
              <p className="text-xs">Chore statistics will appear once chores are initialized.</p>
            </div>
          ) : (
            <div className="w-full h-full pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrends} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="dayName" 
                    stroke="#94a3b8" 
                    tickLine={false} 
                    axisLine={false} 
                    dy={12}
                    style={{ fontSize: '10px' }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    tickLine={false} 
                    axisLine={false} 
                    style={{ fontSize: '10px' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ 
                      borderRadius: '12px', 
                      background: '#0f172a', 
                      border: 'none', 
                      color: '#f8fafc',
                      fontSize: '11px',
                      padding: '8px 12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completedCount" 
                    name="Completed Chores" 
                    stroke="#4f46e5" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#completedGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
