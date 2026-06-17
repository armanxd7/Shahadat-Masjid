import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { loginWithGoogle } from "../firebase";
// @ts-ignore
import deenLogo from "../assets/images/deen_circle_logo_1779544307640.png";
import { ChevronLeft, Sparkles, ShieldCheck, Heart, Database, Compass, ArrowRight } from "lucide-react";

interface SplashProps {
  onEnterApp: () => void;
  onLoginSuccess?: (name: string) => void;
}

export default function Splash({ onEnterApp, onLoginSuccess }: SplashProps) {
  const [step, setStep] = useState<"splash" | "welcome" | "auth">("splash");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"signup" | "signin">("signup");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    // Elegant automatic 2.8s splash timer
    const timer = setTimeout(() => {
      setStep("welcome");
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const handleGoogleSignIn = async (mode: "signup" | "signin") => {
    setLoading(true);
    setErrorMsg("");
    try {
      const user = await loginWithGoogle();
      if (user) {
        const displayName = user.displayName || "Shahadat Masjid";
        localStorage.setItem("deen_username", displayName);
        if (onLoginSuccess) {
          onLoginSuccess(displayName);
        }
        onEnterApp();
      }
    } catch (err: any) {
      console.error(mode + " Google Signin Error: ", err);
      const isIframeIssue = err?.message?.includes("popup-closed-by-user") || 
                            err?.message?.includes("assertion failed") || 
                            err?.code?.includes("popup-closed-by-user") ||
                            err?.code?.includes("assertion-failed");
      if (isIframeIssue) {
        setErrorMsg("Google Sign-In is blocked in this preview iframe. Please click the 'Open in sub-window / Open in New Tab' icon at the top right of the live preview panel and try again! (सुरक्षाको कारण प्रिभ्यू फ्रेममा साइन-इन ब्लक गरिएको छ। कृपया माथिल्लो दायाँ एरो थिची नयाँ ट्याबमा खोल्नुहोस्।)");
      } else {
        setErrorMsg("Failed to connect with Google. Please check your network and try again. (गुगल साइन-इन असफल भयो। कृपया फेरि प्रयास गर्नुहोला।)");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[92vh] flex flex-col justify-between text-on-surface overflow-hidden pt-10 pb-8 px-5 bg-cream-bg select-none">
      {/* Background Islamic Pattern Overlay */}
      <div className="absolute inset-0 islamic-pattern-bg opacity-[0.05] pointer-events-none z-0"></div>

      {/* Decorative Hanging Lanterns with Sway Animation */}
      <div className="absolute inset-x-0 top-0 flex justify-between px-4 pointer-events-none z-15">
        <motion.div
          animate={{ rotate: [2.5, -2.5, 2.5] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className="origin-top"
        >
          <svg width="45" height="110" viewBox="0 0 40 80">
            <line x1="20" y1="0" x2="20" y2="28" stroke="#d4af37" strokeWidth="1.2" />
            <path d="M12 28 L20 20 L28 28 Z" fill="#d4af37" />
            <path d="M10 28 L7 52 L20 66 L33 52 L30 28 Z" fill="none" stroke="#d4af37" strokeWidth="1.5" />
            <path d="M12 30 L9 50 L20 62 L31 50 L28 30 Z" fill="#d4af37" fillOpacity="0.25" />
            <circle cx="20" cy="44" r="5" fill="#fdf8f1" className="animate-pulse" />
            <circle cx="20" cy="44" r="3.5" fill="#d4af37" />
            <line x1="20" y1="66" x2="20" y2="72" stroke="#d4af37" strokeWidth="1.2" />
            <circle cx="20" cy="75" r="2.5" fill="#d4af37" />
          </svg>
        </motion.div>

        <motion.div
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ repeat: Infinity, duration: 5.2, ease: "easeInOut" }}
          className="origin-top"
        >
          <svg width="45" height="110" viewBox="0 0 40 80">
            <line x1="20" y1="0" x2="20" y2="35" stroke="#d4af37" strokeWidth="1.2" />
            <path d="M13 35 L20 28 L27 35 Z" fill="#d4af37" />
            <path d="M12 35 L9 55 L20 67 L31 55 L28 35 Z" fill="none" stroke="#d4af37" strokeWidth="1.5" />
            <path d="M14 37 L11 53 L20 63 L29 53 L26 37 Z" fill="#d4af37" fillOpacity="0.22" />
            <circle cx="20" cy="48" r="4.5" fill="#fdf8f1" className="animate-pulse" />
            <circle cx="20" cy="48" r="3" fill="#d4af37" />
            <line x1="20" y1="67" x2="20" y2="73" stroke="#d4af37" strokeWidth="1.2" />
            <circle cx="20" cy="76" r="2.5" fill="#d4af37" />
          </svg>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {step === "splash" ? (
          /* ================= STEP 0: MAJESTIC AUTOMATIC SPLASH SCREEN ================= */
          <motion.div
            key="splash_loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.5 }}
            className="flex-grow flex flex-col justify-center items-center z-10 w-full px-6 py-10"
          >
            {/* Pulsing Glowing Ring Frame */}
            <div className="relative my-6 select-none">
              <div className="absolute inset-0 bg-gold-accent/20 blur-3xl rounded-full transform scale-125 animate-pulse"></div>
              <div className="absolute -inset-3.5 rounded-full border border-dashed border-gold-accent/25 animate-[spin_40s_linear_infinite]"></div>
              
              <div className="relative w-36 h-36 rounded-full border-2 border-gold-accent bg-white/70 backdrop-blur-md flex items-center justify-center p-2.5 shadow-2xl">
                {!imgError ? (
                  <img 
                    alt="Shahadat Masjid Logo" 
                    className="w-full h-full object-contain rounded-full animate-pulse" 
                    src={deenLogo}
                    referrerPolicy="no-referrer"
                    onError={() => {
                      setImgError(true);
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <Compass className="w-12 h-12 text-primary-base animate-pulse mb-1.5" />
                    <span className="text-xs font-serif font-black text-white bg-primary-base px-2.5 py-0.5 rounded-full tracking-wider border border-gold-accent/40 shadow-inner">DEEN</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center space-y-1.5 mt-4">
              <span className="text-[10px] tracking-[0.25em] font-extrabold text-gold-accent uppercase justify-center flex items-center gap-1.5 selection:bg-gold-accent/20">
                <Sparkles className="w-3.5 h-3.5 text-gold-accent animate-spin-slow" />
                Spiritual Path & Tracker (आध्यात्मिक साथी)
              </span>
              <h1 className="font-serif text-3xl font-black text-primary-base tracking-tight uppercase">
                Shahadat Masjid
              </h1>
            </div>

            {/* Smooth linear gold loader simulation */}
            <div className="w-56 h-[3px] bg-primary-base/10 rounded-full overflow-hidden mt-8 mb-5 relative">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.3, ease: "easeInOut" }}
                className="h-full bg-gold-accent rounded-full"
              />
            </div>

            {/* Inspiring Bilingual Verse */}
            <div className="max-w-xs text-center space-y-2 mt-4 px-2">
              <p className="font-sans text-[11px] font-semibold text-primary-base/80 leading-relaxed italic">
                "Indeed, the patience has its beautiful reward."
              </p>
              <p className="font-sans text-[10.5px] font-semibold text-primary-base/70 leading-relaxed border-t border-gold-accent/10 pt-1.5">
                "निश्चय नै, धैर्यताको फल सधैं सुन्दर हुन्छ।"
              </p>
            </div>
          </motion.div>
        ) : step === "welcome" ? (
          /* ================= STEP 1: GORGEOUS BILINGUAL INTRO ================= */
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, x: -60 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="flex-grow flex flex-col justify-between items-center z-10 w-full"
          >
            {/* Bismillah Calligraphy block */}
            <div className="text-center mt-6">
              <span className="text-[10px] tracking-[0.22em] font-extrabold text-gold-accent uppercase justify-center flex items-center gap-1.5 mb-1.5 selection:bg-gold-accent/20">
                <Sparkles className="w-3.5 h-3.5 text-gold-accent animate-spin-slow" />
                In the Name of Allah (अल्लाहको नाममा)
              </span>
              <div 
                className="font-arabic text-3.5xl md:text-4.5xl text-primary-base font-medium select-none py-1 filter drop-shadow-[0_1.5px_3.5px_rgba(212,175,55,0.35)]"
                style={{ direction: 'rtl' }}
              >
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>
            </div>

            {/* Glowing Center Logo Ring Frame */}
            <div className="relative my-7 select-none">
              <div className="absolute inset-0 bg-gold-accent/18 blur-3xl rounded-full transform scale-110 animate-pulse"></div>
              <div className="absolute -inset-2.5 rounded-full border-2 border-dashed border-gold-accent/30 animate-[spin_32s_linear_infinite]"></div>
              <div className="absolute -inset-1 rounded-full border border-gold-accent/40 animate-[spin_18s_linear_infinite_reverse]"></div>
              
              <div className="relative w-44 h-44 md:w-48 md:h-48 rounded-full border-2 border-gold-accent shadow-2xl overflow-hidden bg-white/70 backdrop-blur-md flex items-center justify-center p-2.5 transition-transform hover:scale-105 duration-500">
                {!imgError ? (
                  <img 
                    alt="Shahadat Masjid Logo" 
                    className="w-full h-full object-contain rounded-full" 
                    src={deenLogo}
                    referrerPolicy="no-referrer"
                    onError={() => {
                      setImgError(true);
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <Compass className="w-14 h-14 text-primary-base animate-pulse mb-1.5" />
                    <span className="text-sm font-serif font-black text-white bg-primary-base px-3 py-1 rounded-full tracking-widest border border-gold-accent/40 shadow-inner align-middle">DEEN</span>
                  </div>
                )}
              </div>
            </div>

            {/* Inspiring introduction & branding card */}
            <div className="w-full max-w-sm text-center px-4 space-y-4">
              <div className="space-y-1">
                <h1 className="font-serif text-3.5xl font-black text-primary-base tracking-tight uppercase">
                  Shahadat Masjid
                </h1>
                <p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.25em] text-primary-light">
                  Spiritual Path & Tracker (आध्यात्मिक साथी)
                </p>
              </div>

              <div className="bg-white/60 backdrop-blur-md border border-gold-accent/15 rounded-2.5xl p-4 shadow-sm space-y-2">
                <p className="font-sans text-[11.5px] font-semibold text-primary-base/85 leading-relaxed italic">
                  &ldquo;Verily, in the remembrance of Allah do hearts find rest.&rdquo;
                </p>
                <p className="font-sans text-[11px] font-semibold text-primary-base/75 leading-relaxed border-t border-gold-accent/10 pt-1.5">
                  &ldquo;निश्चय नै, अल्लाहको स्मरणमा नै मनले शान्ति पाउँछ।&rdquo;
                </p>
                <p className="font-sans text-[8.5px] uppercase font-extrabold text-gold-accent tracking-widest mt-1">
                  Surah Ar-Ra’d (13:28) • सुराह अर-राअद
                </p>
              </div>

              {/* Action Buttons Stack: Gorgeous Entry Options */}
              <div className="space-y-2.5 w-full pt-1">
                <button
                  type="button"
                  onClick={() => setStep("auth")}
                  className="w-full py-4 bg-primary-base hover:bg-primary-light text-white rounded-2xl font-sans text-xs font-extrabold uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  <span>Bismillah • Choose Entrance (प्रवेश गर्नुहोस्)</span>
                  <Compass className="w-4 h-4 text-gold-accent animate-spin-slow" />
                </button>

                <button
                  type="button"
                  onClick={onEnterApp}
                  className="w-full py-3.5 bg-white/40 hover:bg-white/70 text-primary-base rounded-2xl font-sans text-[10.5px] font-extrabold uppercase tracking-widest border border-primary-base/15 shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 animate-pulse"
                >
                  <span>Continue as Guest (अतिथि मोडमा अगाडि बढ्नुहोस्)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-primary-base/80" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ================= STEP 2: Cloud Sync Options (Registration/Sign In) ================= */
          <motion.div
            key="auth"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex-grow flex flex-col justify-between items-center z-10 w-full"
          >
            {/* Mini Branding Header with Back trigger */}
            <div className="w-full flex items-center justify-between mt-1">
              <button
                type="button"
                onClick={() => setStep("welcome")}
                className="flex items-center gap-1.5 text-primary-base hover:text-gold-accent font-extrabold text-xs py-1.5 px-3 rounded-xl transition-all bg-white/40 border border-primary-base/5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Go Back (फिर्ता)</span>
              </button>
              <div className="font-arabic text-gold-accent font-bold text-lg select-none">
                أَهْلًا وَسَهْلًا
              </div>
            </div>

            {/* Immersive Auth card container */}
            <div className="w-full max-w-sm space-y-5 my-auto pt-4">
              <div className="text-center space-y-1.5 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full border border-gold-accent/40 overflow-hidden bg-white shadow-md flex-shrink-0 mb-1 flex items-center justify-center p-1">
                  {!imgError ? (
                    <img 
                      src={deenLogo} 
                      alt="Shahadat Masjid Logo" 
                      className="w-full h-full object-contain rounded-full"
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <Compass className="w-8 h-8 text-primary-base animate-spin-slow" />
                  )}
                </div>
                <h2 className="font-serif text-2.5xl font-black text-primary-base tracking-tight uppercase">
                  Cloud Sync
                </h2>
                <div className="space-y-1">
                  <p className="text-[12px] font-bold text-primary-base/90">
                    Spiritual Progression Cloud Record
                  </p>
                  <p className="text-[11px] font-semibold text-on-surface-variant/75 leading-relaxed max-w-[300px] mx-auto">
                    Protect streaks, reflection logs, and prayer logs secure in the cloud. <br />
                    (तपाईंको दैनिक बानीको शृंखला, जर्नल र प्रार्थना प्रगतिलाई क्लाउडमा सुरक्षित राख्नुहोस्।)
                  </p>
                </div>
              </div>

              {/* Tab Selector for Tabbed Onboard Experience */}
              <div className="p-1 bg-primary-base/5 border border-primary-light/10 rounded-2xl flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => { setActiveTab("signup"); setErrorMsg(""); }}
                  className={`w-1/2 py-2.5 rounded-xl font-sans text-[10.5px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === "signup"
                      ? "bg-primary-base text-white shadow-md"
                      : "text-primary-[#012d1d]/80 hover:text-primary-base hover:bg-primary-base/5"
                  }`}
                >
                  Sign Up (नयाँ प्रयोगकर्ता)
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("signin"); setErrorMsg(""); }}
                  className={`w-1/2 py-2.5 rounded-xl font-sans text-[10.5px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === "signin"
                      ? "bg-primary-base text-white shadow-md"
                      : "text-[#012d1d]/80 hover:text-primary-base hover:bg-primary-base/5"
                  }`}
                >
                  Sign In (पुरानो खाता)
                </button>
              </div>

              {/* Dynamic Interactive Cards depending on active tab selection */}
              <AnimatePresence mode="wait">
                {activeTab === "signup" ? (
                  <motion.div
                    key="tab-signup"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white/80 border border-gold-accent/20 rounded-2.5xl p-5 shadow-sm space-y-4 text-center"
                  >
                    <div className="flex justify-center">
                      <div className="w-9 h-9 bg-gold-accent/10 rounded-full flex items-center justify-center text-gold-accent">
                        <Heart className="w-4.5 h-4.5" fill="currentColor" fillOpacity="0.1" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-primary-base uppercase tracking-wider">
                        Create Your Spiritual Portfolio
                      </h4>
                      <p className="text-[11px] font-semibold text-on-surface-variant/70 leading-relaxed">
                        Start fresh with automatic Firestore synchronization. Instantly log your daily habits, and lock in your progression records safely.
                      </p>
                      <p className="text-[10px] font-bold text-emerald-850 bg-emerald-50/70 py-0.5 rounded-full max-w-[190px] mx-auto border border-emerald-100/60 font-sans">
                        निःशुल्क क्लाउड खाता सिर्जना
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGoogleSignIn("signup")}
                      disabled={loading}
                      className="w-full py-4 bg-white hover:bg-primary-base/5 text-primary-base rounded-2xl font-sans text-xs font-extrabold uppercase tracking-wider shadow border-2 border-gold-accent/45 hover:border-gold-accent transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-primary-base border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4.5 h-4.5 flex-shrink-0" viewBox="0 0 24 24" referrerPolicy="no-referrer">
                          <path fill="#EA4335" d="M12 5.04c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.5 15 1 12 1 7.3 1 3.4 3.7 1.5 7.7l3.9 3c.9-2.7 3.4-4.66 6.6-4.66z" />
                          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.7z" />
                          <path fill="#FBBC05" d="M5.4 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.5 6.3C.5 8.2 0 10.4 0 12.7s.5 4.5 1.5 6.4l3.9-4.4z" />
                          <path fill="#34A853" d="M12 23c3.2 0 6-1 8-2.9l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.7-2-6.6-4.7l-3.9 3c1.9 4 5.8 6.4 10.5 6.4z" />
                        </svg>
                      )}
                      <span>{loading ? "Registering on Cloud..." : "Sign Up with Google"}</span>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="tab-signin"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white/80 border border-gold-accent/20 rounded-2.5xl p-5 shadow-sm space-y-4 text-center"
                  >
                    <div className="flex justify-center">
                      <div className="w-9 h-9 bg-gold-accent/10 rounded-full flex items-center justify-center text-gold-accent">
                        <Database className="w-4.5 h-4.5" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-primary-base uppercase tracking-wider">
                        Restore Companion Profile
                      </h4>
                      <p className="text-[11px] font-semibold text-on-surface-variant/70 leading-relaxed">
                        Instantly retrieve your saved prayers completed count, custom planner goals, coins, history entries, and active habit tracker logs on this device.
                      </p>
                      <p className="text-[10px] font-bold text-amber-850 bg-amber-50/75 py-0.5 rounded-full max-w-[190px] mx-auto border border-amber-100/60 font-sans">
                        डाटा सुरक्षित फिर्ता पाउनुहोस्
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGoogleSignIn("signin")}
                      disabled={loading}
                      className="w-full py-4 bg-primary-base hover:bg-primary-light text-white rounded-2xl font-sans text-xs font-extrabold uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4.5 h-4.5 flex-shrink-0" viewBox="0 0 24 24" referrerPolicy="no-referrer">
                          <path fill="#EA4335" d="M12 5.04c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.5 15 1 12 1 7.3 1 3.4 3.7 1.5 7.7l3.9 3c.9-2.7 3.4-4.66 6.6-4.66z" />
                          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.7z" />
                          <path fill="#FBBC05" d="M5.4 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.5 6.3C.5 8.2 0 10.4 0 12.7s.5 4.5 1.5 6.4l3.9-4.4z" />
                          <path fill="#34A853" d="M12 23c3.2 0 6-1 8-2.9l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.7-2-6.6-4.7l-3.9 3c1.9 4 5.8 6.4 10.5 6.4z" />
                        </svg>
                      )}
                      <span>{loading ? "Verifying Credentials..." : "Sign In with Google"}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Guest Enter Shortcut directly under the card */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={onEnterApp}
                  className="w-full py-3.5 bg-white/40 hover:bg-white/70 text-primary-base rounded-2xl font-sans text-xs font-extrabold uppercase tracking-widest transition-all border border-dashed border-primary-base/20 hover:border-primary-base/45 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Use Offline As Guest (बिना साइन-इन नै सुरु गर्नुहोस्)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {errorMsg && (
                <p className="text-[10px] text-red-600 font-extrabold text-center animate-bounce-slow bg-red-50 p-2 rounded-xl border border-red-100">{errorMsg}</p>
              )}
            </div>

            <div className="flex items-center gap-1.5 justify-center py-2 text-on-surface-variant/60">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-[9.5px] uppercase font-black tracking-widest">Secured by Google Authentication</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Luxury Majestic Mosque Silhouette Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.28 }}
        transition={{ delay: 0.4, duration: 1.2 }}
        className="absolute bottom-0 left-0 w-full h-1/3 z-0 pointer-events-none"
      >
        <div className="relative w-full h-full">
          <img
            className="w-full h-full object-cover object-bottom mix-blend-luminosity opacity-45 select-none pointer-events-none"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCl1b5tUpcJ6pJzBFZU3wvFtIq69b3CL3eANJ8JcTkjAyh_orBrSBUJD4Y3atS4SMbu1K6iypKbCEk7ZXGdiZnEwJrtcdLqA3uCQWIh6HXkpdengHoynXfCNg2PztZ9UN7l9EgXLQvzQTBomP1tYac1c276xwbYtktMF4za_Wr0FgkWBKuebD5v152EudXpYhDhwSOQzSACztHYSsrbbiYiQXjKLmDPDX1qOvmguxO8r6THxGXojZuYk-pHVVN5pt5DdzJH1lbKNg"
            alt="Mosque Gold Detail Silhouette"
          />
          {/* Golden Ambient Glow overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-gold-accent/12 to-transparent"></div>
        </div>
      </motion.div>
    </div>
  );
}
