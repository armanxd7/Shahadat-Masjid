import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Check, 
  Plus, 
  Trash2, 
  Flame, 
  Book, 
  Heart, 
  Smile, 
  HelpCircle,
  Sparkles,
  Award,
  BookOpen,
  Infinity
} from "lucide-react";
import { DayHabit } from "../types";

interface HabitsProps {
  habits: DayHabit[];
  onToggleHabit: (id: string) => void;
  onAddCustomHabit: (name: string, type: 'salah' | 'quran' | 'dhikr' | 'charity' | 'custom', extra?: string) => void;
  onRemoveCustomHabit: (id: string) => void;
  streak: number;
}

export default function Habits({ habits, onToggleHabit, onAddCustomHabit, onRemoveCustomHabit, streak }: HabitsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitType, setNewHabitType] = useState<'salah' | 'quran' | 'dhikr' | 'charity' | 'custom'>("custom");
  const [newHabitExtra, setNewHabitExtra] = useState("");

  const total = habits.length;
  const completedCount = habits.filter(h => h.completed).length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  // SVG Circular progress dimensions
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const handleAdd = () => {
    if (!newHabitName.trim()) return;
    onAddCustomHabit(
      newHabitName.trim(), 
      newHabitType, 
      newHabitExtra.trim() || undefined
    );
    setNewHabitName("");
    setNewHabitExtra("");
    setNewHabitType("custom");
    setModalOpen(false);
  };

  const getIconForType = (type: DayHabit['type']) => {
    switch(type) {
      case "salah":
        return <Award className="w-4 h-4 text-emerald-700" />;
      case "quran":
        return <BookOpen className="w-4 h-4 text-amber-700" />;
      case "dhikr":
        return <Sparkles className="w-4 h-4 text-indigo-700" />;
      case "charity":
        return <Heart className="w-4 h-4 text-red-700" />;
      default:
        return <Smile className="w-4 h-4 text-on-surface-variant" />;
    }
  };

  const getColorClassForType = (type: DayHabit['type']) => {
    switch(type) {
      case "salah":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "quran":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "dhikr":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "charity":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-surface-container text-on-surface-variant border-outline-variant";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Habit Button */}
      <div className="flex justify-between items-center py-2">
        <div>
          <h2 className="font-serif text-2xl font-bold text-primary-base">Habits</h2>
          <p className="text-xs text-on-surface-variant font-medium">Daily spiritual consistency trackers</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#fed65b] text-[#241a00] hover:bg-[#ffe088] transition-all active:scale-95 shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Circle Streaks Block showing Streak Count & SVG circular progress ring */}
      <div className="relative bg-gradient-to-br from-primary-base to-primary-light text-white rounded-[32px] p-6 shadow-md flex items-center justify-between overflow-hidden border border-white/10">
        {/* Vector Background Detail */}
        <div className="absolute inset-0 islamic-pattern-bg opacity-[0.03] pointer-events-none z-0 animate-pulse"></div>

        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-1">
            <Flame className="w-5 h-5 text-gold-accent animate-bounce" />
            <h3 className="font-serif text-base font-bold text-white">Daily Consistency</h3>
          </div>
          <p className="text-xs text-on-primary-container max-w-[160px] leading-relaxed">
            Completing habits drives your internal spiritual growth. Let's aim for 100%!
          </p>
          <div className="flex items-baseline gap-2 pt-2">
            <span className="text-[26px] font-serif font-extrabold text-white">{streak}</span>
            <span className="text-xs font-semibold text-gold-accent">Day Streak 🔥</span>
          </div>
        </div>

        {/* Dynamic SVG Circular Ring */}
        <div className="relative z-10 w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background ring */}
            <circle 
              cx="64" 
              cy="64" 
              r={radius} 
              stroke="rgba(255, 255, 255, 0.08)"
              className="stroke-white/10"
              strokeWidth={strokeWidth} 
              fill="transparent" 
            />
            {/* Foreground progress ring */}
            <motion.circle 
              cx="64" 
              cy="64" 
              r={radius} 
              stroke="#fed65b"
              strokeWidth={strokeWidth} 
              fill="transparent" 
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: strokeDashoffset }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-lg font-sans font-bold text-white leading-none">{percentage}%</span>
            <span className="text-[8px] font-sans font-bold text-[#fed65b] uppercase mt-1 tracking-widest">
              {completedCount}/{total} Done
            </span>
          </div>
        </div>
      </div>

      {/* Habits List section */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 px-1">
          Today's Routine Checklist
        </h4>
        
        {habits.length === 0 ? (
          <div className="text-center py-10 bg-white border border-dashed border-outline-variant rounded-2xl p-6 text-on-surface-variant">
            <Smile className="w-8 h-8 text-gold-accent mx-auto mb-2" />
            <p className="text-xs font-semibold">No habits loaded. Create your customizable list above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {habits.map((habit) => (
              <div 
                key={habit.id}
                className="flex items-center justify-between p-4 bg-white rounded-2xl border border-outline-variant/30 shadow-sm transition-all hover:border-gold-accent/20 group"
              >
                <div 
                  onClick={() => onToggleHabit(habit.id)}
                  className="flex items-center gap-4.5 cursor-pointer flex-1"
                >
                  {/* Styled Checkbox circle */}
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${habit.completed ? "border-gold-accent bg-gold-accent" : "border-outline-variant/70 bg-transparent group-hover:border-gold-accent"}`}>
                    {habit.completed && <Check className="w-3.5 h-3.5 text-primary-base font-extrabold" />}
                  </div>

                  <div className="space-y-1">
                    <span className={`text-[13.5px] font-serif font-bold transition-all block ${habit.completed ? "line-through text-on-surface-variant/40" : "text-primary-base"}`}>
                      {habit.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-bold border ${getColorClassForType(habit.type)}`}>
                        {habit.type.toUpperCase()}
                      </span>
                      {habit.extraInfo && (
                        <span className="text-[9.5px] font-sans font-semibold text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded">
                          {habit.extraInfo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Only custom habits or extra choices have delete triggers */}
                {habit.type === "custom" && (
                  <button 
                    onClick={() => onRemoveCustomHabit(habit.id)}
                    className="p-2 text-on-surface-variant/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Custom Habit Dialog Modal popup */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[28px] max-w-sm w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-serif text-base font-bold text-primary-base">Add New Habit</h3>
                  <p className="text-xs text-on-surface-variant">Design a customizable custom routine</p>
                </div>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Form entries */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">Habit Label Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Read Surah Mulk, Morning Adhkar" 
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    className="w-full text-xs p-3.5 border border-outline-variant rounded-xl focus:ring-1 focus:ring-gold-accent outline-none bg-surface-container-low font-semibold text-primary-base"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">Habit Subtitle / Notes</label>
                  <input 
                    type="text" 
                    placeholder="e.g., 10 minutes, Every Fajr" 
                    value={newHabitExtra}
                    onChange={(e) => setNewHabitExtra(e.target.value)}
                    className="w-full text-xs p-3.5 border border-outline-variant rounded-xl focus:ring-1 focus:ring-gold-accent outline-none bg-surface-container-low font-semibold text-primary-base"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">Habit Group Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['salah', 'quran', 'dhikr', 'charity', 'custom'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setNewHabitType(item as any)}
                        className={`py-2 px-3 border rounded-xl text-center text-xs font-semibold capitalize transition-all ${newHabitType === item ? "border-gold-accent bg-gold-accent/15 text-primary-base" : "border-outline-variant bg-surface-container-low text-on-surface-variant"}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleAdd}
                disabled={!newHabitName.trim()}
                className="w-full py-3.5 bg-primary-base disabled:bg-primary-base/30 text-white font-sans font-bold text-xs rounded-full shadow hover:bg-primary-light transition-colors active:scale-95 text-center mt-4 h-12 flex items-center justify-center cursor-pointer"
              >
                Add Daily Checklist Habit
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
