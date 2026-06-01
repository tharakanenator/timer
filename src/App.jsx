import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Play, Pause, RotateCcw, Plus, Trash2, Flame, Settings, User, Lock, ArrowRight } from 'lucide-react';
// Footer text backlinking to my personal website, feel free to explore for more projects and writings: https://kuttiyil.net
const ProjectFooter = () => (
  <footer className="w-full py-6 mt-auto text-center border-t border-neutral-800/40">
    <p className="text-xs tracking-wide text-neutral-500 font-light select-none">
      A handcrafted project by{" "}
      <a 
        href="https://kuttiyil.net" 
        target="_blank" 
        rel="noopener noreferrer"
        className="font-medium text-neutral-400 hover:text-red-400 transition-colors duration-200 underline underline-offset-4 decoration-neutral-700 hover:decoration-red-400/50"
      >
        Thomas Kuttiyil Oommen
      </a>
    </p>
  </footer>
);
export default function App() {
  // --- Auth Session State ---
  const [username, setUsername] = useState(() => localStorage.getItem('pomo_user_session') || '');
  const [passcode, setPasscode] = useState(() => localStorage.getItem('pomo_token_session') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // --- Login Screen Interactive State ---
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [inputUser, setInputUser] = useState('');
  const [inputPass, setInputPass] = useState('');
  const [authFeedback, setAuthFeedback] = useState('');

  // --- Dynamic Dashboard States ---
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [buckets, setBuckets] = useState(['Project', 'Firm Initiative', 'Personal']);
  const [showBucketSettings, setShowBucketSettings] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');

  // --- Core Timer Configurations ---
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('work'); 
  const [streak, setStreak] = useState(0);

  // 1. Session Validator Engine
  useEffect(() => {
    if (!username || !passcode) return;

    async function hydrateProfile() {
      try {
        const res = await fetch('/api/sync', {
          headers: { 
            'x-app-user': username,
            'x-app-passcode': passcode 
          }
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
  }, [username, passcode]);

  // 2. Cloud Synchronization Relay
  const syncToCloud = async (updatedTasks, updatedCompleted, updatedBuckets) => {
    if (!username || !passcode) return;
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-app-user': username,
          'x-app-passcode': passcode
        },
        body: JSON.stringify({ 
          tasks: updatedTasks, 
          completedTasks: updatedCompleted, 
          buckets: updatedBuckets || buckets 
        })
      });
    } catch (e) {
      console.error("Cloud engine sync failure:", e);
    }
  };

  // 3. User Credentials Handshake Routine
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthFeedback('');
    if (!inputUser.trim() || !inputPass.trim()) return;

    const actionType = isSignUpMode ? 'signup' : 'login';
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-action': actionType
        },
        body: JSON.stringify({ username: inputUser.trim(), password: inputPass.trim() })
      });

      const data = await res.json();

      if (res.status === 200) {
        if (isSignUpMode) {
          setAuthFeedback('Account authorized! Switching to login...');
          setIsSignUpMode(false);
          setInputPass('');
        } else {
          localStorage.setItem('pomo_user_session', inputUser.trim().toLowerCase());
          localStorage.setItem('pomo_token_session', inputPass.trim());
          setUsername(inputUser.trim().toLowerCase());
          setPasscode(inputPass.trim());
        }
      } else {
        setAuthFeedback(data.error || 'Authentication processing rejected');
      }
    } catch (err) {
      setAuthFeedback('Network gateway processing failure');
    }
  };

  const handleLogOut = () => {
    localStorage.removeItem('pomo_user_session');
    localStorage.removeItem('pomo_token_session');
    setUsername('');
    setPasscode('');
    setIsAuthenticated(false);
    setTasks([]);
    setBuckets(['Project', 'Firm Initiative', 'Personal']);
    setActiveTaskId(null);
  };

  // 4. Timer Logic
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
              setStreak(prev => prev + 1);
              setMode('shortBreak');
              setMinutes(5);
            } else {
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
  }, [isActive, minutes, seconds, mode]);

  // 5. Core Operational Task Management Handlers
  const handleAddTask = (text, bucket, dueDate) => {
    const newTask = {
      id: Date.now().toString(),
      text,
      bucket: bucket || buckets[0] || 'Project',
      dueDate: dueDate || 'Today'
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    syncToCloud(updated, completedTasks, buckets);
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
    syncToCloud(updatedTasks, updatedCompleted, buckets);
  };

  const handleAddBucket = () => {
    if (!newBucketName.trim() || buckets.includes(newBucketName.trim())) return;
    const nextBuckets = [...buckets, newBucketName.trim()];
    setBuckets(nextBuckets);
    setNewBucketName('');
    syncToCloud(tasks, completedTasks, nextBuckets);
  };

  const handleRemoveBucket = (targetBucket) => {
    const nextBuckets = buckets.filter(b => b !== targetBucket);
    setBuckets(nextBuckets);
    syncToCloud(tasks, completedTasks, nextBuckets);
  };

  const getBucketStyle = (bucket) => {
    const clean = bucket?.toLowerCase() || '';
    if (clean === 'project') return 'bg-[#212433] text-[#aac7ff] border-[#30374d]';
    if (clean === 'firm initiative') return 'bg-[#332521] text-[#ffb4a2] border-[#4d3630]';
    if (clean === 'personal') return 'bg-[#2d332d] text-[#bacfbc] border-[#3b453b]';
    return 'bg-[#23242a] text-[#c4c6cf] border-[#43474e]';
  };

  // --- RENDERING NODE 1: AUTH LAYER GATE SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#1c1b1f] border border-[#2d2b30] rounded-[28px] p-6 shadow-xl space-y-6">
          <div className="text-center">
            <span className="text-[10px] font-bold tracking-widest text-[#aac7ff] uppercase">Workspace Gateway v3</span>
            <h1 className="text-xl font-medium text-[#e3e3e3] mt-1">{isSignUpMode ? 'Deploy Cloud Identity' : 'Authenticate Session'}</h1>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-[#919191]" />
              <input 
                type="text" 
                placeholder="Username" 
                value={inputUser} 
                onChange={(e) => setInputUser(e.target.value)} 
                className="w-full bg-[#121212] border border-[#49454f] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#aac7ff]" 
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-[#919191]" />
              <input 
                type="password" 
                placeholder="Password" 
                value={inputPass} 
                onChange={(e) => setInputPass(e.target.value)} 
                className="w-full bg-[#121212] border border-[#49454f] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#aac7ff]" 
              />
            </div>

            {authFeedback && <div className="text-[11px] text-center text-[#ffb4a2] bg-[#2d1f1c] p-2 rounded-lg border border-[#4d2d26]">{authFeedback}</div>}

            <button type="submit" className="w-full py-2.5 bg-[#aac7ff] text-[#002f66] rounded-xl font-semibold text-xs tracking-wide hover:bg-[#b6c4ff] transition-all flex items-center justify-center gap-1.5">
              {isSignUpMode ? 'Initialize Profile' : 'Unlock Dashboard'} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="text-center">
            <button onClick={() => { setIsSignUpMode(!isSignUpMode); setAuthFeedback(''); }} className="text-xs text-[#919191] hover:text-[#aac7ff] underline underline-offset-4">
              {isSignUpMode ? 'Already registered? Log in here' : 'Need an isolated cloud account? Create one'}
            </button>
          </div>
        </div>
        <ProjectFooter />
      </div>
    );
  }

  const currentActiveTask = tasks.find(t => t.id === activeTaskId);

  // --- RENDERING NODE 2: CORE WORKSPACE DASHBOARD ---
  return (
    <div className="min-h-screen bg-[#121212] text-[#e3e3e3] font-sans flex flex-col items-center py-10 px-4">
      
      {/* Session Management Header Banner */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 px-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-[#bacfbc] rounded-full animate-pulse" />
          <span className="text-xs text-[#919191]">Active Terminal: <strong className="text-[#e3e3e3]">{username}</strong></span>
        </div>
        <button onClick={handleLogOut} className="px-3 py-1 bg-[#25232a] border border-[#49454f] text-[#919191] hover:text-[#ffb4a2] hover:border-[#4d3630] rounded-lg text-[11px] font-medium transition-colors">
          Lock Console
        </button>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COMPONENT: CORE TIMER RUNTIME */}
        <div className="bg-[#1c1b1f] border border-[#2d2b30] rounded-[32px] p-8 flex flex-col items-center shadow-lg relative">
          <div className="w-full min-h-[54px] flex flex-col items-center justify-center mb-6 px-4 py-2 bg-[#121212] rounded-2xl border border-[#2d2b30] border-dashed">
            {currentActiveTask ? (
              <div className="text-center w-full">
                <span className="text-[9px] uppercase tracking-widest text-[#919191] block mb-1 font-semibold">Active Focus Target</span>
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border ${getBucketStyle(currentActiveTask.bucket)}`}>
                    {currentActiveTask.bucket}
                  </span>
                  <span className="text-xs font-medium text-[#aac7ff] truncate max-w-[200px]">
                    {currentActiveTask.text}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-xs text-[#79747e] italic">Select an objective card to activate focus layout</span>
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

        {/* RIGHT COMPONENT: CONFIGURED QUEUE DECK */}
        <div className="bg-[#1c1b1f] border border-[#2d2b30] rounded-[32px] p-6 flex flex-col gap-4 shadow-lg min-h-[460px] justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold tracking-wider text-[#919191] uppercase">Activity Deck Queue</h2>
              <button onClick={() => setShowBucketSettings(!showBucketSettings)} className="p-1.5 rounded-lg bg-[#25232a] border border-[#49454f] text-[#919191] hover:text-[#e3e3e3] transition-colors">
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* DYNAMIC SETTINGS COMPONENT MODULE */}
            {showBucketSettings && (
              <div className="mb-4 p-3 bg-[#121212] border border-[#49454f] rounded-xl space-y-2 animate-fade-in">
                <span className="text-[10px] font-semibold text-[#aac7ff] uppercase block">Edit Taxonomy Labels</span>
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
            )}

            {/* INTERACTIVE CARDS RENDER LOOP */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    activeTaskId === task.id ? 'bg-[#232a3d] border-[#aac7ff]' : 'bg-[#121212] border-[#2d2b30] hover:bg-[#1a191e]'
                  }`}
                >
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
                <div className="text-center py-8 border border-dashed border-[#2d2b30] rounded-xl bg-[#151418]">
                  <p className="text-xs text-[#79747e] px-4">Deck clear. Deploy a card from below to initialize analytics tracking.</p>
                </div>
              )}
            </div>
          </div>

          {/* PERSISTENT INITIALIZATION FOOTER CONFIGURATOR */}
          <div className="bg-[#121212] border border-[#2d2b30] rounded-2xl p-4 mt-auto space-y-3">
            <input id="new-task-text" type="text" placeholder="Specify objective pipeline..." className="w-full bg-[#1c1b1f] border border-[#49454f] rounded-xl px-3 py-2 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#aac7ff]" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-[#919191] block mb-1 px-1">Classification Lane</label>
                <select id="new-task-bucket" className="w-full bg-[#1c1b1f] border border-[#49454f] rounded-xl px-2 py-2 text-[11px] text-[#e3e3e3] focus:outline-none">
                  {buckets.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-[#919191] block mb-1 px-1">Timeline Deadline</label>
                <input id="new-task-date" type="date" className="w-full bg-[#1c1b1f] border border-[#49454f] rounded-xl px-2 py-1.5 text-[11px] text-[#e3e3e3] focus:outline-none" />
              </div>
            </div>
            <button
              onClick={() => {
                const textEl = document.getElementById('new-task-text');
                const bucketEl = document.getElementById('new-task-bucket');
                const dateEl = document.getElementById('new-task-date');
                if (textEl && textEl.value.trim()) {
                  handleAddTask(textEl.value.trim(), bucketEl ? bucketEl.value : buckets[0], dateEl && dateEl.value ? dateEl.value : 'Today');
                  textEl.value = '';
                  if (dateEl) dateEl.value = '';
                }
              }}
              className="w-full py-2 bg-[#aac7ff] text-[#002f66] hover:bg-[#b6c4ff] rounded-xl font-medium text-xs tracking-wide transition-all flex items-center justify-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Initialize Target Card
            </button>
          </div>

        </div>
      </div>
      <ProjectFooter />
    </div>
  );
}