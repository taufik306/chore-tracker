import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  writeBatch,
  deleteDoc,
  updateDoc,
  limit 
} from 'firebase/firestore';

import { 
  auth, 
  db, 
  googleProvider,
  testFirebaseConnection 
} from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/error-handler';
import { Chore, AppNotification, PriorityLevel } from './types';
import { sound } from './utils/sound';

// Components
import ChoreForm from './components/ChoreForm';
import ActiveList from './components/ActiveList';
import Dashboard from './components/Dashboard';
import NotificationCenter from './components/NotificationCenter';

// Icons
import { 
  TrendingUp, 
  Activity, 
  LogOut, 
  Moon, 
  Sun, 
  Wifi, 
  WifiOff, 
  User as UserIcon, 
  Sparkles,
  ClipboardList,
  History,
  Trash2,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // App states
  const [chores, setChores] = useState<Chore[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedAt, setLastCreatedAt] = useState(0);

  // Active view tab state: 'active-chores' | 'history' | 'dashboard'
  const [activeTab, setActiveTab] = useState<'active-chores' | 'history' | 'dashboard'>('active-chores');

  // Theme settings
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  // Trackers for already beeped deadlines to prevent redundant sounds
  const [alertedChoreIds, setAlertedChoreIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('alertedChoreIds');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // 1. Connection Monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      testFirebaseConnection();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection proofing
    testFirebaseConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Dark/Light Theme Orchestrator
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 3. Auth Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        setIsGuestMode(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 4. Data Sync Layer - Combines Guests with Clouds
  useEffect(() => {
    // Guest Mode: Rely fully on LocalStorage
    if (isGuestMode || (!user && !authLoading)) {
      const cached = localStorage.getItem('local_guest_chores');
      if (cached) {
        try {
          setChores(JSON.parse(cached));
        } catch (e) {
          console.error("Local chores schema mismatch:", e);
        }
      } else {
        setChores([]);
      }
      return;
    }

    // Cloud Mode: Subscribe to Firestore onSnapshot
    if (user) {
      const pathStr = 'chores';
      const q = query(
        collection(db, pathStr),
        where('userId', '==', user.uid),
        limit(500)
      );
      
      const unsubscribeSnap = onSnapshot(q, (snapshot) => {
        const loaded: Chore[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push(docSnap.data() as Chore);
        });
        setChores(loaded);
      }, (error) => {
        // Mandatory error handling context callback!
        handleFirestoreError(error, OperationType.LIST, pathStr);
      });

      return () => unsubscribeSnap();
    }
  }, [user, isGuestMode, authLoading]);

  // Save guest status locally upon change
  useEffect(() => {
    if (isGuestMode || !user) {
      if (chores.length === 0) {
        localStorage.removeItem('local_guest_chores');
      } else {
        localStorage.setItem('local_guest_chores', JSON.stringify(chores));
      }
    }
  }, [chores, isGuestMode, user]);

  // 5. Dynamic Background Alarm Chimes and Notifications Ticker
  useEffect(() => {
    const checkingInterval = setInterval(() => {
      const activeChores = chores.filter(c => c.status === 'active');
      const now = Date.now();
      let alertTriggered = false;

      activeChores.forEach((chore) => {
        // Condition A: Time-limited chore expired
        if (chore.limitMinutes !== null) {
          const limitMs = chore.limitMinutes * 60000;
          const endMs = chore.startTime + limitMs;
          if (now >= endMs && !alertedChoreIds.includes(chore.id)) {
            // Log alarm warning!
            sound.playDeadlineAlarm();
            alertTriggered = true;

            const notif: AppNotification = {
              id: `notif-limit-${chore.id}-${now}`,
              choreId: chore.id,
              choreTitle: chore.title,
              type: 'timeout',
              timestamp: now,
              read: false
            };

            setNotifications(prev => [notif, ...prev]);
            setAlertedChoreIds(prev => {
              const next = [...prev, chore.id];
              localStorage.setItem('alertedChoreIds', JSON.stringify(next));
              return next;
            });
          }
        } 
        // Condition B: Unlimited chore run over 24 hours
        else {
          const ONE_DAY_MS = 24 * 60 * 60 * 1000;
          const expirationMs = chore.startTime + ONE_DAY_MS;
          if (now >= expirationMs && !alertedChoreIds.includes(chore.id)) {
            // Play warning double-beep!
            sound.playNotificationChime();
            alertTriggered = true;

            const notif: AppNotification = {
              id: `notif-24h-${chore.id}-${now}`,
              choreId: chore.id,
              choreTitle: chore.title,
              type: 'one-day-warning',
              timestamp: now,
              read: false
            };

            setNotifications(prev => [notif, ...prev]);
            setAlertedChoreIds(prev => {
              const next = [...prev, chore.id];
              localStorage.setItem('alertedChoreIds', JSON.stringify(next));
              return next;
            });
          }
        }
      });
    }, 4500); // Check boundaries periodically

    return () => clearInterval(checkingInterval);
  }, [chores, alertedChoreIds]);

  // 6. Action: Add Chore Commencing
  const handleAddChore = async (title: string, priority: PriorityLevel, limitMinutes: number | null) => {
    const now = Date.now();
    if (now - lastCreatedAt < 2000) {
      throw new Error('Please wait a moment before adding another chore.');
    }
    setLastCreatedAt(now);

    setIsSubmitting(true);
    
    const newChoreId = user ? doc(collection(db, 'chores')).id : `local-${now}-${Math.random().toString(36).substr(2, 4)}`;
    const newChore: Chore = {
      id: newChoreId,
      userId: user ? user.uid : 'guest-uid',
      title,
      priority,
      limitMinutes,
      startTime: now,
      status: 'active',
      completedAt: null,
      createdAt: now,
      updatedAt: now
    };

    if (user) {
      const pathStr = `chores/${newChoreId}`;
      try {
        await setDoc(doc(db, 'chores', newChoreId), newChore);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, pathStr);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Offline guest fallback
      setChores(prev => [newChore, ...prev]);
      setIsSubmitting(false);
    }
  };

  // 7. Action: Complete Chore
  const handleCompleteChore = async (id: string) => {
    const now = Date.now();
    if (user) {
      const pathStr = `chores/${id}`;
      try {
        await updateDoc(doc(db, 'chores', id), {
          status: 'completed',
          completedAt: now,
          updatedAt: now
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, pathStr);
      }
    } else {
      setChores(prev => prev.map(c => c.id === id ? { ...c, status: 'completed', completedAt: now, updatedAt: now } : c));
    }
  };

  // 8. Action: Cancel/Discard Chore
  const handleCancelChore = async (id: string) => {
    const now = Date.now();
    if (user) {
      const pathStr = `chores/${id}`;
      try {
        await updateDoc(doc(db, 'chores', id), {
          status: 'cancelled',
          completedAt: now,
          updatedAt: now
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, pathStr);
      }
    } else {
      setChores(prev => prev.map(c => c.id === id ? { ...c, status: 'cancelled', completedAt: now, updatedAt: now } : c));
    }
  };

  // Action: Hard delete historical records
  const handleDeleteChore = async (id: string) => {
    if (user) {
      const pathStr = `chores/${id}`;
      try {
        await deleteDoc(doc(db, 'chores', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, pathStr);
      }
    } else {
      setChores(prev => prev.filter(c => c.id !== id));
    }
  };

  // 9. Auth Actions
  const handleGoogleLogin = async () => {
    try {
      setAuthLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Popup authenticated error:", error);
      alert("Sign in sequence failed. You can launch using Local Guest Mode instead!");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setChores([]);
      setIsGuestMode(false);
      localStorage.removeItem('local_guest_chores');
    } catch (e) {
      console.error("Signout error:", e);
    }
  };

  const handleClearLocalData = () => {
    const confirmClear = window.confirm(
      "Are you sure you want to permanently delete all guest chores stored on this device? This action cannot be undone."
    );
    if (confirmClear) {
      localStorage.removeItem('local_guest_chores');
      setChores([]);
    }
  };

  const handleMarkNotificationRead = (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  // Calculate stats overview for filtered tables
  const resolvedChores = chores.filter(c => c.status === 'completed' || c.status === 'cancelled');

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-550 border-t-transparent" />
          <p className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            CONNECTING PERSISTENCE SERVICES...
          </p>
        </div>
      </div>
    );
  }

  // Welcome Landing Page (Not logged in and not guest)
  if (!user && !isGuestMode) {
    return (
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        
        {/* Pitch Hero Panel */}
        <div className="lg:col-span-7 flex flex-col justify-between p-8 lg:p-12 bg-slate-900 text-white relative overflow-hidden">
          {/* Ambient gradient */}
          <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-tr from-indigo-950/40 via-transparent to-transparent pointer-events-none" />
          
          <div className="flex items-center gap-2 relative z-10">
            <ClipboardList className="w-6 h-6 text-indigo-405" />
            <span className="font-header tracking-wider text-sm font-bold uppercase text-slate-300">Chore Tracker Platform</span>
          </div>

          <div className="my-auto max-w-xl space-y-5 relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/60 border border-indigo-900/60 px-3 py-1 rounded-full w-max block">
              Offline-First Sync Engine
            </span>
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              A daily chore activities tracker with cloud orchestration.
            </h1>
            <p className="text-sm lg:text-base text-slate-300 leading-relaxed">
              Record activities commencing right now, enforce optional time targets, and rely on client-side cache persistence with browser synthesized chime alarms that alert you when boundaries are exceeded.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Dynamic Counter Clock</h3>
                <p className="text-xs text-slate-300 mt-1">Checklist timestamps representcommencing actions with real-time remaining countdowns.</p>
              </div>
              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Zero-Data Loss Caching</h3>
                <p className="text-xs text-slate-300 mt-1">Queries are run against instant indexed local persistent cache and queued for sync once internet returns.</p>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 relative z-10 flex items-center gap-2">
            <span>Enterprise Cache Enabled</span>
            <span>•</span>
            <span>Google Web standard</span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-5 flex flex-col justify-center p-8 lg:p-16 bg-white dark:bg-slate-950">
          <div className="max-w-md w-full mx-auto space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-850 dark:text-slate-100">
                Join Sync Space
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure access with your credentials to sync progress seamlessly across mobile, tablet, and desktop devices.
              </p>
            </div>

            <div className="space-y-4">
              {/* Google Login Trigger */}
              <button
                id="sign-in-google-btn"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-850 text-white text-xs font-semibold py-3.5 px-4 rounded-xl border border-slate-800 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
              >
                <span className="text-base">🔑</span>
                Sign in with Google credentials
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-150 dark:border-slate-850"></div>
                <span className="flex-shrink mx-4 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Or bypass credentials</span>
                <div className="flex-grow border-t border-slate-150 dark:border-slate-850"></div>
              </div>

              {/* Guest local Trigger */}
              <button
                id="continue-guest-btn"
                onClick={() => setIsGuestMode(true)}
                className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-805 text-slate-700 dark:text-slate-300 text-xs font-semibold py-3 px-4 rounded-xl transition-all cursor-pointer text-center"
              >
                Continue as Offline Guest
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-left">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                ⚠️ Guest Data Notice
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-500 leading-normal">
                Guest data is stored in your browser's local storage and is not encrypted. Sign in for secure cloud-backed storage.
              </p>
            </div>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Top Banner Toolbar Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-150 dark:border-slate-850 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-850 dark:text-slate-100 uppercase tracking-widest">Chore Tracker</h1>
              <p className="text-[9px] text-slate-500 font-medium">Daily Activites & Counters</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Online Status Dot Badge */}
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border ${
              isOnline
                ? 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400'
            }`}>
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  Synced
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  Offline Mode
                </>
              )}
            </span>

            {/* Notification drop indicator */}
            <NotificationCenter
              notifications={notifications}
              onMarkRead={handleMarkNotificationRead}
              onClearAll={handleClearAllNotifications}
              isOpen={isNotifOpen}
              onToggle={() => setIsNotifOpen(prev => !prev)}
            />

            {/* Dark Mode toggle switcher */}
            <button
              id="theme-toggle-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle view theme color"
              className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer text-slate-600 dark:text-slate-300"
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Auth Profile widget */}
            {user ? (
              <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                    {user.displayName || 'Synced Account'}
                  </p>
                  <p className="text-[9px] text-slate-500 truncate max-w-[120px]">
                    {user.email || 'Cloud sync active'}
                  </p>
                </div>
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="user icon"
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-indigo-100" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-700">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                
                <button
                  id="auth-logout-btn"
                  onClick={handleLogout}
                  title="Sign out of credentials"
                  className="p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-900 dark:hover:bg-rose-950/20 dark:hover:text-rose-450 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {isGuestMode && (
                  <button
                    id="clear-guest-data-btn"
                    onClick={handleClearLocalData}
                    title="Clear Local Guest Data"
                    className="p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-900 dark:hover:bg-rose-950/20 dark:hover:text-rose-450 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs font-semibold">Clear Local Data</span>
                  </button>
                )}
                <button
                  id="link-google-btn"
                  onClick={handleGoogleLogin}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔑</span>
                  Sync Account
                </button>
              </div>
            )}

          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
        
        {/* Tab Selection */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-850 mb-6">
          <button
            id="tab-active-btn"
            onClick={() => setActiveTab('active-chores')}
            className={`py-2 px-4 text-xs font-bold tracking-wide uppercase border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'active-chores'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-550 dark:text-slate-450 hover:text-slate-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            Active Tracker ({chores.filter(c => c.status === 'active').length})
          </button>
          
          <button
            id="tab-dashboard-btn"
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-4 text-xs font-bold tracking-wide uppercase border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-550 dark:text-slate-450 hover:text-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Dashboard trends
          </button>

          <button
            id="tab-history-btn"
            onClick={() => setActiveTab('history')}
            className={`py-2 px-4 text-xs font-bold tracking-wide uppercase border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-550 dark:text-slate-450 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            Chore History ({resolvedChores.length})
          </button>
        </div>

        {/* Content Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel sidebar: creation of chore (is sticky only on high screens) */}
          <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
            <ChoreForm onAddChore={handleAddChore} isSubmitting={isSubmitting} />
            
            {/* Help guidelines banner card */}
            <div className="bg-gradient-to-tr from-indigo-900 to-slate-900 text-white rounded-2xl p-5 border border-indigo-950 shadow-sm space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 text-indigo-400 opacity-20">
                <Sparkles className="w-16 h-16" />
              </div>
              <h3 className="text-xs uppercase tracking-widest font-bold text-indigo-300">Platform Tips</h3>
              <ul className="text-[11px] text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span><strong>Time Limits:</strong> Set chore goals up to 24 hours. The app rings standard double buzz alarm timers once runout is reached.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span><strong>Non-Limited:</strong> Unfettered chores flag warnings automatically after continuous running for 1 day.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span><strong>Cross device sync:</strong> Authenticate via same Google Account to sync trackers instantly.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right dynamic panel viewport */}
          <div className="lg:col-span-8">
            
            {/* View: Active Chore list */}
            {activeTab === 'active-chores' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-850">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                       Active Activity Logs
                    </h2>
                    <p className="text-xs text-slate-500">Currently commencing activities and real-time ticking deadline progress</p>
                  </div>
                </div>
                
                <ActiveList 
                  chores={chores} 
                  onCompleteChore={handleCompleteChore} 
                  onCancelChore={handleCancelChore}
                  onClearCompleted={() => {}}
                />
              </div>
            )}

            {/* View: Dashboard Analysis charts */}
            {activeTab === 'dashboard' && (
              <div className="animate-fade-in space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-850">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Performance Metrics Dashboard</h2>
                    <p className="text-xs text-slate-500">Overview of completed rates, durations, and weekly trends</p>
                  </div>
                </div>

                <Dashboard chores={chores} />
              </div>
            )}

            {/* View: Chore History logs */}
            {activeTab === 'history' && (
              <div className="animate-fade-in space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-850">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Historical Chores</h2>
                    <p className="text-xs text-slate-500 font-medium">Archive registers of completed or cancelled activities</p>
                  </div>
                </div>

                {resolvedChores.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
                    <History className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-slate-750 dark:text-slate-350">No history registered</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Conclude active chores or discard trials to build metric registry archives.</p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-850">
                            <th className="py-3 px-4">Chore details</th>
                            <th className="py-3 px-4">Date Commenced</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4 text-right">Delete</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-105 dark:divide-slate-850 text-xs">
                          {resolvedChores.map((chore) => {
                            const isCompleted = chore.status === 'completed';
                            const dateStr = new Date(chore.startTime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            });
                            const timeStr = new Date(chore.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                            
                            return (
                              <tr key={chore.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                <td className="py-3.5 px-4">
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 break-words max-w-[200px] sm:max-w-xs">{chore.title}</p>
                                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 leading-none">
                                    <span className="capitalize">{chore.priority} priority</span>
                                    <span>•</span>
                                    <span>{chore.limitMinutes ? `${chore.limitMinutes}m limit` : 'No limit'}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                                  <p className="font-medium">{dateStr}</p>
                                  <p className="text-[10px]">{timeStr}</p>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                                    isCompleted 
                                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' 
                                      : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400'
                                  }`}>
                                    {isCompleted ? 'Completed' : 'Cancelled'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    id={`delete-btn-${chore.id}`}
                                    onClick={() => handleDeleteChore(chore.id)}
                                    title="Hard delete record"
                                    className="p-1 px-2 text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}
