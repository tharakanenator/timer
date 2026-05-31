import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti'; // Typo fixed from 'canvas-commetti'
import { Play, Pause, RotateCcw, Plus, Trash2, CheckCircle2, Moon, Sun, Award, Flame } from 'lucide-react';

export default function App() {
  // --- Core States (Starting completely clean for cloud-sync) ---
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState(null);
  
  // --- Security Gate State ---
  const [passcode, setPasscode] = useState(() => localStorage.getItem('material_pomo_token') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // --- Timer & Mode States ---
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('work'); // work, shortBreak, longBreak
  const [streak, setStreak] = useState(0);

  // 1. Verify Passcode & Load Cloud Data on Initialization
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
          setIsAuthenticated(true);
          localStorage.setItem('material_pomo_token', passcode);
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('material_pomo_token');
        }
      } catch (e) {
        console.error("Authentication sync error:", e);
      }
    }
    loadCloudData();
  }, [passcode]);

  // 2. Centralized Cloud Persistence Trigger
  const syncToCloud = async (updatedTasks, updatedCompleted) => {
    if (!passcode) return;
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-app-passcode': passcode
        },
        body: JSON.stringify({ tasks: updatedTasks, completedTasks: updatedCompleted })
      });
    } catch (e) {
      console.error("Cloud database sync failed:", e);
    }
  };

  // 3. Timer Running Engine
  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (seconds === 0) {
          if (minutes === 0) {
            handleTimerExpiry();
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
  }, [isActive, minutes, seconds]);

  const handleTimerExpiry = () => {
    setIsActive(false);
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    
    if (mode === 'work') {
      setStreak(prev => prev + 1);
      switchMode('shortBreak');
    } else {
      switchMode('work');
    }
  };

  const switchMode = (newMode) => {
    setIsActive(false);
    setMode(newMode);
    if (newMode === 'work') setMinutes(25);
    else if (newMode === 'shortBreak') setMinutes(5);
    else if (newMode === 'longBreak') setMinutes(15);
    setSeconds(0);
  };

  // 4. Task Management Action Handlers
  const handleAddTask = (text, bucket, dueDate) => {
    const newTask = {
      id: Date.now().toString(),
      text,
      bucket: bucket || 'General',
      dueDate: dueDate || 'Today'
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    syncToCloud(updated, completedTasks);
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
    syncToCloud(updatedActive, updatedCompleted);
  };

  const getBucketStyle = (bucket) => {
    switch(bucket?.toLowerCase()) {
      case 'work': return 'bg-[#2d221c] text-[#ffb794] border-[#a03d0f]';
      case 'personal': return 'bg-[#1c2d22] text-[#b4eab7] border-[#0fa03d]';
      default: return 'bg-[#23242a] text-[#c4c6cf] border-[#43474e]';
    }
  };

  // --- RENDER PATTERN A: Token Gate Overlay ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#1c1b1f] border border-[#2d2b30] rounded-[24px] p-6 text-center shadow-xl animate-fade-in">
          <span className="text-sm font-semibold tracking-wider text-[#aac7ff] uppercase block mb-4">Workspace Encrypted</span>
          <p className="text-xs text-[#79747e] mb-6">Provide your authorization key to sync your environment logs.</p>
          <input
            type="password"
            placeholder="Passcode"
            onKeyDown={(e) => {
              if (e.key === 'Enter') setPasscode(e.target.value);
            }}
            className="w-full bg-[#121212] border border-[#49454f] rounded-xl px-4 py-2.5 text-center text-sm text-[#e3e3e3] focus:outline-none focus:border-[#aac7ff] tracking-widest"
          />
          <span className="text-[10px] text-[#49454f] block mt-3">Press Enter to Unlock Workspace</span>
        </div>
      </div>
    );
  }

  // --- RENDER PATTERN B: Core App View ---
  return (
    <div className="min-h-screen bg-[#121212] text-[#e3e3e3] font-sans flex flex-col items-center py-12 px-4 transition-all">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: Focused State Engine */}
        <div className="bg-[#1c1b1f] border border-[#2d2b30] rounded-[32px] p-8 flex flex-col items-center shadow-lg">
          <div className="flex gap-2 mb-8 bg-[#121212] p-1.5 rounded-full border border-[#2d2b30]">
            {['work', 'shortBreak', 'longBreak'].map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                  mode === m ? 'bg-[#aac7ff] text-[#002f66]' : 'text-[#919191] hover:text-[#e3e3e3]'
                }`}
              >
                {m === 'work' ? 'Focus' : m === 'shortBreak' ? 'Short Break' : 'Long Break'}
              </button>
            ))}
          </div>

          <div className="text-7xl font-light tracking-tighter text-[#e3e3e3] my-4 tabular-nums">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          <div className="text-xs text-[#919191] flex items-center gap-1.5 mb-8">
            <Flame className="h-3.5 w-3.5 text-[#ffb794]" />
            <span>Daily Streak: <strong>{streak}</strong> focus intervals</span>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setIsActive(!isActive)}
              className="h-14 w-14 rounded-full bg-[#aac7ff] text-[#002f66] flex items-center justify-center shadow-md hover:scale-105 transition-transform"
            >
              {isActive ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
            </button>
            <button
              onClick={() => { setIsActive(false); switchMode(mode); }}
              className="h-14 w-14 rounded-full bg-[#25232a] border border-[#49454f] text-[#e3e3e3] flex items-center justify-center hover:bg-[#2d2b30] transition-colors"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Active Queue & Clean View Fallback */}
        <div className="bg-[#1c1b1f] border border-[#2d2b30] rounded-[32px] p-6 flex flex-col gap-6 shadow-lg h-[460px] justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-wider text-[#919191] uppercase mb-4">Activity Deck</h2>
            
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    activeTaskId === task.id 
                      ? 'bg-[#232a3d] border-[#aac7ff]' 
                      : 'bg-[#121212] border-[#2d2b30] hover:bg-[#1a191e]'
                  }`}
                >
                  <div className="flex justify-between items-start gap-1 mb-2">
                    <span className="text-xs font-medium text-[#e3e3e3] line-clamp-2 flex-1">
                      {task.text}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }}
                      className="h-6 w-6 rounded-full bg-[#25232a] border border-[#49454f] text-[#bacfbc] hover:bg-[#bacfbc] hover:text-[#002f66] flex items-center justify-center text-xs ml-1 transition-all"
                    >
                      ✓
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-[#919191]">
                    <span className={`px-1.5 py-0.5 rounded-full border ${getBucketStyle(task.bucket)}`}>
                      {task.bucket}
                    </span>
                    <span>Due: {task.dueDate}</span>
                  </div>
                </div>
              ))}

              {/* Clean Material Fallback Component */}
              {tasks.length === 0 && (
                <div className="text-center py-12 border border-dashed border-[#2d2b30] rounded-xl bg-[#151418]">
                  <p className="text-xs text-[#79747e] tracking-wide px-4">
                    All clear. Deploy a task card from the panel below to initiate your next deep focus block.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Simple Inline Quick-Add Card */}
        {/* Task Configuration Form Container */}
<div className="bg-[#121212] border border-[#2d2b30] rounded-2xl p-4 mt-auto">
  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#919191] block mb-2">Deploy Task Card</span>
  
  <div className="space-y-3">
    {/* Objective Input */}
    <input
      id="new-task-text"
      type="text"
      placeholder="What objective are you targeting?"
      className="w-full bg-[#1c1b1f] border border-[#49454f] rounded-xl px-3 py-2 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#aac7ff]"
    />
    
    <div className="grid grid-cols-2 gap-2">
      {/* Bucket Dropdown Selector */}
      <div>
        <label className="text-[9px] text-[#919191] block mb-1 px-1">Category Bucket</label>
        <select
          id="new-task-bucket"
          className="w-full bg-[#1c1b1f] border border-[#49454f] rounded-xl px-2 py-2 text-[11px] text-[#e3e3e3] focus:outline-none"
        >
          <option value="Project">Project</option>
          <option value="Firm Initiative">Firm Initiative</option>
          <option value="Personal">Personal</option>
        </select>
      </div>

      {/* Due Date Calendar Picker */}
      <div>
        <label className="text-[9px] text-[#919191] block mb-1 px-1">Due Date</label>
        <input
          id="new-task-date"
          type="date"
          className="w-full bg-[#1c1b1f] border border-[#49454f] rounded-xl px-2 py-1.5 text-[11px] text-[#e3e3e3] focus:outline-none focus:border-[#aac7ff]"
        />
      </div>
    </div>

    {/* Submission Trigger Button */}
    <button
      onClick={() => {
        const textEl = document.getElementById('new-task-text');
        const bucketEl = document.getElementById('new-task-bucket');
        const dateEl = document.getElementById('new-task-date');

        if (textEl && textEl.value.trim()) {
          // Fallback to "Today" if no calendar date is selected
          const finalDate = dateEl && dateEl.value ? dateEl.value : 'Today';
          
          handleAddTask(
            textEl.value.trim(), 
            bucketEl ? bucketEl.value : 'Project', 
            finalDate
          );

          // Clear out text and date values for next task entry
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
    </div>
  );
}