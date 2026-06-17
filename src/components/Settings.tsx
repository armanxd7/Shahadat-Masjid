import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Clock, 
  Check, 
  Sliders, 
  Sparkles, 
  Info,
  CheckCircle2,
  Trash2,
  Undo2,
  Tv,
  Wifi,
  Smartphone
} from "lucide-react";
import { registerForPushNotifications, checkPushSupport } from "../utils/fcm";
import { auth } from "../firebase";

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  // Audible notifications mapping: if audible is true, mutedPrayers is false
  const [audiblePrayers, setAudiblePrayers] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("deen_muted_prayers");
    if (saved) {
      const muted = JSON.parse(saved);
      return {
        fajr: !muted.fajr,
        dhuhr: !muted.dhuhr,
        asr: !muted.asr,
        maghrib: !muted.maghrib,
        isha: !muted.isha
      };
    }
    // Default values matching PrayerTimes setup (Dhuhr muted as mock screen, others on)
    return {
      fajr: true,
      dhuhr: false,
      asr: true,
      maghrib: true,
      isha: true
    };
  });

  const [reminderOffsets, setReminderOffsets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("deen_reminder_offsets");
    return saved ? JSON.parse(saved) : {
      fajr: 10,
      dhuhr: 10,
      asr: 10,
      maghrib: 10,
      isha: 10
    };
  });

  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });

  const [fcmSupport, setFcmSupport] = useState<boolean | null>(null);
  const [fcmLoading, setFcmLoading] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(() => {
    return localStorage.getItem("deen_fcm_token");
  });
  const [customVapid, setCustomVapid] = useState("");
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    checkPushSupport().then(supported => {
      setFcmSupport(supported);
    });
  }, []);

  const handleRegisterFCM = async () => {
    const user = auth.currentUser;
    if (!user) {
      showToast("Please sign in to configure background push alerts. 👤");
      return;
    }
    
    // Resolve user's selected location from localStorage to save it
    const savedLocation = localStorage.getItem("deen_user_location") || "Kathmandu, Nepal";

    setFcmLoading(true);
    const result = await registerForPushNotifications(user.uid, savedLocation, customVapid || undefined);
    setFcmLoading(false);

    if (result.success && result.token) {
      setFcmToken(result.token);
      localStorage.setItem("deen_fcm_token", result.token);
      showToast("FCM Background Alarms successfully registered! 🔔");
    } else {
      showToast(result.error || "FCM subscription failed. ⚠️");
    }
  };

  const handleTestFCM = async () => {
    if (!fcmToken) {
      showToast("No active token. Please subscribe first! ⚠️");
      return;
    }

    setTestSending(true);
    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: fcmToken,
          title: "🕌 Shahadat Masjid Alarm Check",
          body: "Background push notifications are functional. Minimizing the browser works perfectly!",
          location: localStorage.getItem("deen_user_location") || "Kathmandu, Nepal"
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast("Test request dispatched! Minimize your browser immediately to check 📲");
      } else {
        showToast(data.error || "FCM Delivery service returned an error.");
      }
    } catch (err) {
      showToast("Network error trying to contact push gateway.");
    } finally {
      setTestSending(false);
    }
  };

  const handleDeregisterFCM = () => {
    localStorage.removeItem("deen_fcm_token");
    setFcmToken(null);
    showToast("Cleared active subscription token locally. 📳");
  };

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notifyToast, setNotifyToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotifyToast(msg);
    setTimeout(() => setNotifyToast(null), 2500);
  };

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      showToast("Notifications not supported in this browser 📺");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      if (perm === "granted") {
        showToast("System notification permission granted! 🔔");
      } else {
        showToast("System notification permission was denied ⚠️");
      }
    } catch (e) {
      showToast("Error requesting system permissions ⚠️");
    }
  };

  const pDetails = [
    { key: "fajr", label: "Fajr", desc: "Dawn Prayer (फज्र)", color: "amber" },
    { key: "dhuhr", label: "Dhuhr", desc: "Noon Prayer (जोहर)", color: "emerald" },
    { key: "asr", label: "Asr", desc: "Afternoon Prayer (असर)", color: "gold" },
    { key: "maghrib", label: "Maghrib", desc: "Sunset Prayer (मगरिब)", color: "red" },
    { key: "isha", label: "Isha", desc: "Night Prayer (इशा)", color: "indigo" }
  ];

  const handleToggleAudible = (key: string) => {
    setAudiblePrayers(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      showToast(`${pDetails.find(p => p.key === key)?.label} adhan sound ${updated[key] ? "enabled 🔊" : "silenced 🔇"}`);
      return updated;
    });
  };

  const handleOffsetChange = (key: string, value: number) => {
    const clamped = Math.max(0, Math.min(60, value));
    setReminderOffsets(prev => ({ ...prev, [key]: clamped }));
  };

  const handlePresetOffset = (key: string, mins: number) => {
    handleOffsetChange(key, mins);
    showToast(`${pDetails.find(p => p.key === key)?.label} reminder offset set to ${mins} mins`);
  };

  const handleSaveSettings = () => {
    // Convert back: mutedPrayers = !audiblePrayers
    const mutedPrayers = {
      fajr: !audiblePrayers.fajr,
      dhuhr: !audiblePrayers.dhuhr,
      asr: !audiblePrayers.asr,
      maghrib: !audiblePrayers.maghrib,
      isha: !audiblePrayers.isha
    };

    localStorage.setItem("deen_muted_prayers", JSON.stringify(mutedPrayers));
    localStorage.setItem("deen_reminder_offsets", JSON.stringify(reminderOffsets));

    // Dispatch global custom event so active PrayerTimes views re-read the values
    window.dispatchEvent(new Event("deen_settings_updated"));

    setSaveSuccess(true);
    showToast("Settings successfully saved and synchronized! 🕋");
    setTimeout(() => {
      setSaveSuccess(false);
      onBack();
    }, 1500);
  };

  const handleResetToDefault = () => {
    setAudiblePrayers({
      fajr: true,
      dhuhr: false,
      asr: true,
      maghrib: true,
      isha: true
    });
    setReminderOffsets({
      fajr: 10,
      dhuhr: 10,
      asr: 10,
      maghrib: 10,
      isha: 10
    });
    showToast("Reset to factory prayer settings ⚙️");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Feedback banner */}
      <AnimatePresence>
        {notifyToast && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-primary-base text-white px-5 py-3 rounded-full shadow-xl text-xs font-semibold z-50 flex items-center gap-2 border border-gold-accent"
          >
            <CheckCircle2 className="w-4 h-4 text-gold-accent" />
            <span>{notifyToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header card with Back button */}
      <div className="flex items-center justify-between pb-3 border-b border-[#012d1d]/10">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white hover:bg-surface-container border border-outline-variant/40 shadow-sm text-primary-base transition-all active:scale-95 cursor-pointer"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-left">
            <h2 className="font-serif text-lg font-bold text-primary-base">Prayer Alarms</h2>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider text-gold-accent">Sounds & Reminder Customization</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetToDefault}
          className="text-[9.5px] font-sans font-extrabold text-[#735c00] hover:text-primary-base bg-gold-accent/10 hover:bg-gold-accent/20 px-3 py-1.5 rounded-full border border-gold-accent/20 transition-all flex items-center gap-1 cursor-pointer"
          title="Reset settings to original Masjid defaults"
        >
          <Undo2 className="w-3 h-3" />
          <span>Defaults</span>
        </button>
      </div>

      {/* Browser Notification Status Helper block */}
      <div className="bg-white border border-outline-variant/30 rounded-[24px] p-4.5 shadow-sm space-y-3 relative overflow-hidden">
        <div className="absolute inset-0 islamic-pattern-bg opacity-[0.015] pointer-events-none"></div>
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="text-left space-y-1">
            <h4 className="font-serif text-xs font-bold text-primary-base flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${browserPermission === "granted" ? "bg-emerald-500" : "bg-amber-400"} animate-pulse`}></span>
              System Notification Permission
            </h4>
            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              Required for display of early prayer alerts on your phone or desktop lockscreen.
            </p>
          </div>

          {browserPermission !== "granted" ? (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="bg-primary-base hover:bg-[#023c28] text-white px-3.5 py-1.5 rounded-full text-[9.5px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 border-none cursor-pointer shrink-0"
            >
              Grant
            </button>
          ) : (
            <span className="text-[9.5px] font-sans font-black text-emerald-800 tracking-wider bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full uppercase shrink-0">
              Enabled
            </span>
          )}
        </div>
      </div>

      {/* FCM Background Push Messaging Card */}
      <div className="bg-white border border-outline-variant/30 rounded-[24px] p-5.5 shadow-sm space-y-4 text-left relative overflow-hidden">
        <div className="absolute inset-0 islamic-pattern-bg opacity-[0.015] pointer-events-none"></div>
        
        <div className="relative z-10 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-full bg-gold-accent/15 border border-gold-accent/30 flex items-center justify-center text-primary-base">
            <Smartphone className="w-4.5 h-4.5 text-gold-accent" />
          </div>
          <div className="space-y-1 overflow-hidden flex-1">
            <h4 className="font-serif text-sm font-black text-primary-base flex items-center gap-2">
              Background FCM Push Alerts
              {fcmToken ? (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" title="Active background listener"></span>
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block"></span>
              )}
            </h4>
            <p className="text-[10.5px] text-on-surface-variant/80 font-medium leading-relaxed">
              Integrates with <strong>Firebase Cloud Messaging (FCM)</strong> to support hardware/system push notifications that wake up and alert your device <strong>even if the browser is minimized, sleeping, or closed!</strong>
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-2 border-t border-outline-variant/15 space-y-3">
          <div className="flex items-center justify-between text-[10.5px] font-bold">
            <span className="text-primary-base">FCM Registration Status:</span>
            {fcmToken ? (
              <span className="text-emerald-700 tracking-wider font-extrabold uppercase bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-[9px]">
                Active Subscriber
              </span>
            ) : (
              <span className="text-amber-700 tracking-wider font-extrabold uppercase bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg text-[9px]">
                Not Subscribed
              </span>
            )}
          </div>

          {fcmToken && (
            <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100 font-mono text-[9px] text-gray-500 leading-normal max-w-full overflow-hidden">
              <span className="font-sans font-bold text-gray-700 block mb-1">Your FCM Hardware Token:</span>
              <div className="truncate text-gray-600 bg-white p-1.5 rounded border border-gray-100 select-all max-w-[280px]">
                {fcmToken}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {!fcmToken ? (
              <button
                type="button"
                onClick={handleRegisterFCM}
                disabled={fcmLoading}
                className="bg-primary-base hover:bg-[#023c28] text-white px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 border-none cursor-pointer flex items-center justify-center gap-1.5 shadow"
              >
                {fcmLoading ? "Subscribing..." : "Enable Push Alerts"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleTestFCM}
                  disabled={testSending}
                  className="bg-[#fed65b] hover:bg-[#eac03c] text-primary-base px-4 py-2.5 hover:scale-[1.01] active:scale-[0.99] rounded-full text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 border-none cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  {testSending ? "Sending Test..." : "Test Minimize Notification"}
                </button>
                
                <button
                  type="button"
                  onClick={handleDeregisterFCM}
                  className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-2 text-[10px] font-bold rounded-full transition-all border border-red-200/50 cursor-pointer"
                >
                  Clear Subscription
                </button>
              </>
            )}
          </div>

          <div className="p-3 bg-gold-accent/5 rounded-2xl border border-gold-accent/15 space-y-1 text-[9.5px] leading-relaxed text-[#735c00]">
            <span className="font-extrabold uppercase tracking-wider text-[#9f7d04] block mb-0.5">💡 How to test Background minimized state:</span>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click <strong>Enable Push Alerts</strong> above (and grant permission when prompted browser-side).</li>
              <li>Click <strong>Test Minimize Notification</strong> and immediately minimize or lock your phone/screen.</li>
              <li>Within 2-3 seconds, a real hardware push alert will fire, waking up your device even when sleeping.</li>
            </ol>
          </div>

          {/* Collapsible custom VAPID selector for power users in Firebase environments */}
          <div className="pt-2">
            <details className="text-[10px] text-on-surface-variant font-medium select-none cursor-pointer">
              <summary className="hover:text-primary-base font-bold text-gray-500">Advanced FCM Developer Configuration (VAPID)</summary>
              <div className="pt-2 text-[10px] text-gray-600 space-y-2 cursor-default">
                <p>If your project console uses a different Cloud Console pair, paste your <i>Web Push Certificate VAPID Key</i> here before subscribing:</p>
                <input
                  type="text"
                  placeholder="Paste Firebase VAPID key..."
                  value={customVapid}
                  onChange={(e) => setCustomVapid(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] font-mono outline-none focus:border-gold-accent"
                />
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Prayers Settings List */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5 px-1.5">
          <Sliders className="w-3.5 h-3.5 text-gold-accent" />
          <span>Configure Individual Prayers</span>
        </h3>

        {pDetails.map(({ key, label, desc, color }) => {
          const isAudible = audiblePrayers[key];
          const offset = reminderOffsets[key] || 0;

          // Define unique colors matching prayer styles
          const colorStyles = {
            amber: "bg-amber-500/10 text-amber-700 border-amber-500/20",
            emerald: "bg-emerald-500/10 text-emerald-800 border-emerald-500/20",
            gold: "bg-gold-accent/25 text-[#735c00] border-gold-accent/20",
            red: "bg-red-500/10 text-red-700 border-red-500/20",
            indigo: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20"
          }[color as "amber" | "emerald" | "gold" | "red" | "indigo"];

          return (
            <motion.div
              key={key}
              whileHover={{ y: -1 }}
              className="bg-white border border-outline-variant/30 rounded-[28px] p-5 shadow-sm space-y-4 text-left relative overflow-hidden"
            >
              <div className="absolute inset-0 islamic-pattern-bg opacity-[0.015] pointer-events-none"></div>
              
              {/* Top Row: Prayer name, badge and toggle lever */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif text-sm font-black border uppercase shadow-inner ${colorStyles}`}>
                    {label.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-black text-primary-base leading-none">{label}</h4>
                    <p className="text-[9.5px] text-on-surface-variant/70 font-semibold mt-1">{desc}</p>
                  </div>
                </div>

                {/* Switch lever */}
                <button
                  type="button"
                  onClick={() => handleToggleAudible(key)}
                  className={`w-12 h-6.5 rounded-full p-1 transition-all border-none cursor-pointer relative flex items-center ${
                    isAudible ? "bg-[#012d1d]" : "bg-gray-200"
                  }`}
                  aria-label={`Toggle audible alarm for ${label}`}
                >
                  <motion.div
                    layout
                    className={`w-4.5 h-4.5 rounded-full shadow-md flex items-center justify-center ${
                      isAudible ? "bg-gold-accent text-primary-base" : "bg-white text-gray-400"
                    }`}
                    style={{ marginLeft: isAudible ? "auto" : "0px" }}
                  >
                    {isAudible ? (
                      <Volume2 className="w-2.5 h-2.5" />
                    ) : (
                      <VolumeX className="w-2.5 h-2.5" />
                    )}
                  </motion.div>
                </button>
              </div>

              {/* Offset adjustment */}
              <div className="relative z-10 pt-3 border-t border-outline-variant/15 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10.5px] text-primary-base">
                    <Clock className="w-3.5 h-3.5 text-gold-accent" />
                    <span className="font-bold">Early Reminder Alert</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOffsetChange(key, offset - 5)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 border border-outline-variant/30 hover:bg-gray-100 font-sans font-black text-[15px] cursor-pointer"
                      disabled={offset <= 0}
                    >
                      -
                    </button>
                    <span className="px-3 py-1 font-mono text-[11px] font-extrabold text-primary-base bg-gray-50 rounded-lg border border-outline-variant/20 inline-block min-w-14 text-center">
                      {offset === 0 ? "None" : `${offset}m`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOffsetChange(key, offset + 5)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 border border-outline-variant/30 hover:bg-gray-100 font-sans font-black text-[15px] cursor-pointer"
                      disabled={offset >= 60}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Quick Presets row */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[8.5px] font-black uppercase text-on-surface-variant/50 tracking-wider">Presets:</span>
                  {[0, 5, 10, 15, 30].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handlePresetOffset(key, mins)}
                      className={`px-2.5 py-1 rounded bg-cream-bg border text-[9px] font-extrabold transition-all cursor-pointer ${
                        offset === mins
                          ? "border-[#012d1d] text-[#012d1d] bg-[#012d1d]/5 font-black shadow-sm"
                          : "border-outline-variant/30 text-on-surface-variant hover:text-primary-base hover:border-gold-accent/40"
                      }`}
                    >
                      {mins === 0 ? "Off" : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Info Warning Tip */}
      <div className="bg-[#012d1d]/5 border border-[#012d1d]/10 rounded-[24px] p-4 flex gap-2.5 text-left text-[10px] leading-relaxed text-emerald-950 font-medium">
        <Info className="w-4 h-4 text-gold-accent shrink-0 mt-0.5" />
        <div>
          <p className="font-extrabold text-emerald-900 uppercase tracking-wide mb-0.5">Automated Sound Triggers</p>
          <p>
            When audible alarms are enabled, the adhan track plays fully at the exact minute of salah in this website. Muting will prevent browser audio play while remaining offsets will continue sending standard early notification text popups securely.
          </p>
        </div>
      </div>

      {/* Save Settings Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saveSuccess}
          className={`w-full py-4 rounded-full font-sans font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all border-none ${
            saveSuccess 
              ? "bg-[#012d1d] text-[#fed65b]" 
              : "bg-gradient-to-r from-gold-accent to-[#c29d2b] hover:from-[#c29d2b] hover:to-gold-accent text-primary-base active:scale-[0.98] cursor-pointer"
          }`}
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4 animate-bounce" />
              <span>SAVED & APPLIED</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Save & Apply Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
