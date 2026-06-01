import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Play, Pause, RotateCcw, Plus, Trash2, Flame, Settings } from 'lucide-react';

export default function App() {
  // --- Core States ---
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState(null);
  
  // --- Dynamic Configurable Buckets State ---
  const [buckets, setBuckets] = useState(['Project', 'Firm Initiative', 'Personal']);
  const [showBucketSettings, setShowBucketSettings] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');

  // --- Security Gate State ---
  const [passcode, setPasscode] = useState(() => localStorage.getItem('material_pomo_token') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // --- Timer States ---
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('work'); 
  const [streak, setStreak] = useState(0);

  // 1. Hydrate App from Cloud
  useEffect(() => {
    if (!passcode) return;

    async function loadCloudData() {
      try {
        const res = await fetch('/api/sync', {
          headers: { 'x-app-passcode': passcode }
        });

        if (res.status === 200) {
          const data = await res.json();
          if (data.tasks) setTasks(data.tasks);
          if (data.completedTasks) setCompletedTasks(data.completedTasks);
          if (data.buckets) setBuckets(data.buckets); // Load custom buckets
          setIsAuthenticated(true);
          localStorage.setItem('material_pomo_token', passcode);
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('material_pomo_token');
        }
      } catch (e) {
        console.error("Cloud connection error:", e);
      }
    }
    loadCloudData();
  }, [passcode]);

  // 2. Unified Sync Engine
  const syncToCloud = async (updatedTasks, updatedCompleted, updatedBuckets) => {
    if (!passcode) return;
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-app-passcode': passcode
        },
        body: JSON.stringify({ 
          tasks: updatedTasks, 
          completedTasks: updatedCompleted, 
          buckets: updatedBuckets || buckets 
        })
      });
    } catch (e) {
      console.error("Cloud database sync failed:", e);
    }
  };

  // 3. Timer Engine
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

  // 4. Task Handlers
  const handleAddTask = (text, bucket, dueDate) => {
    const newTask = {
      id: Date.now().toString(),
      text,
      bucket: bucket || buckets[0] || 'General',
      dueDate: dueDate || 'Today'
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    syncToCloud(updated, completedTasks, buckets);
  };

  const handleCompleteTask = (id) => {
    const taskToComplete = tasks.find(t => t.id === id);
    if (!taskToComplete) return;

    const updatedActive = tasks.filter(t => t.id !== id);
    const updatedCompleted = [...completedTasks, { ...taskToComplete, completedAt: new Date().toLocaleDateString() }];
    
    setTasks(updatedActive);
    setCompletedTasks(updatedCompleted);
    if (activeTaskId === id) setActiveTaskId(null);
    
    confetti({ particleCount: 50, spread: 40 });
    syncToCloud(updatedActive, updatedCompleted, buckets);
  };

  // 5. Configurable Bucket Handlers
  const handleAddBucket = () => {
    if (!newBucketName.trim()) return;
    if (buckets.includes(newBucketName.trim())) return;

    const updatedBuckets = [...buckets, newBucketName.trim()];
    setBuckets(updatedBuckets);
    setNewBucketName('');
    syncToCloud(tasks, completedTasks, updatedBuckets);
  };

  const handleRemoveBucket = (bucketToRemove) => {
    const updatedBuckets = buckets.filter(b => b !== bucketToRemove);
    setBuckets(updatedBuckets);
    syncToCloud(tasks, completedTasks, updatedBuckets);
  };

  // Dynamic Border Color generator for custom labels
  const getBucketStyle = (bucket) => {
    const clean = bucket?.toLowerCase() || '';
    if (clean === 'project') return 'bg-[#212433] text-[#aac7ff] border-[#30374d]';
    if (clean === 'firm initiative') return 'bg-[#332521] text-[#ffb4a2] border-[#4d3630]';
    if (clean === 'personal') return 'bg-[#2d332d] text-[#bacfbc] border-[#3b453b]';
    return 'bg-[#23242a] text-[#c4c6cf] border-[#43474e]';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#1c1b1f] border border-[#2d2b30] rounded-[24px] p-6 text-center shadow-xl">
          <span className="text-sm font-semibold tracking-wider text-[#aac7ff] uppercase block mb-4">Workspace Encrypted</span>
          <input
            type="password"
            placeholder="Passcode"
            onKeyDown={(e) => { if (e.key === 'Enter') setPasscode(e.target.value); }}
            className="w-full bg-[#121212] border border-[#49454f] rounded-xl px-4 py-2.5 text-center text-sm text-[#e3e3e3] focus:outline-none focus:border-[#aac7ff] tracking-widest"
          />
        </div>
      </div>
    );
  }

  const currentActiveTask = tasks.find(t => t.id === activeTaskId);

  return (
    <div className="min-h-screen bg-[#121212] text-[#e3e3e3] font-sans flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* TIMER PANEL */}
        <div className="bg-[#1c1b1f] border border-[#2d2b30] rounded-[32px] p-8 flex flex-col items-center shadow-lg relative">
          
          {/* Active Target Banner */}
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
              <span className="text-xs text-[#79747e] italic">Select an objective from your deck to link tracking</span>
            )}
          </div>

          <div className="text-7xl font-light tracking-tighter text-[#e3e3e3] my-4 tabular-nums select-none">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          <div className="text-xs text-[#919191] flex items-center gap-1.5 mb-6">
            <Flame className="h-3.5 w-3.5 text-[#ffb794]" />
            <span>Streak: <strong>{streak}</strong> focus blocks</span>
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

        {/* ACTIVITY DECK */}
        <div className="bg-[#1c1b1f] border border-[#2d2b30] rounded-[32px] p-6 flex flex-col gap-4 shadow-lg min-h-[460px] justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold tracking-wider text-[#919191] uppercase">Activity Deck</h2>
              <button 
                onClick={() => setShowBucketSettings(!showBucketSettings)} 
                className="p-1.5 rounded-lg bg-[#25232a] border border-[#49454f] text-[#919191] hover:text-[#e3e3e3]"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* DYNAMIC BUCKETS SETUP PANEL */}
            {showBucketSettings && (
              <div className="mb-4 p-3 bg-[#121212] border border-[#49454f] rounded-xl animate-fade-in space-y-2">
                <span className="text-[10px] font-semibold text-[#aac7ff] uppercase block">Manage Category Buckets</span>
                <div className="flex flex-wrap gap-1.5 py-1">
                  {buckets.map(b => (
                    <div key={b} className="flex items-center gap-1 px-2 py-0.5 bg-[#1c1b1f] border border-[#2d2b30] rounded-full text-[10px]">
                      <span>{b}</span>
                      <button onClick={() => handleRemoveBucket(b)} className="text-[#ffb4a2] hover:text-[#ff8f73] font-bold ml-1">×</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="New bucket title..." 
                    value={newBucketName}
                    onChange={(e) => setNewBucketName(e.target.value)}
                    className="bg-[#1c1b1f] border border-[#49454f] rounded-lg px-2 py-1 text-xs text-[#e3e3e3] flex-1 focus:outline-none"
                  />
                  <button onClick={handleAddBucket} className="px-3 bg-[#aac7ff] text-[#002f66] rounded-lg font-medium text-xs">Add</button>
                </div>
              </div>
            )}

            {/* TASKS LIST */}
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
                    <button onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }} className="h-6 w-6 rounded-full bg-[#25232a] border border-[#49454f] text-[#bacfbc] flex items-center justify-center text-xs ml-1 hover:bg-[#bacfbc] hover:text-[#002f66]">✓</button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-[#919191]">
                    <span className={`px-1.5 py-0.5 rounded-full border ${getBucketStyle(task.bucket)}`}>{task.bucket}</span>
                    <span>Due: {task.dueDate}</span>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-8 border border-dashed border-[#2d2b30] rounded-xl bg-[#151418]">
                  <p className="text-xs text-[#79747e] px-4">All clear. Deploy a card below to begin focus blocks.</p>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC CARD DEPLOYMENT PANEL */}
          <div className="bg-[#121212] border border-[#2d2b30] rounded-2xl p-4 mt-auto space-y-3">
            <input id="new-task-text" type="text" placeholder="What objective are you targeting?" className="w-full bg-[#1c1b1f] border border-[#49454f] rounded-xl px-3 py-2 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#aac7ff]" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-[#919191] block mb-1 px-1">Category Bucket</label>
                <select id="new-task-bucket" className="w-full bg-[#1c1b1f] border border-[#49454f] rounded-xl px-2 py-2 text-[11px] text-[#e3e3e3] focus:outline-none">
                  {buckets.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-[#919191] block mb-1 px-1">Due Date</label>
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
    </div>
  );
}