import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti'; // Ensure canvas-confetti is in your package.json
import { 
  Play, Pause, RotateCcw, Plus, Settings, User, 
  Lock, ArrowRight, EyeOff, CloudLightning, Flame 
} from 'lucide-react';

// ========================================================
// DESIGN COMPONENT: SUBTLE FOOTER BRANDING LINK
// ========================================================
const ProjectFooter = () => (
  <footer className="w-full py-6 mt-auto text-center border-t border-neutral-800/40">
    <p className="text-xs tracking-wide text-neutral-500 font-light select-none">
      A handcrafted project by{" "}
      <a 
        href="https://kuttiyil.net" 
        target="_blank" 
        rel="noopener noreferrer"
        className="font-medium text-neutral-400 hover:text-[#aac7ff] transition-colors duration-200 underline underline-offset-4 decoration-neutral-700 hover:decoration-[#aac7ff]/50"
      >
        Thomas Kuttiyil Oommen
      </a>
    </p>
  </footer>
);

// ========================================================
// SECURITY ACCESS CONTROL: WEB NOTIFICATIONS MIDDLEWARE
// ========================================================
const requestNotificationAccess = async () => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
};

const dispatchSystemAlert = (title, message) => {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body: message,
      icon: "/icon-192.png",
      tag: "pomo-alert-channel"
    });
  }
};

// ========================================================
// ROOT MAIN EXPORT: APPLICATION CONTROLLER
// ========================================================
export default function App() {
  // --- Authentication & Session Tracking states ---
  const [username, setUsername] = useState(() => localStorage.getItem('pomo_user_session') || '');
  const [passcode, setPasscode] = useState(() => localStorage.getItem('pomo_token_session') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(() => JSON.parse(localStorage.getItem('pomo_guest_mode') || 'false'));
  
  // --- User Entry Form States ---
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [inputUser, setInputUser] = useState('');
  const [inputPass, setInputPass] = useState('');
  const [authFeedback, setAuthFeedback] = useState('');

  // --- Workspace Activity Core Decks ---
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [buckets, setBuckets] = useState(['Project', 'Firm Initiative', 'Personal']);
  const [showBucketSettings, setShowBucketSettings] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');

  // --- Real-time Countdown Core Drivers ---
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('work'); 
  const [streak, setStreak] = useState(0);

  // --- Dynamic System Alert User Configurations ---
  const [enableTimerAlerts, setEnableTimerAlerts] = useState(() => {
    const saved = localStorage.getItem('pomo_pref_timer_alerts');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [enableDailyAlerts, setEnableDailyAlerts] = useState(() => {
    const saved = localStorage.getItem('pomo_pref_daily_alerts');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [lastDigestDate, setLastDigestDate] = useState(() => localStorage.getItem('pomo_last_digest_date') || '');
  const [dailyCheckInHour] = useState(9); // 9:00 AM Trigger Threshold

  // 1. Data Hydration Orchestrator
  useEffect(() => {
    if (isGuestMode) {
      setTasks(JSON.parse(localStorage.getItem('pomo_guest_tasks') || '[]'));
      setCompletedTasks(JSON.parse(localStorage.getItem('pomo_guest_completed') || '[]'));
      setBuckets(JSON.parse(localStorage.getItem('pomo_guest_buckets') || '["Project", "Firm Initiative", "Personal"]'));
      setIsAuthenticated(true);
      return;
    }

    if (!username || !passcode) return;
    async function hydrateProfile() {
      try {
        const res = await fetch('/api/sync', {
          headers: { 'x-app-user': username, 'x-app-passcode': passcode }
        });
        if (res.status === 200) {
          const data = await res.json();
          if (data.tasks) setTasks(data.tasks);
          if (data.completedTasks) setCompletedTasks(data.completedTasks);
          if (data.buckets) setBuckets(data.buckets);
          setIsAuthenticated(true);
        } else {
          handleLogOut();
        }
      } catch (e) {
        console.error("Hydration processing failure:", e);
      }
    }
    hydrateProfile();
  }, [username, passcode, isGuestMode]);

  // 2. Hybrid Data Synchronization Engine
  const syncToStorage = async (updatedTasks, updatedCompleted, updatedBuckets) => {
    const currentBuckets = updatedBuckets || buckets;
    if (isGuestMode) {
      localStorage.setItem('pomo_guest_tasks', JSON.stringify(updatedTasks));
      localStorage.setItem('pomo_guest_completed', JSON.stringify(updatedCompleted));
      localStorage.setItem('pomo_guest_buckets', JSON.stringify(currentBuckets));
    } else {
      if (!username || !passcode) return;
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-app-user': username,
            'x-app-passcode': passcode
          },
          body: JSON.stringify({ tasks: updatedTasks, completedTasks: updatedCompleted, buckets: currentBuckets })
        });
      } catch (e) {
        console.error("Cloud database syncing exception:", e);
      }
    }
  };

  // 3. Secure Handshake and Guest Account Upgrade Pipeline
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthFeedback('');
    if (!inputUser.trim() || !inputPass.trim()) return;

    await requestNotificationAccess();
    const actionType = isSignUpMode ? 'signup' : 'login';
    
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-action': actionType },
        body: JSON.stringify({ username: inputUser.trim(), password: inputPass.trim() })
      });
      const data = await res.json();

      if (res.status === 200) {
        if (isSignUpMode) {
          // GUEST CONVERSION TRACK: Port client arrays cleanly into Upstash cloud profile
          if (isGuestMode) {
            await fetch('/api/sync', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-app-user': inputUser.trim().toLowerCase(),
                'x-app-passcode': inputPass.trim()
              },
              body: JSON.stringify({ tasks, completedTasks, buckets })
            });
            clearGuestCache();
          }
          setAuthFeedback('Account isolated! Initializing session...');
          setIsSignUpMode(false);
          executeSessionLock(inputUser.trim().toLowerCase(), inputPass.trim());
        } else {
          executeSessionLock(inputUser.trim().toLowerCase(), inputPass.trim());
        }
      } else {
        setAuthFeedback(data.error || 'Authentication denied.');
      }
    } catch (err) {
      setAuthFeedback('Network connection gateway failure.');
    }
  };

  const executeSessionLock = (user, token) => {
    localStorage.removeItem('pomo_guest_mode');
    setIsGuestMode(false);
    localStorage.setItem('pomo_user_session', user);
    localStorage.setItem('pomo_token_session', token);
    setUsername(user);
    setPasscode(token);
  };

  const handleGuestLogin = () => {
    localStorage.setItem('pomo_guest_mode', 'true');
    setIsGuestMode(true);
  };

  const clearGuestCache = () => {
    localStorage.removeItem('pomo_guest_tasks');
    localStorage.removeItem('pomo_guest_completed');
    localStorage.removeItem('pomo_guest_buckets');
    localStorage.removeItem('pomo_guest_mode');
  };

  const handleLogOut = () => {
    localStorage.clear();
    setUsername('');
    setPasscode('');
    setIsGuestMode(false);
    setIsAuthenticated(false);
    setTasks([]);
    setCompletedTasks([]);
    setBuckets(['Project', 'Firm Initiative', 'Personal']);
    setActiveTaskId(null);
  };

  // 4. Real-Time Focus Clock Interval Routine
  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) setSeconds(seconds - 1);
        else if (seconds === 0) {
          if (minutes === 0) {
            setIsActive(false);
            confetti({ particleCount: 150, spread: 80 });
            if (mode === 'work') {
              if (enableTimerAlerts) dispatchSystemAlert("Interval Complete! 🎯", "Brilliant execution. Take a well-earned break!");
              setStreak(prev => prev + 1);
              setMode('shortBreak');
              setMinutes(5);
            } else {
              if (enableTimerAlerts) dispatchSystemAlert("Break Over! 🚀", "Time to look back into active tracking loops.");
              setMode('work');
              setMinutes(25);
            }
            setSeconds(0);
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, minutes, seconds, mode, enableTimerAlerts]);

  // 5. Daily Agenda Visibility Monitor Rule
  useEffect(() => {
    if (!isAuthenticated || tasks.length === 0) return;
    const evaluateAgendaAlerts = () => {
      const rightNow = new Date();
      const currentHour = rightNow.getHours();
      const currentCalendarDate = rightNow.toLocaleDateString();

      if (currentHour >= dailyCheckInHour && lastDigestDate !== currentCalendarDate) {
        if (enableDailyAlerts) {
          dispatchSystemAlert(
            "Daily Agenda Operational Review 📋",
            `You have ${tasks.length} outstanding tasks waiting in your queue line for today.`
          );
        }
        localStorage.setItem('pomo_last_digest_date', currentCalendarDate);
        setLastDigestDate(currentCalendarDate);
      }
    };
    evaluateAgendaAlerts();
    window.addEventListener('focus', evaluateAgendaAlerts);
    return () => window.removeEventListener('focus', evaluateAgendaAlerts);
  }, [isAuthenticated, tasks, lastDigestDate, enableDailyAlerts, dailyCheckInHour]);

  // 6. Queue Task Mutators
  const handleAddTask = (text, bucket, dueDate) => {
    const updated = [...tasks, { id: Date.now().toString(), text, bucket: bucket || buckets[0], dueDate: dueDate || 'Today' }];
    setTasks(updated);
    syncToStorage(updated, completedTasks, buckets);
  };

  const handleCompleteTask = (id) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;
    const updatedTasks = tasks.filter(t => t.id !== id);
    const updatedCompleted = [...completedTasks, { ...target, completedAt: new Date().toLocaleDateString() }];
    setTasks(updatedTasks);
    setCompletedTasks(updatedCompleted);
    if (activeTaskId === id) setActiveTaskId(null);
    confetti({ particleCount: 60, spread: 45 });
    syncToStorage(updatedTasks, updatedCompleted, buckets);
  };

  const handleAddBucket = () => {
    if (!newBucketName.trim() || buckets.includes(newBucketName.trim())) return;
    const nextBuckets = [...buckets, newBucketName.trim()];
    setBuckets(nextBuckets);
    setNewBucketName('');
    syncToStorage(tasks, completedTasks, nextBuckets);
  };

  const handleRemoveBucket = (targetBucket) => {
    const nextBuckets = buckets.filter(b => b !== targetBucket);
    setBuckets(nextBuckets);
    syncToStorage(tasks, completedTasks, nextBuckets);
  };

  const handleClearHistory = () => {
    setCompletedTasks([]);
    syncToStorage(tasks, [], buckets);
  };

  const getBucketStyle = (bucket) => {
    const clean = bucket?.toLowerCase() || '';
    if (clean === 'project') return 'bg-[#212433] text-[#aac7ff] border-[#30374d]';
    if (clean === 'firm initiative') return 'bg-[#332521] text-[#ffb4a2] border-[#4d3630]';
    if (clean === 'personal') return 'bg-[#2d332d] text-[#bacfbc] border-[#3b453b]';
    return 'bg-[#23242a] text-[#c4c6cf] border-[#43474e]';
  };

  // --- SUB-RENDER VIEW A: GATEWAY IDENTITY INTERFACE ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-between p-4">
        <div className="flex-grow" />
        
        <div className="w-full max-w-sm bg-[#1c1b1f] border border-[#2d2b30] rounded-[28px] p-6 shadow-xl space-y-5">
          <div className="text-center">
            <span className="text-[10px] font-bold tracking-widest text-[#aac7ff] uppercase">Pomodoro Timer v4</span>
            <h1 className="text-xl font-medium text-[#e3e3e3] mt-1">{isSignUpMode ? 'Deploy Cloud Identity' : 'Authenticate Session'}</h1>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-[#919191]" />
              <input type="text" placeholder="Username" value={inputUser} onChange={(e) => setInputUser(e.target.value)} className="w-full bg-[#121212] border border-[#49454f] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#aac7ff]" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-[#919191]" />
              <input type="password" placeholder="Password" value={inputPass} onChange={(e) => setInputPass(e.target.value)} className="w-full bg-[#121212] border border-[#49454f] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#aac7ff]" />
            </div>

            {authFeedback && <div className="text-[11px] text-center text-[#ffb4a2] bg-[#2d1f1c] p-2 rounded-lg border border-[#4d2d26]">{authFeedback}</div>}

            <button type="submit" className="w-full py-2.5 bg-[#aac7ff] text-[#002f66] rounded-xl font-semibold text-xs tracking-wide hover:bg-[#b6c4ff] transition-all flex items-center justify-center gap-1.5">
              {isSignUpMode ? 'Initialize Profile' : 'Unlock Dashboard'} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#2d2b30]"></div>
            <span className="flex-shrink mx-3 text-[10px] text-[#79747e] font-medium uppercase tracking-wider">Or</span>
            <div className="flex-grow border-t border-[#2d2b30]"></div>
          </div>

          <div className="bg-[#19161d] border border-[#362f42] rounded-2xl p-3.5 space-y-2">
            <div className="flex gap-2 items-start">
              <EyeOff className="h-4 w-4 text-[#ffb4a2] mt-0.5 flex-shrink-0" />
              <p className="text-[11px] leading-relaxed text-[#c4c6cf]">
                <strong>Temporary Session Notice:</strong> You can use the timer and tasks without an account. However browser cache refreshes can wipe any tasks you are tracking. You can create an account after trying as a guest!
              </p>
            </div>
            <button onClick={handleGuestLogin} className="w-full py-2 bg-[#25232a] border border-[#49454f] hover:border-[#aac7ff] text-[#e3e3e3] rounded-xl font-medium text-xs transition-colors">
              Continue as Guest
            </button>
          </div>

          <div className="text-center pt-1">
            <button onClick={() => { setIsSignUpMode(!isSignUpMode); setAuthFeedback(''); }} className="text-xs text-[#919191] hover:text-[#aac7ff] underline underline-offset-4">
              {isSignUpMode ? 'Already registered? Log in here' : 'Need a new account? Create new account here'}
            </button>
          </div>
        </div>

        <div className="flex-grow" />
        <ProjectFooter />
      </div>
    );
  }

  const currentActiveTask = tasks.find(t => t.id === activeTaskId);

  // --- SUB-RENDER VIEW B: CORE APP DISPLAY DESK ---
  return (
    <div className="min-h-screen bg-[#121212] text-[#e3e3e3] font-sans flex flex-col items-center py-10 px-4">
      
      {/* Dynamic Security/Status Header Ribbon */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 px-4">
        {isGuestMode ? (
          <div className="bg-[#2d1f1c] border border-[#4d2d26] rounded-xl px-3 py-1.5 flex items-center gap-2 animate-fade-in">
            <CloudLightning className="h-3.5 w-3.5 text-[#ffb4a2] animate-bounce" />
            <span className="text-[11px] text-[#ffb4a2]">
              Guest Instance. <button onClick={() => { setIsAuthenticated(false); setIsSignUpMode(true); }} className="underline font-bold hover:text-white">Create Account</button> to save your tasks permanently.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-[#bacfbc] rounded-full animate-pulse" />
            <span className="text-xs text-[#919191]">Active Terminal: <strong className="text-[#e3e3e3]">{username}</strong></span>
          </div>
        )}
        
        <button onClick={handleLogOut} className="px-3 py-1 bg-[#25232a] border border-[#49454f] text-[#919191] hover:text-[#ffb4a2] rounded-lg text-[11px] font-medium transition-colors">
          {isGuestMode ? 'Exit Session' : 'Logout'}
        </button>
      </div>

      {/* Primary Layout Split Grid */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start flex-grow">
        
        {/* TIMER CONTAINER CARD */}
        <div className="bg-[#1c1b1f] border border-[#2d2b30] rounded-[32px] p-8 flex flex-col items-center shadow-lg relative">
          <div className="w-full min-h-[54px] flex flex-col items-center justify-center mb-6 px-4 py-2 bg-[#121212] rounded-2xl border border-[#2d2b30] border-dashed">
            {currentActiveTask ? (
              <div className="text-center w-full">
                <span className="text-[9px] uppercase tracking-widest text-[#919191] block mb-1 font-semibold">Active Focus Target</span>
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border ${getBucketStyle(currentActiveTask.bucket)}`}>{currentActiveTask.bucket}</span>
                  <span className="text-xs font-medium text-[#aac7ff] truncate max-w-[200px]">{currentActiveTask.text}</span>
                </div>
              </div>
            ) : (
              <span className="text-xs text-[#79747e] italic">Select a task card to activate focus layout</span>
            )}
          </div>

          <div className="text-7xl font-light tracking-tighter text-[#e3e3e3] my-4 tabular-nums select-none">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          <div className="text-xs text-[#919191] flex items-center gap-1.5 mb-6">
            <Flame className="h-3.5 w-3.5 text-[#ffb794]" />
            <span>Streak Velocity: <strong>{streak}</strong> completion intervals</span>
          </div>

          <div className="flex gap-4">
            <button onClick={() => setIsActive(!isActive)} className="h-14 w-14 rounded-full bg-[#aac7ff] text-[#002f66] flex items-center justify-center shadow-md hover:scale-105 transition-transform">
              {isActive ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
            </button>
            <button onClick={() => { setIsActive(false); setMinutes(mode === 'work' ? 25 : 5); setSeconds(0); }} className="h-14 w-14 rounded-full bg-[#25232a] border border-[#49454f] text-[#e3e3e3] flex items-center justify-center hover:bg-[#2d2b30]">
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ACTIVITY QUEUE & HISTORY DESK CARD */}
        <div className="bg-[#1c1b1f] border border-[#2d2b30] rounded-[32px] p-6 flex flex-col gap-4 shadow-lg min-h-[480px]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold tracking-wider text-[#919191] uppercase">Pending Tasks</h2>
              <button onClick={() => setShowBucketSettings(!showBucketSettings)} className="p-1.5 rounded-lg bg-[#25232a] border border-[#49454f] text-[#919191] hover:text-[#e3e3e3] transition-colors">
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* EXPANDABLE CONSOLE PARAMETERS DASHBOARD */}
            {showBucketSettings && (
              <div className="mb-4 p-4 bg-[#121212] border border-[#49454f] rounded-xl space-y-4 animate-fade-in">
                <div className="space-y-2 border-b border-neutral-800/60 pb-3">
                  <span className="text-[10px] font-semibold text-[#aac7ff] uppercase block tracking-wider">System Notification Controls</span>
                  <label className="flex items-center justify-between text-xs text-[#c4c6cf] cursor-pointer select-none py-0.5">
                    <span>Interval completion banners</span>
                    <input type="checkbox" checked={enableTimerAlerts} onChange={(e) => { setEnableTimerAlerts(e.target.checked); localStorage.setItem('pomo_pref_timer_alerts', JSON.stringify(e.target.checked)); }} className="accent-[#aac7ff] h-4 w-4 cursor-pointer" />
                  </label>
                  <label className="flex items-center justify-between text-xs text-[#c4c6cf] cursor-pointer select-none py-0.5">
                    <span>Daily outstanding task summary</span>
                    <input type="checkbox" checked={enableDailyAlerts} onChange={(e) => { setEnableDailyAlerts(e.target.checked); localStorage.setItem('pomo_pref_daily_alerts', JSON.stringify(e.target.checked)); }} className="accent-[#aac7ff] h-4 w-4 cursor-pointer" />
                  </label>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-[#aac7ff] uppercase block tracking-wider">Edit Taxonomy Labels</span>
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {buckets.map(b => (
                      <div key={b} className="flex items-center gap-1 px-2 py-0.5 bg-[#1c1b1f] border border-[#2d2b30] rounded-full text-[10px]">
                        <span>{b}</span>
                        <button onClick={() => handleRemoveBucket(b)} className="text-[#ffb4a2] hover:text-[#ff8f73] font-bold ml-1">×</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="New classification type..." value={newBucketName} onChange={(e) => setNewBucketName(e.target.value)} className="bg-[#1c1b1f] border border-[#49454f] rounded-lg px-2 py-1 text-xs text-[#e3e3e3] flex-1 focus:outline-none" />
                    <button onClick={handleAddBucket} className="px-3 bg-[#aac7ff] text-[#002f66] rounded-lg font-medium text-xs hover:bg-[#b6c4ff]">Add</button>
                  </div>
                </div>
              </div>
            )}

            {/* QUEUED ACTIVE ITEMS PANEL LOOP */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {tasks.map((task) => (
                <div key={task.id} onClick={() => setActiveTaskId(task.id)} className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${activeTaskId === task.id ? 'bg-[#232a3d] border-[#aac7ff]' : 'bg-[#121212] border-[#2d2b30] hover:bg-[#1a191e]'}`}>
                  <div className="flex justify-between items-start gap-1 mb-2">
                    <span className="text-xs font-medium text-[#e3e3e3] line-clamp-2 flex-1">{task.text}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }} className="h-6 w-6 rounded-full bg-[#25232a] border border-[#49454f] text-[#bacfbc] flex items-center justify-center text-xs ml-1 hover:bg-[#bacfbc] hover:text-[#002f66] transition-all">✓</button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-[#919191]">
                    <span className={`px-1.5 py-0.5 rounded-full border ${getBucketStyle(task.bucket)}`}>{task.bucket}</span>
                    <span>Due: {task.dueDate}</span>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-6 border border-dashed border-[#2d2b30] rounded-xl bg-[#151418]">
                  <p className="text-xs text-[#79747e] px-4">Deck clear. Deploy a card from below to lock focus parameters.</p>
                </div>
              )}
            </div>
          </div>

          {/* HISTORICAL COMPLETED DATA ARCHIVE LAYOUT */}
          <div className="border-t border-neutral-800/60 pt-3 mt-2">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">Completed Task History</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-[#2d332d] text-[#bacfbc] border border-[#3b453b] rounded-full font-bold">{completedTasks.length} Done</span>
              </div>
              {completedTasks.length > 0 && (
                <button onClick={handleClearHistory} className="text-[10px] text-neutral-600 hover:text-[#ffb4a2] transition-colors underline underline-offset-2">Delete Completed Tasks</button>
              )}
            </div>
            <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
              {completedTasks.map((task, idx) => (
                <div key={task.id || idx} className="p-2 bg-[#141416] border border-[#232225] rounded-xl flex items-center justify-between opacity-50 hover:opacity-85 transition-opacity">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs text-neutral-400 line-through truncate">{task.text}</span>
                    <div className="flex items-center gap-1.5 text-[8px] text-neutral-600">
                      <span className="uppercase tracking-wider font-semibold">{task.bucket}</span>
                      <span>•</span>
                      <span>Executed: {task.completedAt || 'Recent'}</span>
                    </div>
                  </div>
                  <div className="h-4 w-4 rounded-full bg-[#1b2b1c] text-[#bacfbc] flex items-center justify-center text-[9px] font-bold select-none ml-2">✓</div>
                </div>
              ))}
              {completedTasks.length === 0 && (
                <div className="text-center py-3 border border-dashed border-[#232225] rounded-xl bg-[#141416]">
                  <p className="text-[10px] text-neutral-600 italic">No completed tasks available. Finish a task to see it here. 🤩</p>
                </div>
              )}
            </div>
          </div>

          {/* PERSISTENT INITIALIZATION FORM FOOTER */}
          <div className="bg-[#121212] border border-[#2d2b30] rounded-2xl p-3 mt-auto space-y-2.5">
            <input id="new-task-text" type="text" placeholder="Add new task" className="w-full bg-[#1c1b1f] border border-[#49454f] rounded-xl px-3 py-1.5 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#aac7ff]" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <select id="new-task-bucket" className="w-full bg-[#1c1b1f] border border-[#49454f] rounded-xl px-2 py-1.5 text-[11px] text-[#e3e3e3] focus:outline-none">
                  {buckets.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <input id="new-task-date" type="date" className="w-full bg-[#1c1b1f] border border-[#49454f] rounded-xl px-2 py-1 text-[11px] text-[#e3e3e3] focus:outline-none" />
              </div>
            </div>
            <button
              onClick={() => {
                const textEl = document.getElementById('new-task-text');
                const bucketEl = document.getElementById('new-task-bucket');
                const dateEl = document.getElementById('new-task-date');
                if (textEl && textEl.value.trim()) {
                  handleAddTask(textEl.value.trim(), bucketEl?.value, dateEl?.value || 'Today');
                  textEl.value = '';
                  if (dateEl) dateEl.value = '';
                }
              }}
              className="w-full py-1.5 bg-[#aac7ff] text-[#002f66] hover:bg-[#b6c4ff] rounded-xl font-medium text-xs tracking-wide transition-all flex items-center justify-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Task
            </button>
          </div>

        </div>
      </div>
      
      <ProjectFooter />
    </div>
  );
}