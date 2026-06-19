import React, { useState } from 'react';
import { Plus, Timer, Zap, AlertCircle } from 'lucide-react';
import { PriorityLevel } from '../types';

interface ChoreFormProps {
  onAddChore: (title: string, priority: PriorityLevel, limitMinutes: number | null) => Promise<void>;
  isSubmitting: boolean;
}

export default function ChoreForm({ onAddChore, isSubmitting }: ChoreFormProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [limitMinutes, setLimitMinutes] = useState<number>(30);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg('Please specify what activity you are commencing.');
      return;
    }

    if (trimmedTitle.length > 200) {
      setErrorMsg('Chore title must be 200 characters or fewer.');
      return;
    }

    if (hasTimeLimit && (limitMinutes === null || limitMinutes <= 0)) {
      setErrorMsg('Please specify a valid time limit in minutes.');
      return;
    }

    try {
      await onAddChore(
        trimmedTitle, 
        priority, 
        hasTimeLimit ? Number(limitMinutes) : null
      );
      // Reset form save for priority presets
      setTitle('');
      setHasTimeLimit(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating activity task.');
    }
  };

  const setPresetMinutes = (mins: number) => {
    setHasTimeLimit(true);
    setLimitMinutes(mins);
  };

  return (
    <form 
      id="chore-creation-form"
      onSubmit={handleSubmit} 
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-500 animate-pulse" />
            Commence Chore
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record what you are doing at this moment.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900/30">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Title Field */}
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between items-center">
          <label htmlFor="chore-title" className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Activity / Chore Name
          </label>
          <span className={`text-[10px] font-medium transition-colors ${title.length > 180 ? 'text-amber-500 font-bold' : 'text-slate-450 dark:text-slate-500'}`}>
            {title.length}/200
          </span>
        </div>
        <input
          id="chore-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="e.g. Unpacking groceries, vacuuming bedroom, organizing drawers"
          disabled={isSubmitting}
          className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
        />
      </div>

      {/* Priority Selection */}
      <div className="space-y-2 mb-5">
        <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
          Priority Level (Leave it as medium if you're not sure)
        </span>
        <div className="grid grid-cols-3 gap-2">
          {(['low', 'medium', 'high'] as PriorityLevel[]).map((level) => {
            const isSelected = priority === level;
            return (
              <button
                key={level}
                type="button"
                id={`priority-btn-${level}`}
                disabled={isSubmitting}
                onClick={() => setPriority(level)}
                className={`py-2 px-3 rounded-xl border text-xs font-medium capitalize text-center transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? level === 'high'
                      ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-500 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/10'
                      : level === 'medium'
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/10'
                      : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/10'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Limit Setup */}
      <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-850 mb-5 space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="time-limit-toggle" className="flex items-center gap-2 cursor-pointer">
            <Timer className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Enforce a time limit
            </span>
          </label>
          <input
            id="time-limit-toggle"
            type="checkbox"
            checked={hasTimeLimit}
            onChange={(e) => setHasTimeLimit(e.target.checked)}
            disabled={isSubmitting}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
          />
        </div>

        {hasTimeLimit && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <input
                id="chore-limit"
                type="number"
                min="1"
                max="1440"
                value={limitMinutes || ''}
                onChange={(e) => setLimitMinutes(e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="Minutes"
                disabled={isSubmitting}
                className="w-24 text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-center"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                minutes limit
              </span>
            </div>

            {/* Presets and helpers */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[5, 15, 30, 45, 60, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  id={`preset-${mins}-mins`}
                  disabled={isSubmitting}
                  onClick={() => setPresetMinutes(mins)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                    limitMinutes === mins && hasTimeLimit
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        id="submit-chore-btn"
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        {isSubmitting ? 'Syncing Activity...' : 'Start Activity Code'}
      </button>
    </form>
  );
}
