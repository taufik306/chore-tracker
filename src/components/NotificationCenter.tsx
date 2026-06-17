import React from 'react';
import { Bell, Trash, Check, Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function NotificationCenter({ 
  notifications, 
  onMarkRead, 
  onClearAll, 
  isOpen, 
  onToggle 
}: NotificationCenterProps) {
  
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" id="notifications-control-root">
      
      {/* Trigger Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={onToggle}
        className="relative p-2.5 bg-slate-105 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer text-slate-600 dark:text-slate-300"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-950 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Transparent click backdrop */}
          <div className="fixed inset-0 z-40" onClick={onToggle} />
          
          <div 
            id="notifications-dropdown-card"
            className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl z-50 overflow-hidden transform origin-top-right animate-fade-in"
          >
            <div className="p-4 border-b border-slate-105 dark:border-slate-850 flex items-center justify-between bg-slate-50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-semibold text-slate-850 dark:text-slate-100">Reminder Alerts</h3>
                {unreadCount > 0 && (
                  <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded">
                    {unreadCount} New
                  </span>
                )}
              </div>

              {notifications.length > 0 && (
                <button
                  id="notifications-clear-all"
                  onClick={onClearAll}
                  className="text-[10px] text-slate-500 hover:text-rose-600 font-medium flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Trash className="w-3.5 h-3.5" />
                  Clear All
                </button>
              )}
            </div>

            {/* Notification List Panel */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-600">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs">No notifications yet</p>
                  <p className="text-[10px] mx-auto max-w-xs mt-1 text-slate-500 leading-relaxed">
                    We will notify you with custom chime alerts when time-limited chores run out or 24-hour limits expire.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isRead = notif.read;
                  return (
                    <div 
                      key={notif.id}
                      className={`p-3.5 flex items-start gap-3 transition-colors ${
                        isRead ? 'bg-white dark:bg-slate-950 opacity-70' : 'bg-slate-50/50 dark:bg-slate-900/10'
                      }`}
                    >
                      {/* Left icon wrapper */}
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        notif.type === 'timeout' 
                          ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/20 dark:text-rose-400' 
                          : 'bg-amber-50 text-amber-500 dark:bg-amber-950/20 dark:text-amber-400'
                      }`}>
                        {notif.type === 'timeout' ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>

                      {/* Content panel */}
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs text-slate-800 dark:text-slate-200 leading-normal ${!isRead ? 'font-medium' : ''}`}>
                            {notif.type === 'timeout' ? (
                              <span>Time limit has expired for chore <strong className="font-semibold">{notif.choreTitle}</strong></span>
                            ) : (
                              <span>Activity <strong className="font-semibold">{notif.choreTitle}</strong> has been running for over 1 day!</span>
                            )}
                          </p>
                          
                          {!isRead && (
                            <button
                              id={`mark-read-btn-${notif.id}`}
                              onClick={() => onMarkRead(notif.id)}
                              className="text-[10px] p-1 text-slate-400 hover:text-emerald-500 rounded hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-2 border-t border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/20 text-center">
              <span className="text-[10px] text-slate-400">
                Supports background alarm chime sound alerts!
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
