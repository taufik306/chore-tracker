import React, { useState, useEffect } from 'react';
import { Play, Check, AlertTriangle, Clock, ArrowUpDown, Trash, Search } from 'lucide-react';
import { Chore, PriorityLevel } from '../types';

interface ActiveListProps {
  chores: Chore[];
  onCompleteChore: (id: string) => Promise<void>;
  onCancelChore: (id: string) => Promise<void>;
  onClearCompleted: () => void;
}

type SortOption = 'startTimeDesc' | 'startTimeAsc' | 'priority' | 'remainingTime';

export default function ActiveList({ chores, onCompleteChore, onCancelChore }: ActiveListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('startTimeDesc');
  const [filterSearch, setFilterSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Dynamic ticking clock for tracking elapsed real-time countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeChores = chores.filter(c => c.status === 'active');

  // Multi-attribute sorting algorithm
  const getSortedAndFiltered = () => {
    let result = [...activeChores];

    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase().trim();
      result = result.filter(c => c.title.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      if (sortBy === 'startTimeDesc') {
        return b.startTime - a.startTime;
      }
      if (sortBy === 'startTimeAsc') {
        return a.startTime - b.startTime;
      }
      if (sortBy === 'priority') {
        const priorityWeights = { high: 3, medium: 2, low: 1 };
        const weightDiff = priorityWeights[b.priority] - priorityWeights[a.priority];
        if (weightDiff !== 0) return weightDiff;
        return b.startTime - a.startTime; // fallback to start time
      }
      if (sortBy === 'remainingTime') {
        const remainingA = a.limitMinutes ? (a.startTime + (a.limitMinutes * 60000) - currentTime) : Infinity;
        const remainingB = b.limitMinutes ? (b.startTime + (b.limitMinutes * 60000) - currentTime) : Infinity;
        return remainingA - remainingB;
      }
      return 0;
    });

    return result;
  };

  const sortedChores = getSortedAndFiltered();

  const formatElapsedTime = (startMs: number) => {
    const totalSecs = Math.floor((currentTime - startMs) / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    let res = '';
    if (hrs > 0) res += `${hrs}h `;
    if (mins > 0 || hrs > 0) res += `${mins}m `;
    res += `${secs}s`;
    return res;
  };

  const getTimerDetails = (chore: Chore) => {
    const isLimited = chore.limitMinutes !== null;
    const startMs = chore.startTime;

    if (isLimited) {
      const allowedDurationMs = chore.limitMinutes! * 60000;
      const endMs = startMs + allowedDurationMs;
      const timeLeftMs = endMs - currentTime;
      const progressPercent = Math.max(0, Math.min(100, (1 - timeLeftMs / allowedDurationMs) * 100));
      const hasExpired = timeLeftMs <= 0;

      const deltaAbs = Math.abs(timeLeftMs);
      const absMins = Math.floor(deltaAbs / 60000);
      const absSecs = Math.floor((deltaAbs % 60000) / 1000);

      return {
        isLimited: true,
        hasExpired,
        progressPercent,
        displayLabel: hasExpired 
          ? `Expired by ${absMins}m ${absSecs}s` 
          : `${absMins}m ${absSecs}s remaining`,
        elapsed: formatElapsedTime(startMs)
      };
    } else {
      const elapsedMs = currentTime - startMs;
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const hasExpired = elapsedMs >= ONE_DAY_MS;

      return {
        isLimited: false,
        hasExpired,
        progressPercent: Math.min(100, (elapsedMs / ONE_DAY_MS) * 100),
        displayLabel: hasExpired ? `Exceeded 1 Day Limit!` : `Ongoing (No time limit)`,
        elapsed: formatElapsedTime(startMs)
      };
    }
  };

  return (
    <div id="active-list-container" className="space-y-4">
      {/* Search and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
          <input
            id="active-search-input"
            type="text"
            placeholder="Search ongoing activities..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            id="active-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="startTimeDesc">Start Time: Newest</option>
            <option value="startTimeAsc">Start Time: Oldest</option>
            <option value="priority">Priority: High to Low</option>
            <option value="remainingTime">Remaining Timer</option>
          </select>
        </div>
      </div>

      {sortedChores.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-950/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
          <div className="inline-flex p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-full text-indigo-500 mb-2">
            <Play className="w-6 h-6 rotate-45" />
          </div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">No active activities</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {filterSearch ? 'Match standard not found for query filter.' : "You are currently holding no pending chores. Initiate an activity record from the entry list format on the sidebar!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {sortedChores.map((chore) => {
            const timer = getTimerDetails(chore);
            
            return (
              <div
                key={chore.id}
                id={`chore-card-${chore.id}`}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm transition-all duration-300 relative overflow-hidden ${
                  timer.hasExpired
                    ? 'border-rose-200 dark:border-rose-950/40 ring-1 ring-rose-500/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Expired alert accent light */}
                {timer.hasExpired && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
                )}

                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Priority Tag */}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide ${
                        chore.priority === 'high'
                          ? 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30'
                          : chore.priority === 'medium'
                          ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30'
                          : 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30'
                      }`}>
                        {chore.priority}
                      </span>

                      {/* Over budget Warning Badge */}
                      {timer.hasExpired && (
                        <span className="flex items-center gap-1 text-[10px] bg-rose-500 text-white font-medium px-2 py-0.5 rounded-full animate-bounce">
                          <AlertTriangle className="w-3 h-3" />
                          Time Out
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1.5 break-words max-w-md">
                      {chore.title}
                    </h4>

                    {/* Metadata indicators */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Elapsed: <span className="font-mono text-slate-700 dark:text-slate-200">{timer.elapsed}</span>
                      </span>
                      
                      <span className={`flex items-center gap-1 ${
                        timer.hasExpired 
                          ? 'text-rose-600 dark:text-rose-400 font-semibold' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        <span>⏲</span>
                        {timer.displayLabel}
                      </span>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      id={`complete-btn-${chore.id}`}
                      onClick={() => onCompleteChore(chore.id)}
                      title="Mark task as complete"
                      className="p-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white dark:bg-emerald-950/20 dark:hover:bg-emerald-600 dark:text-emerald-400 dark:hover:text-white rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      id={`cancel-btn-${chore.id}`}
                      onClick={() => onCancelChore(chore.id)}
                      title="Discard and cancel activity"
                      className="p-2.5 bg-slate-50 hover:bg-rose-50 dark:bg-slate-950 dark:hover:bg-rose-950/20 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar background indicator */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div
                    style={{ width: `${timer.progressPercent}%` }}
                    className={`h-full transition-all duration-1000 ${
                      timer.hasExpired
                        ? 'bg-gradient-to-r from-rose-500 to-red-600 animate-pulse'
                        : 'bg-gradient-to-r from-indigo-500 to-violet-600'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
