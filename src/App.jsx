import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Plus, Settings, User, Lock, ArrowRight, EyeOff, 
  Trash2, CheckCircle, ArrowUpDown, ShieldAlert, BarChart2, List, Play, Pause, RotateCcw, Sliders
} from 'lucide-react';

// Subtle Personal Branding Link Component
const ProjectFooter = () => {
  return (
    <footer className="w-full py-6 mt-auto text-center border-t border-neutral-800/40">
      <p className="text-xs tracking-wide text-neutral-500 font-light select-none">
        A project by{" "}
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
};

const PRIORITY_WEIGHTS = { High: 3, Medium: 2, Low: 1 };

export default function App() {
  // --- Configurable Pomodoro Timer States ---
  const [focusLength, setFocusLength] = useState(25); // in minutes
  const [breakLength, setBreakLength] = useState(5);  // in minutes
  const [timerMode, setTimerMode] = useState('Focus'); // 'Focus' or 'Break'
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showTimerConfig, setShowTimerConfig] = useState(false);
  const timerRef = useRef(null);

  // --- Authentication & Session States ---
  const [username, setUsername] = useState(() => localStorage.getItem('pomo_user_session') || '');
  const [passcode, setPasscode] = useState(() => localStorage.getItem('pomo_token_session') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(() => JSON.parse(localStorage.getItem('pomo_guest_mode') || 'false'));
  
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [inputUser, setInputUser] = useState('');
  const [inputPass, setInputPass] = useState('');
  const [authFeedback, setAuthFeedback] = useState('');

  // --- Active Workspace Core Decks ---
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [buckets, setBuckets] = useState(['Project', 'Firm Initiative', 'Personal']);
  const [showBucketSettings, setShowBucketSettings] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');

  // --- Task Input Form States ---
  const [taskText, setTaskText] = useState('');
  const [taskBucket, setTaskBucket] = useState('Project');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDueDate, setTaskDueDate] = useState('Today');

  // --- Navigation & Filter States ---
  const [activeTab, setActiveTab] = useState('tasks');
  const [sortBy, setSortBy] = useState('priority');
  const [statsCategoryFilter, setStatsCategoryFilter] = useState('All');

  // --- Sync Timer Length Display when Config Changes ---
  useEffect(() => {
    if (!isTimerRunning) {
      setTimeLeft(timerMode === 'Focus' ? focusLength * 60 : breakLength * 60);
    }
  }, [focusLength, breakLength, timerMode]);

  // --- Timer Tick Controller ---
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);
            
            // Fire celebration confetti effects
            if (typeof confetti === 'function') {
              confetti({ particleCount: 80, spread: 60, colors: timerMode === 'Focus' ? ['#aac7ff', '#bacfbc'] : ['#ffe082', '#ffb4a2'] });
            }
            
            // Auto-switch mode cycle
            const nextMode = timerMode === 'Focus' ? 'Break' : 'Focus';
            setTimerMode(nextMode);
            return nextMode === 'Focus' ? focusLength * 60 : breakLength * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, timerMode, focusLength, breakLength]);

  // Data Hydration Orchestrator
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

  // --- Authentication Handshaking ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthFeedback('');
    if (!inputUser.trim() || !inputPass.trim()) return;

    const actionType = isSignUpMode ? 'signup' : 'login';
    
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-action': actionType },
        body: JSON.stringify({ username: inputUser.trim().toLowerCase(), password: inputPass.trim() })
      });
      const data = await res.json();

      if (res.status === 200) {
        if (isSignUpMode) {
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
          setAuthFeedback('Account created! Initializing session...');
          setIsSignUpMode(false);
          executeSessionLock(inputUser.trim().toLowerCase(), inputPass.trim());
        } else {
          executeSessionLock(inputUser.trim().toLowerCase(), inputPass.trim());
        }
      } else {
        setAuthFeedback(data.error || 'Authentication denied.');
      }
    } catch (err) {
      setAuthFeedback('Network connection failure.');
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
    setActiveTab('tasks');
    setIsTimerRunning(false);
    setTimerMode('Focus');
    setTimeLeft(25 * 60);
  };

  // --- Task Mutations ---
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskText.trim()) return;
    
    const updated = [
      ...tasks, 
      { 
        id: Date.now().toString(), 
        text: taskText.trim(), 
        bucket: taskBucket, 
        priority: taskPriority,
        dueDate: taskDueDate
      }
    ];
    setTasks(updated);
    setTaskText('');
    syncToStorage(updated, completedTasks, buckets);
  };

  const handleCompleteTask = (id) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;
    const updatedTasks = tasks.filter(t => t.id !== id);
    const updatedCompleted = [...completedTasks, { ...target, completedAt: new Date().toLocaleDateString() }];
    setTasks(updatedTasks);
    setCompletedTasks(updatedCompleted);
    if (typeof confetti === 'function') confetti({ particleCount: 60, spread: 50, colors: ['#aac7ff', '#bacfbc'] });
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
    if (taskBucket === targetBucket && nextBuckets.length > 0) {
      setTaskBucket(nextBuckets[0]);
    }
    syncToStorage(tasks, completedTasks, nextBuckets);
  };

  const handleClearHistory = () => {
    setCompletedTasks([]);
    syncToStorage(tasks, [], buckets);
  };

  const getSortedTasks = () => {
    return [...tasks].sort((a, b) => {
      if (sortBy === 'priority') {
        return (PRIORITY_WEIGHTS[b.priority] || 2) - (PRIORITY_WEIGHTS[a.priority] || 2);
      }
      if (sortBy === 'dueDate') {
        const dateMap = { 'Today': 1, 'Tomorrow': 2, 'This Week': 3, 'Later': 4 };
        return (dateMap[a.dueDate] || 5) - (dateMap[b.dueDate] || 5);
      }
      return 0;
    });
  };

  // --- Statistics Computing Engine ---
  const generateDailyStatsData = () => {
    const filteredCompletions = statsCategoryFilter === 'All' 
      ? completedTasks 
      : completedTasks.filter(t => t.bucket === statsCategoryFilter);

    const dayGroups = {};
    filteredCompletions.forEach(task => {
      const dateKey = task.completedAt || 'Unknown';
      if (!dayGroups[dateKey]) {
        dayGroups[dateKey] = { High: 0, Medium: 0, Low: 0, total: 0 };
      }
      const p = task.priority || 'Medium';
      if (dayGroups[dateKey][p] !== undefined) {
        dayGroups[dateKey][p] += 1;
      }
      dayGroups[dateKey].total += 1;
    });

    const sortedDays = Object.keys(dayGroups).sort((a, b) => new Date(a) - new Date(b));
    const last7Days = sortedDays.slice(-7);

    let maxTotal = 0;
    const chartData = last7Days.map(day => {
      const metrics = dayGroups[day];
      if (metrics.total > maxTotal) maxTotal = metrics.total;
      return { date: day, ...metrics };
    });

    return { chartData, maxTotal };
  };

  const getLifetimePriorityStats = () => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    completedTasks.forEach(t => {
      const p = t.priority || 'Medium';
      if (counts[p] !== undefined) counts[p]++;
    });
    return counts;
  };

  // --- Formatting Helpers ---
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const getBucketStyle = (bucket) => {
    const clean = bucket?.toLowerCase() || '';
    if (clean === 'project') return 'bg-[#212433] text-[#aac7ff] border-[#30374d]';
    if (clean === 'firm initiative') return 'bg-[#332521] text-[#ffb4a2] border-[#4d3630]';
    if (clean === 'personal') return 'bg-[#2d332d] text-[#bacfbc] border-[#3b453b]';
    return 'bg-[#23242a] text-[#c4c6cf] border-[#43474e]';
  };

  const getPriorityStyle = (priority) => {
    if (priority === 'High') return 'bg-[#3d1d1d] text-[#ffb4ab] border-[#601414]';
    if (priority === 'Medium') return 'bg-[#332a15] text-[#ffe082] border-[#4f4007]';
    return 'bg-[#1b252d] text-[#c2e7ff] border-[#223344]';
  };

  const { chartData, maxTotal } = generateDailyStatsData();
  const lifetimePriorities = getLifetimePriorityStats();

  // --- INTERFACE VIEW A: GATEWAY SIGN-IN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-between p-4">
        <div className="flex-grow" />
        <div className="w-full max-w-sm bg-[#1c1b1f] border border-[#2d2b30] rounded-[28px] p-6 shadow-xl space-y-5">
          <div className="text-center">
            <span className="text-[10px] font-bold tracking-widest text-[#aac7ff] uppercase">Task Manager v5</span>
            <h1 className="text-xl font-medium text-[#e3e3e3] mt-1">{isSignUpMode ? 'Create Account' : 'Sign In'}</h1>
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
              {isSignUpMode ? 'Register Account' : 'Unlock Dashboard'} <ArrowRight className="h-3.5 w-3.5" />
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
                <strong>Guest Mode:</strong> Work without an account. Data will be saved locally to this device and browser only.
              </p>
            </div>
            <button onClick={handleGuestLogin} className="w-full py-2 bg-[#25232a] border border-[#49454f] hover:border-[#aac7ff] text-[#e3e3e3] rounded-xl font-medium text-xs transition-colors">
              Continue as Guest
            </button>
          </div>
        </div>
        <div className="flex-grow" />
        <ProjectFooter />
      </div>
    );
  }

  // --- INTERFACE VIEW B: MAIN WORKSPACE ---
  return (
    <div className="min-h-screen bg-[#121212] text-[#e3e3e3] flex flex-col items-center py-10 px-4">
      
      {/* Session Header Status */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-6 px-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-[#bacfbc] rounded-full" />
          <span className="text-xs text-[#919191]">Logged in as: <strong className="text-[#e3e3e3]">{isGuestMode ? 'Guest' : username}</strong></span>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-[#1c1b1f] border border-[#2d2b30] rounded-xl p-1 text-xs">
          <button 
            onClick={() => setActiveTab('tasks')} 
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${activeTab === 'tasks' ? 'bg-[#25232a] text-[#aac7ff]' : 'text-neutral-400 hover:text-white'}`}
          >
            <List className="h-3.5 w-3.5" /> Tasks
          </button>
          <button 
            onClick={() => setActiveTab('statistics')} 
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${activeTab === 'statistics' ? 'bg-[#25232a] text-[#aac7ff]' : 'text-neutral-400 hover:text-white'}`}
          >
            <BarChart2 className="h-3.5 w-3.5" /> Statistics
          </button>
        </div>

        <button onClick={handleLogOut} className="px-3 py-1.5 bg-[#25232a] border border-[#49454f] text-[#919191] hover:text-[#ffb4a2] rounded-xl text-[11px] font-medium transition-colors">
          Sign Out
        </button>
      </div>

      {/* TAB 1: CORE TASKS & RESTORED V3 POMODORO TIMER */}
      {activeTab === 'tasks' && (
        <div className="w-full max-w-2xl bg-[#1c1b1f] border border-[#2d2b30] rounded-[32px] p-6 flex flex-col gap-5 shadow-lg">
          
          {/* Restored V3 Dedicated Pomodoro Dashboard Module */}
          <div className="bg-[#121212] border border-[#2d2b30] rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
            
            {/* V3 High-Contrast Large Counter */}
            <div className="space-y-1 select-none">
              <h1 className={`text-5xl font-bold font-mono tracking-wider ${timerMode === 'Focus' ? 'text-[#aac7ff]' : 'text-[#ffe082]'}`}>
                {formatTime(timeLeft)}
              </h1>
              <div className="flex justify-center pt-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase border ${timerMode === 'Focus' ? 'bg-[#212433] text-[#aac7ff] border-[#30374d]' : 'bg-[#332a15] text-[#ffe082] border-[#4f4007]'}`}>
                  {timerMode} Mode
                </span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 max-w-sm">
              {timerMode === 'Focus' ? `Focus engine set to ${focusLength}m` : `Break window set to ${breakLength}m`}. Use the slider toggle to manage manual configurations.
            </p>

            {/* V3 Linear Bottom Action Toolbar */}
            <div className="flex items-center justify-center gap-2 w-full pt-1">
              <button 
                onClick={() => setTimerMode(timerMode === 'Focus' ? 'Break' : 'Focus')}
                className="px-3.5 py-2 bg-[#1c1b1f] border border-[#2d2b30] hover:border-neutral-500 text-neutral-400 hover:text-white rounded-xl text-xs font-medium transition-colors"
                title="Toggle Mode Manual"
              >
                Switch Mode
              </button>
              
              <button 
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${isTimerRunning ? 'bg-[#3d1d1d] text-[#ffb4ab] border border-[#601414]' : 'bg-[#212433] text-[#aac7ff] border border-[#30374d] hover:bg-[#2a3047]'}`}
              >
                {isTimerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isTimerRunning ? 'Pause' : 'Start'}
              </button>

              <button 
                onClick={() => { setIsTimerRunning(false); setTimeLeft(timerMode === 'Focus' ? focusLength * 60 : breakLength * 60); }}
                className="p-2 bg-[#25232a] border border-[#49454f] text-neutral-400 hover:text-white rounded-xl transition-colors"
                title="Reset Timer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button 
                onClick={() => setShowTimerConfig(!showTimerConfig)} 
                className={`p-2 rounded-xl border transition-colors ${showTimerConfig ? 'bg-[#aac7ff] text-[#002f66] border-[#aac7ff]' : 'bg-[#25232a] border-[#49454f] text-neutral-400 hover:text-white'}`}
                title="Configure Intervals"
              >
                <Sliders className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Configurable Multi-Interval Settings Panel */}
            {showTimerConfig && (
              <div className="w-full p-3 bg-[#1c1b1f] border border-[#2d2b30] rounded-xl grid grid-cols-2 gap-4 text-xs text-left animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-neutral-400 font-medium block">Focus Duration (Minutes):</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="180" 
                    value={focusLength} 
                    onChange={(e) => setFocusLength(Math.max(1, parseInt(e.target.value) || 1))} 
                    className="w-full bg-[#121212] border border-[#49454f] rounded-lg px-2.5 py-1.5 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#aac7ff]" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-neutral-400 font-medium block">Break Duration (Minutes):</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="60" 
                    value={breakLength} 
                    onChange={(e) => setBreakLength(Math.max(1, parseInt(e.target.value) || 1))} 
                    className="w-full bg-[#121212] border border-[#49454f] rounded-lg px-2.5 py-1.5 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#aac7ff]" 
                  />
                </div>
              </div>
            )}
          </div>

          {/* Active Tasks Panel */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold tracking-wider text-[#919191] uppercase">Active Tasks</h2>
                <div className="flex items-center bg-[#121212] border border-[#2d2b30] rounded-lg p-0.5 text-[10px] font-medium text-neutral-400">
                  <button 
                    onClick={() => setSortBy('priority')} 
                    className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${sortBy === 'priority' ? 'bg-[#25232a] text-[#aac7ff] font-semibold' : 'hover:text-white'}`}
                  >
                    <ShieldAlert className="h-2.5 w-2.5" /> Sort by Priority
                  </button>
                  <button 
                    onClick={() => setSortBy('dueDate')} 
                    className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${sortBy === 'dueDate' ? 'bg-[#25232a] text-[#aac7ff] font-semibold' : 'hover:text-white'}`}
                  >
                    <ArrowUpDown className="h-2.5 w-2.5" /> Sort by Due Date
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setShowBucketSettings(!showBucketSettings)} 
                className={`p-1.5 rounded-lg border transition-colors ${showBucketSettings ? 'bg-[#aac7ff] text-[#002f66] border-[#aac7ff]' : 'bg-[#25232a] border-[#49454f] text-[#919191] hover:text-[#e3e3e3]'}`}
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>

            {showBucketSettings && (
              <div className="mb-4 p-4 bg-[#121212] border border-[#2d2b30] rounded-2xl space-y-3">
                <span className="text-[10px] font-semibold text-[#aac7ff] uppercase block tracking-wider">Manage Categories</span>
                <div className="flex flex-wrap gap-1.5 py-0.5">
                  {buckets.map((b) => (
                    <div key={b} className="flex items-center gap-1 px-2.5 py-0.5 bg-[#1c1b1f] border border-[#2d2b30] rounded-full text-[10px]">
                      <span>{b}</span>
                      <button onClick={() => handleRemoveBucket(b)} className="text-[#ffb4a2] hover:text-[#ff8f73] font-bold ml-1.5">×</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input type="text" placeholder="New category name..." value={newBucketName} onChange={(e) => setNewBucketName(e.target.value)} className="bg-[#1c1b1f] border border-[#49454f] rounded-xl px-3 py-1.5 text-xs text-[#e3e3e3] flex-1 focus:outline-none focus:border-[#aac7ff]" />
                  <button onClick={handleAddBucket} className="px-3 bg-[#aac7ff] text-[#002f66] rounded-xl font-medium text-xs hover:bg-[#b6c4ff]">Add</button>
                </div>
              </div>
            )}

            {/* Active Core Streams */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {getSortedTasks().map((task) => (
                <div key={task.id} className="p-3.5 bg-[#121212] border border-[#2d2b30] rounded-xl flex items-center justify-between gap-4 group hover:border-[#43474e] transition-all">
                  <div className="flex flex-col min-w-0 flex-1 gap-2">
                    <span className="text-xs font-medium text-[#e3e3e3] break-words">{task.text}</span>
                    <div className="flex items-center flex-wrap gap-2 text-[9px] text-[#919191]">
                      <span className={`px-2 py-0.5 rounded-full border text-[8px] uppercase tracking-wide font-bold ${getPriorityStyle(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border ${getBucketStyle(task.bucket)}`}>{task.bucket}</span>
                      <span>• Due: <strong className="text-neutral-300">{task.dueDate}</strong></span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCompleteTask(task.id)} 
                    className="h-8 w-8 rounded-xl bg-[#25232a] border border-[#49454f] text-[#bacfbc] flex items-center justify-center hover:bg-[#bacfbc] hover:text-[#002f66] hover:border-[#bacfbc] transition-all flex-shrink-0 text-xs font-bold"
                  >
                    ✓
                  </button>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-8 border border-dashed border-[#2d2b30] rounded-xl bg-[#151418]">
                  <p className="text-xs text-[#79747e]">No active tasks. Use the form below to add a task.</p>
                </div>
              )}
            </div>
          </div>

          {/* History Panel */}
          <div className="border-t border-neutral-800/60 pt-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">Completed Tasks</span>
                <span className="text-[9px] px-2 py-0.5 bg-[#2d332d] text-[#bacfbc] border border-[#3b453b] rounded-full font-bold">{completedTasks.length} total</span>
              </div>
              {completedTasks.length > 0 && (
                <button onClick={handleClearHistory} className="text-[10px] text-neutral-500 hover:text-[#ffb4a2] transition-colors flex items-center gap-1 underline underline-offset-2">
                  <Trash2 className="h-3 w-3" /> Clear History
                </button>
              )}
            </div>
            
            <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
              {completedTasks.map((task, idx) => (
                <div key={task.id || idx} className="p-2.5 bg-[#141416] border border-[#232225] rounded-xl flex items-center justify-between opacity-40 hover:opacity-80 transition-opacity">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs text-neutral-400 line-through truncate">{task.text}</span>
                    <div className="flex items-center gap-1.5 text-[8px] text-neutral-600 mt-0.5">
                      <span className="uppercase tracking-wider font-semibold">{task.bucket}</span>
                      <span>•</span>
                      <span>Priority: {task.priority}</span>
                      <span>•</span>
                      <span>Completed: {task.completedAt || 'Recent'}</span>
                    </div>
                  </div>
                  <CheckCircle className="h-3.5 w-3.5 text-[#bacfbc] flex-shrink-0 ml-2" />
                </div>
              ))}
              {completedTasks.length === 0 && (
                <p className="text-[11px] text-neutral-600 text-center py-2 italic">Completed items will appear here.</p>
              )}
            </div>
          </div>

          {/* Addition Entry Form */}
          <form onSubmit={handleAddTask} className="bg-[#121212] border border-[#2d2b30] rounded-2xl p-3.5 mt-1 space-y-3">
            <input 
              type="text" 
              placeholder="Add a new task..." 
              value={taskText} 
              onChange={(e) => setTaskText(e.target.value)} 
              className="w-full bg-[#1c1b1f] border border-[#49454f] rounded-xl px-3 py-2 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#aac7ff]" 
            />
            
            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              <div className="flex flex-wrap items-center gap-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#919191] font-medium">Category:</span>
                  <select value={taskBucket} onChange={(e) => setTaskBucket(e.target.value)} className="bg-[#1c1b1f] border border-[#49454f] text-[#e3e3e3] text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-[#aac7ff] cursor-pointer">
                    {buckets.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#919191] font-medium">Priority:</span>
                  <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} className="bg-[#1c1b1f] border border-[#49454f] text-[#e3e3e3] text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-[#aac7ff] cursor-pointer">
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#919191] font-medium">Due:</span>
                  <select value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className="bg-[#1c1b1f] border border-[#49454f] text-[#e3e3e3] text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-[#aac7ff] cursor-pointer">
                    <option value="Today">Today</option>
                    <option value="Tomorrow">Tomorrow</option>
                    <option value="This Week">This Week</option>
                    <option value="Later">Later</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="px-4 py-1.5 bg-[#aac7ff] text-[#002f66] rounded-xl font-bold text-xs hover:bg-[#b6c4ff] transition-colors flex items-center gap-1">
                <Plus className="h-3.5 w-3.5 stroke-[3]" /> Add Task
              </button>
            </div>
          </form>

        </div>
      )}

      {/* TAB 2: ANALYTICS PERFORMANCE METRICS */}
      {activeTab === 'statistics' && (
        <div className="w-full max-w-2xl bg-[#1c1b1f] border border-[#2d2b30] rounded-[32px] p-6 flex flex-col gap-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/60 pb-4">
            <div>
              <h2 className="text-base font-medium text-[#e3e3e3]">Metrics & Core Insights</h2>
              <p className="text-[11px] text-neutral-500 mt-0.5">Real-time breakdown of tasks processed across workstreams.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#919191] font-medium">Filter Deck:</span>
              <select 
                value={statsCategoryFilter} 
                onChange={(e) => setStatsCategoryFilter(e.target.value)} 
                className="bg-[#121212] border border-[#49454f] text-[#e3e3e3] text-[11px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#aac7ff] cursor-pointer"
              >
                <option value="All">All Categories</option>
                {buckets.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lifetime Distribution Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#121212] border border-[#2d2b30] p-3.5 rounded-xl text-center space-y-1">
              <span className="text-[9px] font-bold text-[#ffb4ab] uppercase tracking-wider block">High Priority</span>
              <p className="text-xl font-mono font-bold text-[#e3e3e3]">{lifetimePriorities.High}</p>
            </div>
            <div className="bg-[#121212] border border-[#2d2b30] p-3.5 rounded-xl text-center space-y-1">
              <span className="text-[9px] font-bold text-[#ffe082] uppercase tracking-wider block">Medium Priority</span>
              <p className="text-xl font-mono font-bold text-[#e3e3e3]">{lifetimePriorities.Medium}</p>
            </div>
            <div className="bg-[#121212] border border-[#2d2b30] p-3.5 rounded-xl text-center space-y-1">
              <span className="text-[9px] font-bold text-[#c2e7ff] uppercase tracking-wider block">Low Priority</span>
              <p className="text-xl font-mono font-bold text-[#e3e3e3]">{lifetimePriorities.Low}</p>
            </div>
          </div>

          {/* Productivity Velocity Chart (Last 7 Active Iterations) */}
          <div className="bg-[#121212] border border-[#2d2b30] rounded-2xl p-4 space-y-4">
            <span className="text-[10px] font-bold text-[#919191] uppercase tracking-wider block">Completion Engine Output (Last 7 Days)</span>
            
            <div className="h-32 flex items-end justify-between gap-2 pt-2 border-b border-neutral-800 px-2">
              {chartData.map((day, idx) => {
                const total = day.total || 0;
                const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 group relative h-full justify-end">
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full mb-2 bg-[#1c1b1f] border border-[#49454f] rounded-lg p-2 text-[9px] text-[#e3e3e3] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 space-y-0.5 shadow-xl min-w-[75px] text-center">
                      <p className="font-bold border-b border-neutral-800 pb-0.5 mb-1">{day.date}</p>
                      <p className="text-[#ffb4ab]">High: {day.High}</p>
                      <p className="text-[#ffe082]">Med: {day.Medium}</p>
                      <p className="text-[#c2e7ff]">Low: {day.Low}</p>
                      <p className="font-bold text-[#aac7ff] pt-0.5 border-t border-neutral-800 mt-0.5">Total: {total}</p>
                    </div>

                    {/* Stacked Vertical Segment Bar */}
                    <div 
                      className="w-full rounded-t-md transition-all duration-500 bg-[#aac7ff]/20 group-hover:bg-[#aac7ff]/30 flex flex-col justify-end overflow-hidden"
                      style={{ height: `${Math.max(8, percentage)}%` }}
                    >
                      {/* Segment Colors inside the Bar matching priority colors */}
                      {day.High > 0 && <div className="bg-[#ffb4ab]/80 flex-1 min-h-[3px]" title={`High: ${day.High}`} />}
                      {day.Medium > 0 && <div className="bg-[#ffe082]/80 flex-1 min-h-[3px]" title={`Medium: ${day.Medium}`} />}
                      {day.Low > 0 && <div className="bg-[#c2e7ff]/80 flex-1 min-h-[3px]" title={`Low: ${day.Low}`} />}
                    </div>
                    
                    <span className="text-[8px] text-neutral-500 mt-2 truncate max-w-[45px] font-mono">{day.date.split('/')[1] || day.date}</span>
                  </div>
                );
              })}

              {chartData.length === 0 && (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-xs text-neutral-600 italic">No historical timeline markers available yet.</p>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4 text-[9px] text-neutral-500 pt-1">
              <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 bg-[#ffb4ab] rounded-full" /> High</div>
              <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 bg-[#ffe082] rounded-full" /> Medium</div>
              <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 bg-[#c2e7ff] rounded-full" /> Low</div>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Personal Branding Footer */}
      <ProjectFooter />
    </div>
  );
}