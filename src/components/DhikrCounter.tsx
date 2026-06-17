import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  RotateCcw, 
  Sparkles, 
  Check, 
  Volume2, 
  VolumeX, 
  Flame, 
  TrendingUp, 
  BookOpen, 
  Award,
  ChevronRight,
  Plus,
  ArrowLeft
} from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface DhikrCounterProps {
  onBack?: () => void;
}

interface DhikrPreset {
  arabic: string;
  transliteration: string;
  translation: string;
}

const PRESETS: Record<string, DhikrPreset> = {
  "Subhanallah": {
    arabic: "سُبْحَانَ ٱللَّٰهِ",
    transliteration: "Subhan’Allah",
    translation: "Glory be to Allah"
  },
  "Alhamdulillah": {
    arabic: "ٱلْحَمْدُ لِلَّٰهِ",
    transliteration: "Alhamdulillah",
    translation: "Praise be to Allah"
  },
  "Allahu Akbar": {
    arabic: "ٱللَّٰهُ أَكْبَرُ",
    transliteration: "Allahu Akbar",
    translation: "Allah is the Greatest"
  },
  "La ilaha illallah": {
    arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ",
    transliteration: "La ilaha illallah",
    translation: "There is no deity but Allah"
  },
  "Astaghfirullah": {
    arabic: "أَسْتَغْفِرُ ٱللَّٰهَ",
    transliteration: "Astaghfirullah",
    translation: "I seek forgiveness from Allah"
  }
};

export default function DhikrCounter({ onBack }: DhikrCounterProps) {
  const [selectedTasbih, setSelectedTasbih] = useState<string>("Subhanallah");
  const [count, setCount] = useState<number>(0);
  const [goal, setGoal] = useState<number>(33);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [totalAccumulated, setTotalAccumulated] = useState<number>(0);
  const [history, setHistory] = useState<Record<string, number>>({});
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [customGoalOpen, setCustomGoalOpen] = useState<boolean>(false);
  const [customGoalInput, setCustomGoalInput] = useState<string>("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const todayDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Initialize Audio Context for beautiful chime sounds
  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.log("Audio play error:", e);
    }
  };

  const playSuccessSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Beautiful multi-tone gold chime
      const tones = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      tones.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.4);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
      });
    } catch (e) {
      console.log("Success audio error:", e);
    }
  };

  // Load offline data or pull from firebase on start
  useEffect(() => {
    const localCount = localStorage.getItem(`deen_dhikr_${selectedTasbih}_${todayDateStr}`);
    if (localCount) {
      setCount(parseInt(localCount, 10));
    } else {
      setCount(0);
    }

    const localGoal = localStorage.getItem(`deen_dhikr_goal_${selectedTasbih}`);
    if (localGoal) {
      setGoal(parseInt(localGoal, 10));
    }

    // Load overall history
    const savedHist = localStorage.getItem("deen_dhikr_history");
    if (savedHist) {
      try {
        setHistory(JSON.parse(savedHist));
      } catch (e) {
        setHistory({});
      }
    }

    // Load accumulator stats
    const savedTotal = localStorage.getItem("deen_dhikr_accumulated");
    if (savedTotal) {
      setTotalAccumulated(parseInt(savedTotal, 10));
    }

    // Fetch from Firebase if currentUser logged in
    const fetchFirebaseDhikr = async () => {
      const user = auth.currentUser;
      if (!user) return;
      setIsSyncing(true);
      try {
        const docRef = doc(db, "users", user.uid, "dhikr", `${todayDateStr}_${selectedTasbih}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const dbData = docSnap.data();
          if (dbData.count > (localCount ? parseInt(localCount, 10) : 0)) {
            setCount(dbData.count);
            localStorage.setItem(`deen_dhikr_${selectedTasbih}_${todayDateStr}`, String(dbData.count));
          }
          if (dbData.goal) {
            setGoal(dbData.goal);
          }
        }
      } catch (e) {
        console.error("Firebase fetch dhikr failed:", e);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchFirebaseDhikr();
  }, [selectedTasbih]);

  // Handle count increments
  const handleIncrement = () => {
    const nextCount = count + 1;
    setCount(nextCount);
    setSelectedTasbih((prev) => {
      localStorage.setItem(`deen_dhikr_${prev}_${todayDateStr}`, String(nextCount));
      return prev;
    });

    const nextAccumulated = totalAccumulated + 1;
    setTotalAccumulated(nextAccumulated);
    localStorage.setItem("deen_dhikr_accumulated", String(nextAccumulated));

    // Sound and vibration feedback
    playClickSound();
    if (navigator.vibrate) {
      navigator.vibrate(35);
    }

    // Check goal achievement
    if (nextCount === goal) {
      setShowCelebration(true);
      playSuccessSound();
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }

    // Update history tracker
    const todayLabel = `${todayDateStr}_${selectedTasbih}`;
    const nextHistory = { ...history, [todayLabel]: nextCount };
    setHistory(nextHistory);
    localStorage.setItem("deen_dhikr_history", JSON.stringify(nextHistory));

    // Trigger debounced Firestore save
    triggerDebouncedFirebaseSave(nextCount, goal, selectedTasbih);
  };

  // Helper to trigger Firebase save
  const triggerDebouncedFirebaseSave = (currentCount: number, currentGoal: number, phrase: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const user = auth.currentUser;
      if (!user) return;

      setIsSyncing(true);
      const docPath = `users/${user.uid}/dhikr/${todayDateStr}_${phrase}`;
      try {
        await setDoc(doc(db, "users", user.uid, "dhikr", `${todayDateStr}_${phrase}`), {
          id: `${todayDateStr}_${phrase}`,
          userId: user.uid,
          date: todayDateStr,
          count: currentCount,
          goal: currentGoal,
          tasbihName: phrase,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, docPath);
      } finally {
        setIsSyncing(false);
      }
    }, 1500); // 1.5 second debounce delay to limit Firebase write quota usage
  };

  // Safe release of timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleReset = () => {
    if (confirm("Are you sure you want to reset today's counter for this phrase?")) {
      setCount(0);
      localStorage.setItem(`deen_dhikr_${selectedTasbih}_${todayDateStr}`, "0");
      triggerDebouncedFirebaseSave(0, goal, selectedTasbih);
    }
  };

  const selectGoal = (g: number) => {
    setGoal(g);
    localStorage.setItem(`deen_dhikr_goal_${selectedTasbih}`, String(g));
    triggerDebouncedFirebaseSave(count, g, selectedTasbih);
  };

  const handleCustomGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanG = parseInt(customGoalInput, 10);
    if (!isNaN(cleanG) && cleanG > 0) {
      selectGoal(cleanG);
      setCustomGoalOpen(false);
      setCustomGoalInput("");
    }
  };

  const activePreset = PRESETS[selectedTasbih] || {
    arabic: "الذِّكْر",
    transliteration: selectedTasbih,
    translation: "Remembrance of Allah"
  };

  // Circumference calculation for SVG display ring
  const circleRadius = 110;
  const strokeWidth = 14;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const fillProgress = Math.min(count / goal, 1);
  const strokeDashoffset = circleCircumference - fillProgress * circleCircumference;

  return (
    <div className="space-y-6">
      {/* Header section with Deen themed elegance */}
      <div className="flex justify-between items-center py-2">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#012d1d]/5 hover:bg-[#012d1d]/15 text-primary-base border-none cursor-pointer transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="font-serif text-2xl font-bold text-primary-base">Dhikr Counter</h2>
            <p className="text-xs text-on-surface-variant font-medium">Be mindful of Allah in every heartbeat</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Sound toggle key */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[#012d1d]/5 hover:bg-[#012d1d]/15 text-primary-base border-none cursor-pointer transition-colors"
            title={soundEnabled ? "Mute sound" : "Unmute sound"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Sync indicator */}
          <span className={`text-[9.5px] font-sans font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1.5 border select-none transition-all ${
            isSyncing 
              ? "bg-amber-50 text-amber-800 border-amber-200" 
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? "bg-amber-500 animate-spin" : "bg-emerald-500 animate-pulse"}`}></span>
            {isSyncing ? "Syncing..." : "Saved"}
          </span>
        </div>
      </div>

      {/* Selectable Tasbih presets tabs */}
      <div className="bg-white border border-outline-variant/30 rounded-[28px] p-4 shadow-sm space-y-3">
        <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider block">
          Select Remembrance Phrase (तस्बिह रोज्नुहोस्)
        </label>
        
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-2 px-2">
          {Object.keys(PRESETS).map((preset) => {
            const isSelected = selectedTasbih === preset;
            return (
              <button
                key={preset}
                onClick={() => setSelectedTasbih(preset)}
                className={`flex-shrink-0 px-4 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                  isSelected 
                    ? "bg-[#012d1d] text-white border-[#012d1d] shadow-md scale-103" 
                    : "bg-[#012d1d]/5 text-primary-base border-transparent hover:bg-[#012d1d]/10"
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>

        {/* Selected phrase translation & transliteration pane */}
        <div className="bg-[#012d1d]/4 border border-[#012d1d]/10 rounded-2xl p-4 text-center space-y-2 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-gold-accent/5 rounded-full blur-xl pointer-events-none"></div>
          <p className="font-serif text-2xl font-semibold text-primary-base leading-relaxed tracking-wider">
            {activePreset.arabic}
          </p>
          <div>
            <p className="text-xs font-bold text-amber-900 font-sans">{activePreset.transliteration}</p>
            <p className="text-[10px] text-on-surface-variant font-medium italic mt-0.5">{activePreset.translation}</p>
          </div>
        </div>
      </div>

      {/* Interactive Main Counter Wheel Screen */}
      <div className="flex flex-col items-center justify-center py-6 relative">
        <div className="relative w-[260px] h-[260px] flex items-center justify-center select-none">
          {/* Background Ring */}
          <svg className="absolute top-0 left-0 w-full h-full -rotate-90">
            <circle
              cx="130"
              cy="130"
              r={circleRadius}
              className="stroke-gray-100"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Active Progress Ring */}
            <motion.circle
              cx="130"
              cy="130"
              r={circleRadius}
              className="stroke-[#012d1d]"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circleCircumference}
              animate={{ strokeDashoffset }}
              transition={{ tension: 400, friction: 30 }}
              strokeLinecap="round"
            />
          </svg>

          {/* Interactive Tap Button Trigger Inside */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={handleIncrement}
            className="w-[200px] h-[200px] bg-gradient-to-br from-white to-[#012d1d]/5 rounded-full shadow-lg border-4 border-white flex flex-col items-center justify-center cursor-pointer relative group overflow-hidden focus:outline-none"
          >
            {/* Soft pulse background reflection */}
            <div className="absolute inset-0 bg-primary-base/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <AnimatePresence mode="popLayout">
              <motion.span
                key={count}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="font-serif text-5xl font-black text-primary-base font-sans"
              >
                {count}
              </motion.span>
            </AnimatePresence>

            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mt-1.5 flex items-center gap-1 text-[#735c00]">
              <Sparkles className="w-3 h-3 text-gold-accent" /> Tap to Count
            </span>

            <span className="text-[10.5px] text-gray-400 font-bold font-sans mt-0.5">
              Goal: {goal}
            </span>
          </motion.button>
        </div>

        {/* Counter bottom operations bar */}
        <div className="flex items-center gap-6 mt-4">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-full font-sans text-[10px] font-extrabold uppercase tracking-wide text-red-700 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Today
          </button>
        </div>
      </div>

      {/* Goal Settings Tray */}
      <div className="bg-white border border-outline-variant/30 rounded-[28px] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Set Goal (तस्बिह लक्ष्य)
          </h3>
          <span className="text-[10.5px] font-sans font-extrabold text-gold-accent bg-primary-base px-2.5 py-1 rounded-full">
            Target: {goal}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {[33, 99, 100].map((num) => {
            const isSelected = goal === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => selectGoal(num)}
                className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                  isSelected 
                    ? "bg-[#012d1d] text-white border-[#012d1d] shadow-sm" 
                    : "bg-white text-primary-base border-outline-variant/30 hover:bg-gray-50"
                }`}
              >
                {num}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setCustomGoalOpen(true)}
            className="py-2 bg-white text-primary-base border border-outline-variant/30 hover:bg-gray-50 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            Custom
          </button>
        </div>

        {/* Custom goal form drawer representation */}
        {customGoalOpen && (
          <form onSubmit={handleCustomGoalSubmit} className="flex gap-2 items-center animate-fade-in p-2.5 bg-gray-50 rounded-xl">
            <input
              type="number"
              min="1"
              value={customGoalInput}
              onChange={(e) => setCustomGoalInput(e.target.value)}
              placeholder="Enter custom count target..."
              className="flex-grow text-xs rounded-lg border border-outline-variant/40 p-2 font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#012d1d] text-white font-sans text-xs font-extrabold uppercase tracking-wide rounded-lg border-none cursor-pointer hover:bg-primary-light active:scale-95"
            >
              Set
            </button>
          </form>
        )}
      </div>

      {/* Daily Spiritual Milestones & Accumulated Metrics */}
      <div className="bg-white border border-outline-variant/30 rounded-[28px] p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5 select-none">
          <Award className="w-4 h-4 text-gold-accent" /> Track Progress (प्रगति विवरण)
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#012d1d]/4 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-[38px] h-[38px] rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-800 shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">Total Counts</p>
              <p className="text-sm font-extrabold text-primary-base mt-2 font-mono">{totalAccumulated}</p>
            </div>
          </div>

          <div className="bg-[#012d1d]/4 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-[38px] h-[38px] rounded-full bg-amber-500/10 flex items-center justify-center text-amber-800 shrink-0">
              <Flame className="w-4 h-4 text-[#735c00]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">Daily Reps</p>
              <p className="text-sm font-extrabold text-primary-base mt-2 font-mono">
                {history[`${todayDateStr}_${selectedTasbih}`] || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Celebration Modal */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative overflow-hidden border border-gold-accent/40"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-yellow-400 to-emerald-500"></div>

              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600 animate-bounce">
                🎉
              </div>

              <div className="space-y-1">
                <h3 className="font-serif text-lg font-black text-primary-base">Mashallah! Goal Achieved</h3>
                <p className="text-xs text-on-surface-variant font-semibold">
                  You have completed your daily goal of <span className="font-bold text-emerald-800">{goal}</span> counts for <span className="font-bold text-[#735c00]">{selectedTasbih}</span>!
                </p>
              </div>

              {/* Quran citation backup */}
              <div className="text-[10.5px] italic text-[#735c00] font-sans bg-amber-50/70 p-3 rounded-2xl border border-amber-100 flex items-start gap-2 text-left">
                <BookOpen className="w-4 h-4 text-gold-accent shrink-0 mt-0.5" />
                <span>"Who have believed and whose hearts have assurance by the remembrance of Allah. Unquestionably, by the remembrance of Allah hearts find rest." (Ar-Ra'd: 28)</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCount(0);
                    localStorage.setItem(`deen_dhikr_${selectedTasbih}_${todayDateStr}`, "0");
                    triggerDebouncedFirebaseSave(0, goal, selectedTasbih);
                    setShowCelebration(false);
                  }}
                  className="flex-1 py-3 bg-[#012d1d] hover:bg-primary-light text-white font-sans text-xs font-extrabold uppercase tracking-wide rounded-full border-none cursor-pointer transition-transform active:scale-95 shadow-sm"
                >
                  Start New Loop
                </button>
                <button
                  type="button"
                  onClick={() => setShowCelebration(false)}
                  className="px-5 py-3 bg-gray-100 hover:bg-gray-250 text-primary-base font-sans text-xs font-bold rounded-full border-none cursor-pointer transition-transform active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
