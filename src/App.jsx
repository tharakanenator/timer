import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function App() {
  // Timer States
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);

  // Task States
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Design minimalist layout structure' }
  ]);
  const [newTaskText, setNewTaskText] = useState('');
  const [completedCount, setCompletedCount] = useState(0);

  // Core Timer Logic
  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      triggerAlarmCelebration();
      // Auto-switch modes when timer hits 0
      if (!isBreak) {
        setIsBreak(true);
        setTimeLeft(5 * 60);
      } else {
        setIsBreak(false);
        setTimeLeft(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, isBreak]);

  // Formatting Time (e.g., 25:00)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Positive Reinforcement: Celebration Engines
  const triggerAlarmCelebration = () => {
    // Soft, continuous burst when focus block finishes
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 }, colors: ['#bacfbc', '#aac7ff'] });
  };

  const triggerTaskCompletionCelebration = () => {
    // Sharp, crisp dopamine hit when a specific task is cleared
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#aac7ff', '#b6c4ff', '#e3e3e3'],
      ticks: 200
    });
  };

  // Handlers
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTaskText }]);
    setNewTaskText('');
  };

  const handleCompleteTask = (id) => {
    triggerTaskCompletionCelebration();
    setCompletedCount(prev => prev + 1);
    setTasks(tasks.filter(task => task.id !== id));
  };

  const skipTimerForTesting = () => {
    setTimeLeft(3); // Fast forward to last 3 seconds for testing completion flows
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#e3e3e3] font-sans flex flex-col items-center py-12 px-4 transition-colors duration-500">
      
      {/* Top Banner / Stat Pill */}
      <div className="w-full max-w-md flex justify-between items-center mb-12">
        <span className="text-sm font-semibold tracking-wider text-[#919191] uppercase">POMO.MATERIAL</span>
        <div className="flex items-center gap-2 bg-[#1d1b20] border border-[#2d2a33] px-4 py-1.5 rounded-full shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#bacfbc] animate-pulse"></span>
          <span className="text-xs font-medium text-[#bacfbc] tracking-wide">{completedCount} Focus Points</span>
        </div>
      </div>

      {/* Main Timer Container */}
      <div className="w-full max-w-md bg-[#1c1b1f] border border-[#2d2b30] rounded-[32px] p-8 text-center shadow-xl mb-8 relative overflow-hidden">
        
        {/* Mode Label */}
        <span className={`text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full ${isBreak ? 'bg-[#2d332d] text-[#bacfbc]' : 'bg-[#212433] text-[#aac7ff]'}`}>
          {isBreak ? 'Break Interval' : 'Deep Focus'}
        </span>

        {/* Big Clock */}
        <h1 className="text-7xl font-light tracking-tighter mt-8 mb-10 text-[#f4f0f5] tabular-nums select-none">
          {formatTime(timeLeft)}
        </h1>

        {/* Control Row */}
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-8 py-3.5 rounded-full font-medium tracking-wide shadow-md transition-all duration-300 transform active:scale-95 ${
              isRunning 
                ? 'bg-[#313033] text-[#f4f0f5] border border-[#49454f] hover:bg-[#3c3a3f]' 
                : 'bg-[#aac7ff] text-[#002f66] hover:bg-[#b6c4ff]'
            }`}
          >
            {isRunning ? 'Pause' : 'Start Focus'}
          </button>
          
          <button
            onClick={() => { setIsRunning(false); setTimeLeft(isBreak ? 5 * 60 : 25 * 60); }}
            className="p-3.5 rounded-full bg-[#1c1b1f] border border-[#49454f] text-[#919191] hover:text-[#e3e3e3] hover:bg-[#25232a] transition-all active:scale-95"
            title="Reset Timer"
          >
            ↺
          </button>

          <button
            onClick={skipTimerForTesting}
            className="text-[10px] uppercase tracking-widest text-[#49454f] hover:text-[#aac7ff] transition-colors ml-2"
          >
            [Skip to End]
          </button>
        </div>
      </div>

      {/* Task Section */}
      <div className="w-full max-w-md space-y-6">
        {/* Task Input Form */}
        <form onSubmit={handleAddTask} className="flex gap-2">
          <input
            type="text"
            placeholder="What are you working on?"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            className="flex-1 bg-[#1c1b1f] border border-[#49454f] rounded-2xl px-4 py-3 text-sm text-[#e3e3e3] placeholder-[#79747e] focus:outline-none focus:border-[#aac7ff] focus:ring-1 focus:ring-[#aac7ff] transition-all"
          />
          <button
            type="submit"
            className="px-5 bg-[#25232a] border border-[#49454f] hover:bg-[#313033] text-[#aac7ff] rounded-2xl font-medium text-sm transition-all active:scale-95"
          >
            Add
          </button>
        </form>

        {/* Dynamic Task List */}
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-4 rounded-2xl bg-[#1c1b1f] border border-[#2d2b30] hover:bg-[#25232a] transition-all group"
            >
              <span className="text-sm text-[#e3e3e3] font-medium tracking-wide truncate max-w-[75%]">
                {task.text}
              </span>
              <button
                onClick={() => handleCompleteTask(task.id)}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-[#212433] border border-[#30374d] text-[#aac7ff] hover:bg-[#aac7ff] hover:text-[#002f66] transition-all shadow-sm"
                title="Complete Task"
              >
                ✓
              </button>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-8 border border-dashed border-[#2d2b30] rounded-2xl">
              <p className="text-xs text-[#79747e] tracking-wide">All tasks completed. Add a new card to keep the momentum going.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}