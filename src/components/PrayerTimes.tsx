import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, 
  BellOff, 
  MapPin, 
  Compass, 
  Music, 
  ChevronDown, 
  AlertCircle,
  Play,
  Volume2,
  VolumeX,
  Check,
  Pause,
  Info,
  Clock,
  Settings
} from "lucide-react";
import { auth } from "../firebase";

interface PrayerTimesSet {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  distance: string;
  angle: string;
  compassRotation: number;
}

const LOCATION_DATA: Record<string, PrayerTimesSet> = {
  "Cape Town, South Africa": {
    fajr: "04:36 AM",
    dhuhr: "12:58 PM",
    asr: "04:38 PM",
    maghrib: "06:45 PM",
    isha: "08:05 PM",
    distance: "6,432",
    angle: "56.4° NE",
    compassRotation: 56.4
  },
  "Mecca, Saudi Arabia": {
    fajr: "04:52 AM",
    dhuhr: "12:22 PM",
    asr: "03:41 PM",
    maghrib: "07:05 PM",
    isha: "08:35 PM",
    distance: "0",
    angle: "0.0° Center",
    compassRotation: 0
  },
  "Medina, Saudi Arabia": {
    fajr: "04:48 AM",
    dhuhr: "12:24 PM",
    asr: "03:48 PM",
    maghrib: "07:08 PM",
    isha: "08:38 PM",
    distance: "340",
    angle: "180.2° S",
    compassRotation: 180.2
  },
  "London, United Kingdom": {
    fajr: "03:12 AM",
    dhuhr: "01:05 PM",
    asr: "05:22 PM",
    maghrib: "09:10 PM",
    isha: "10:45 PM",
    distance: "4,795",
    angle: "118.2° SE",
    compassRotation: 118.2
  },
  "Cairo, Egypt": {
    fajr: "04:02 AM",
    dhuhr: "11:58 AM",
    asr: "03:32 PM",
    maghrib: "06:56 PM",
    isha: "08:24 PM",
    distance: "1,304",
    angle: "139.5° SE",
    compassRotation: 139.5
  },
  "New York, United States": {
    fajr: "04:15 AM",
    dhuhr: "12:55 PM",
    asr: "04:50 PM",
    maghrib: "08:12 PM",
    isha: "09:48 PM",
    distance: "10,240",
    angle: "58.1° NE",
    compassRotation: 58.1
  },
  "Kathmandu, Nepal": {
    fajr: "04:02 AM",
    dhuhr: "12:10 PM",
    asr: "03:35 PM",
    maghrib: "06:52 PM",
    isha: "08:18 PM",
    distance: "4,640",
    angle: "261.2° W",
    compassRotation: 261.2
  },
  "New Delhi, India": {
    fajr: "04:12 AM",
    dhuhr: "12:21 PM",
    asr: "03:48 PM",
    maghrib: "07:08 PM",
    isha: "08:34 PM",
    distance: "3,820",
    angle: "263.1° W",
    compassRotation: 263.1
  }
};

const MUEZZIN_CHOICES = [
  { id: "makkah", name: "Sheikh Ali Ahmed Mulla (Makkah)", duration: "4:00", url: "https://www.islamcan.com/audio/adhan/azan2.mp3" },
  { id: "madinah", name: "Sheikh Abdul Majeed (Madinah)", duration: "4:03", url: "https://www.islamcan.com/audio/adhan/azan3.mp3" },
  { id: "egypt", name: "Famous Muezzin (Cairo, Egypt)", duration: "3:30", url: "https://www.islamcan.com/audio/adhan/azan16.mp3" },
  { id: "yusuf", name: "Yusuf Islam (Aesthetic Clear)", duration: "3:58", url: "https://www.islamcan.com/audio/adhan/azan1.mp3" }
];

const BACKUP_URLS: Record<string, string> = {
  "makkah": "https://archive.org/download/Adhan_Athan_Azaan/Makkah_128kb.mp3",
  "madinah": "https://archive.org/download/Adhan-from-Madinah/Adhan-from-Madinah_64kb.mp3",
  "egypt": "https://archive.org/download/Adhan_Athan_Azaan/Adhan_80kb.mp3",
  "yusuf": "https://archive.org/download/Adhan-from-Madinah/Adhan-from-Madinah_64kb.mp3"
};

interface PrayerTimesProps {
  onNavigate?: (screen: any) => void;
}

export default function PrayerTimes({ onNavigate }: PrayerTimesProps) {
  const [selectedLocation, setSelectedLocation] = useState(() => {
    const saved = localStorage.getItem("deen_selected_location");
    return saved && (LOCATION_DATA[saved] || saved === "Automatic (GPS Location)") ? saved : "Cape Town, South Africa";
  });
  const [locationOpen, setLocationOpen] = useState(false);
  const [mutedPrayers, setMutedPrayers] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("deen_muted_prayers");
    return saved ? JSON.parse(saved) : {
      fajr: false,
      dhuhr: true, // as mock image: Dhuhr has notify disabled
      asr: false,
      maghrib: false,
      isha: false
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

  useEffect(() => {
    const handleSettingsUpdate = () => {
      const savedMuted = localStorage.getItem("deen_muted_prayers");
      if (savedMuted) {
        setMutedPrayers(JSON.parse(savedMuted));
      }
      const savedOffsets = localStorage.getItem("deen_reminder_offsets");
      if (savedOffsets) {
        setReminderOffsets(JSON.parse(savedOffsets));
      }
    };
    window.addEventListener("deen_settings_updated", handleSettingsUpdate);
    return () => window.removeEventListener("deen_settings_updated", handleSettingsUpdate);
  }, []);
  const [needleRotation, setNeedleRotation] = useState(54.3);
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const startAngleRef = useRef(0);
  const startHeadingRef = useRef(0);

  // Handle device orientation sensors on supported physical hardware
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // @ts-ignore
      let heading = e.webkitCompassHeading;
      if (heading === undefined && e.alpha !== null) {
        heading = (360 - e.alpha) % 360;
      }
      if (heading !== undefined && heading !== null) {
        setDeviceHeading(Math.round(heading));
      }
    };

    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  const handleCompassStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsRotating(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dialElement = document.getElementById("qiblaCompassContainer");
    if (dialElement) {
      const rect = dialElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angleRad = Math.atan2(clientY - centerY, clientX - centerX);
      startAngleRef.current = angleRad * 180 / Math.PI;
      startHeadingRef.current = deviceHeading;
    }
  };

  useEffect(() => {
    const handleCompassMove = (e: MouseEvent | TouchEvent) => {
      if (!isRotating) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const dialElement = document.getElementById("qiblaCompassContainer");
      if (dialElement) {
        const rect = dialElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angleRad = Math.atan2(clientY - centerY, clientX - centerX);
        const currentAngle = angleRad * 180 / Math.PI;
        const deltaAngle = currentAngle - startAngleRef.current;
        
        // Simulates turning the compass housing
        const newHeading = (startHeadingRef.current - deltaAngle + 720) % 360;
        setDeviceHeading(Math.round(newHeading));
      }
    };

    const handleCompassEnd = () => {
      setIsRotating(false);
    };

    if (isRotating) {
      window.addEventListener("mousemove", handleCompassMove);
      window.addEventListener("mouseup", handleCompassEnd);
      window.addEventListener("touchmove", handleCompassMove);
      window.addEventListener("touchend", handleCompassEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleCompassMove);
      window.removeEventListener("mouseup", handleCompassEnd);
      window.removeEventListener("touchmove", handleCompassMove);
      window.removeEventListener("touchend", handleCompassEnd);
    };
  }, [isRotating]);
  
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [customPrayerTimes, setCustomPrayerTimes] = useState<PrayerTimesSet | null>(() => {
    const saved = localStorage.getItem("deen_custom_prayer_times");
    return saved ? JSON.parse(saved) : null;
  });
  const [apiMethod, setApiMethod] = useState(() => localStorage.getItem("deen_api_method") || "2"); // 2 = ISNA
  const [apiSchool, setApiSchool] = useState(() => localStorage.getItem("deen_api_school") || "0"); // 0 = Shafi'i
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem("deen_islamic_api_key") || "");
  const [adminPrayerTimes, setAdminPrayerTimes] = useState<Record<string, any>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
    });
    return () => unsubscribe();
  }, []);

  const fetchPublicConfig = async () => {
    try {
      const res = await fetch("/api/public/config");
      if (res.ok) {
        const data = await res.json();
        if (data.prayerTimes) {
          setAdminPrayerTimes(data.prayerTimes);
        }
      }
    } catch (err) {
      console.error("Error loading overrides in prayer times view:", err);
    }
  };

  useEffect(() => {
    fetchPublicConfig();
    window.addEventListener("deen_config_updated", fetchPublicConfig);
    return () => window.removeEventListener("deen_config_updated", fetchPublicConfig);
  }, []);

  const getActivePrayerTimes = (): PrayerTimesSet => {
    if (selectedLocation !== "Automatic (GPS Location)" && adminPrayerTimes[selectedLocation]) {
      return adminPrayerTimes[selectedLocation];
    }
    if (selectedLocation === "Automatic (GPS Location)") {
      if (customPrayerTimes) {
        return customPrayerTimes;
      }
      return {
        fajr: "--:--",
        dhuhr: "--:--",
        asr: "--:--",
        maghrib: "--:--",
        isha: "--:--",
        distance: "--",
        angle: "--",
        compassRotation: 0,
      };
    }
    return LOCATION_DATA[selectedLocation] || LOCATION_DATA["Cape Town, South Africa"];
  };

  const activeSet = getActivePrayerTimes();
  const { fajr, dhuhr, asr, maghrib, isha, distance, angle, compassRotation } = activeSet;

  // Sync virtual compass needle rotation when compassRotation or deviceHeading changes
  useEffect(() => {
    const baseAngle = typeof compassRotation === "number" 
      ? compassRotation 
      : (compassRotation ? parseFloat(String(compassRotation)) : 0);
    const finalNeedle = (baseAngle - deviceHeading + 360) % 360;
    setNeedleRotation(isNaN(finalNeedle) ? 0 : finalNeedle);
  }, [compassRotation, deviceHeading]);

  const [currentTimeState, setCurrentTimeState] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeState(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getCardinalDirection = (deg: number): string => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(((deg % 360) / 45)) % 8;
    return directions[index];
  };

  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr || timeStr.includes("--") || timeStr === "--:--") return 0;
    const clean = timeStr.trim().toUpperCase();
    const isPM = clean.includes("PM");
    const isAM = clean.includes("AM");
    const timeOnly = clean.replace("AM", "").replace("PM", "").trim();
    const parts = timeOnly.split(":");
    if (parts.length < 2) return 0;
    let hrs = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    if (isNaN(hrs) || isNaN(mins)) return 0;
    if (isPM && hrs < 12) hrs += 12;
    if (isAM && hrs === 12) hrs = 0;
    return hrs * 60 + mins;
  };

  const getActivePrayerKey = (): string => {
    const nowHrs = currentTimeState.getHours();
    const nowMins = currentTimeState.getMinutes();
    const currentMinutes = nowHrs * 60 + nowMins;

    const fTime = fajr !== "--:--" ? fajr : "05:00 AM";
    const dTime = dhuhr !== "--:--" ? dhuhr : "12:15 PM";
    const aTime = asr !== "--:--" ? asr : "03:30 PM";
    const mTime = maghrib !== "--:--" ? maghrib : "06:30 PM";
    const iTime = isha !== "--:--" ? isha : "08:00 PM";

    const fajrMinutes = parseTimeToMinutes(fTime);
    const dhuhrMinutes = parseTimeToMinutes(dTime);
    const asrMinutes = parseTimeToMinutes(aTime);
    const maghribMinutes = parseTimeToMinutes(mTime);
    const ishaMinutes = parseTimeToMinutes(iTime);

    if (currentMinutes < fajrMinutes) {
      return "isha";
    }
    if (currentMinutes >= fajrMinutes && currentMinutes < dhuhrMinutes) {
      return "fajr";
    }
    if (currentMinutes >= dhuhrMinutes && currentMinutes < asrMinutes) {
      return "dhuhr";
    }
    if (currentMinutes >= asrMinutes && currentMinutes < maghribMinutes) {
      return "asr";
    }
    if (currentMinutes >= maghribMinutes && currentMinutes < ishaMinutes) {
      return "maghrib";
    }
    return "isha";
  };

  const activePrayerKey = getActivePrayerKey();
  
  const [adhanModalOpen, setAdhanModalOpen] = useState(false);
  const [selectedMuezzin, setSelectedMuezzin] = useState(() => {
    return localStorage.getItem("deen_selected_muezzin") || "makkah";
  });
  const [playMuezzinId, setPlayMuezzinId] = useState<string | null>(null);
  const [notifyToast, setNotifyToast] = useState<string | null>(null);

  // Audio References & State for live playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAdhanPlaying, setIsAdhanPlaying] = useState(false);
  const [activeAdhanName, setActiveAdhanName] = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [blockedPrayerLabel, setBlockedPrayerLabel] = useState("");
  const lastTriggeredRef = useRef("");

  interface SnoozedAlert {
    prayerName: string;
    triggerTime: number;
  }

  const [snoozedAlerts, setSnoozedAlerts] = useState<SnoozedAlert[]>(() => {
    const saved = localStorage.getItem("deen_snoozed_alerts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(a => a.triggerTime > Date.now());
        }
      } catch (e) {
        console.error("Error parsing deen_snoozed_alerts:", e);
      }
    }
    return [];
  });

  const showToast = (msg: string) => {
    setNotifyToast(msg);
    setTimeout(() => setNotifyToast(null), 2500);
  };

  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      showToast("This browser does not support desktop notifications.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
      if (permission === "granted") {
        showToast("Browser notifications enabled successfully! 🔔");
      } else if (permission === "denied") {
        showToast("Notification permission denied. Please allow it in settings.");
      }
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      showToast("Failed to request permission. Enable in browser settings.");
    }
  };

  const lastEarlyNotifiedRef = useRef<Record<string, string>>({});

  // Check for early notification trigger using custom reminder offsets
  useEffect(() => {
    if (notificationStatus !== "granted") return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const todayStr = now.toDateString();

      const prayers = [
        { key: "fajr", label: "Fajr", time: fajr },
        { key: "dhuhr", label: "Dhuhr", time: dhuhr },
        { key: "asr", label: "Asr", time: asr },
        { key: "maghrib", label: "Maghrib", time: maghrib },
        { key: "isha", label: "Isha", time: isha },
      ];

      for (const p of prayers) {
        if (!p.time || p.time === "--:--" || p.time.includes("--")) continue;
        
        // Skip early notifications of any prayer if muted/silenced by the user
        if (mutedPrayers[p.key]) continue;

        const prayerMinutes = parseTimeToMinutes(p.time);
        
        // Get custom offset or fallback to 10 minutes
        const offset = reminderOffsets[p.key] !== undefined ? reminderOffsets[p.key] : 10;
        
        // If offset is 0, user chose not to receive early alerts for this prayer
        if (offset <= 0) continue;

        const targetMinutes = prayerMinutes - offset;
        
        if (currentMinutes === targetMinutes) {
          const uniqueKey = `${p.key}_${offset}_${selectedLocation}_${todayStr}`;
          
          if (lastEarlyNotifiedRef.current[uniqueKey] !== todayStr) {
            lastEarlyNotifiedRef.current[uniqueKey] = todayStr;
            
            try {
              new Notification(`Salah Early Reminder`, {
                body: `⏰ ${p.label} starts in ${offset} minutes (${p.time}) at ${selectedLocation.split(",")[0]}.`,
                icon: "/favicon.ico",
              });
            } catch (err) {
              console.error("Failed to showcase Notification popup:", err);
            }
          }
        }
      }
    }, 15000); // Check every 15 seconds to catch minute changes reliably

    return () => clearInterval(interval);
  }, [fajr, dhuhr, asr, maghrib, isha, notificationStatus, selectedLocation, mutedPrayers, reminderOffsets]);

  const playAudioUrlWithFallback = (muezzinId: string, primaryUrl: string, label: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    setAudioLoading(true);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setPlayMuezzinId(muezzinId);
    setIsAdhanPlaying(true);
    setActiveAdhanName(label);
    setAutoplayBlocked(false);
    setBlockedPrayerLabel("");
    
    let isRevertingToBackup = false;
    const audio = new Audio(primaryUrl);
    audioRef.current = audio;
    
    const setupListeners = (audioElem: HTMLAudioElement) => {
      audioElem.onplay = () => {
        setAudioLoading(false);
        setAutoplayBlocked(false);
        setBlockedPrayerLabel("");
      };
      
      audioElem.oncanplay = () => {
        setAudioLoading(false);
      };
      
      audioElem.ontimeupdate = () => {
        setAudioCurrentTime(audioElem.currentTime);
      };
      
      audioElem.onloadedmetadata = () => {
        setAudioDuration(audioElem.duration || 240);
        setAudioLoading(false);
      };
      
      audioElem.onended = () => {
        setIsAdhanPlaying(false);
        setActiveAdhanName("");
        setPlayMuezzinId(null);
        setAudioLoading(false);
        setAudioCurrentTime(0);
        setAudioDuration(0);
        setAutoplayBlocked(false);
        setBlockedPrayerLabel("");
      };
      
      audioElem.onerror = () => {
        if (!isRevertingToBackup) {
          isRevertingToBackup = true;
          const backup = BACKUP_URLS[muezzinId];
          if (backup) {
            console.warn(`Primary audio loading failed. Attempting backup URL for ${muezzinId}...`);
            audioElem.pause();
            const backupAudio = new Audio(backup);
            audioRef.current = backupAudio;
            setupListeners(backupAudio);
            backupAudio.play().catch(err => {
              console.warn("Backup audio play failed (handled):", err);
              setAudioLoading(false);
              setIsAdhanPlaying(false);
              setPlayMuezzinId(null);
              setAutoplayBlocked(true);
              setBlockedPrayerLabel(label);
              showToast("Autoplay blocked. Click 'Play Adhan' to hear.");
            });
          } else {
            setAudioLoading(false);
            setIsAdhanPlaying(false);
            setPlayMuezzinId(null);
            showToast("Selected option failed to load. Try another! 🕋");
          }
        } else {
          setAudioLoading(false);
          setIsAdhanPlaying(false);
          setPlayMuezzinId(null);
          showToast("Network is busy. Please try another selection. 🏙️");
        }
      };
    };
    
    setupListeners(audio);
    
    audio.play().catch(err => {
      console.warn("Audio autoplay block or failure (handled):", err);
      if (!isRevertingToBackup) {
        isRevertingToBackup = true;
        const backup = BACKUP_URLS[muezzinId];
        if (backup) {
          const backupAudio = new Audio(backup);
          audioRef.current = backupAudio;
          setupListeners(backupAudio);
          backupAudio.play().catch(e => {
            console.warn("Backup failed play (handled):", e);
            setAudioLoading(false);
            setIsAdhanPlaying(false);
            setPlayMuezzinId(null);
            setAutoplayBlocked(true);
            setBlockedPrayerLabel(label);
            showToast("Audio play blocked. Tap 'Play Adhan' to enable!");
          });
        } else {
          setAudioLoading(false);
          setIsAdhanPlaying(false);
          setPlayMuezzinId(null);
          showToast("Autoplay blocked. Tap the play buttons directly!");
        }
      } else {
        setAudioLoading(false);
        setIsAdhanPlaying(false);
        setPlayMuezzinId(null);
        setAutoplayBlocked(true);
        setBlockedPrayerLabel(label);
        showToast("Audio autoplay blocked by browser settings.");
      }
    });
  };

  const triggerWebAdhan = (prayerName: string) => {
    const choice = MUEZZIN_CHOICES.find(m => m.id === selectedMuezzin) || MUEZZIN_CHOICES[0];
    playAudioUrlWithFallback(choice.id, choice.url, `${prayerName} Adhan`);
  };

  const stopActiveAdhan = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsAdhanPlaying(false);
    setActiveAdhanName("");
    setPlayMuezzinId(null);
    setAudioLoading(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setAutoplayBlocked(false);
    setBlockedPrayerLabel("");
    showToast("Adhan playback silenced 🔇");
  };

  const handleSnooze = (adhanName: string, minutes: number) => {
    const pName = adhanName.replace(" Adhan", "").trim();
    const triggerTime = Date.now() + minutes * 60000;
    
    stopActiveAdhan();
    
    setSnoozedAlerts(prev => {
      const filtered = prev.filter(a => a.prayerName !== pName);
      const updated = [...filtered, { prayerName: pName, triggerTime }];
      localStorage.setItem("deen_snoozed_alerts", JSON.stringify(updated));
      return updated;
    });
    
    showToast(`${pName} Adhan snoozed for ${minutes} minutes 🔔`);
  };

  const handleTriggerNow = (index: number) => {
    const alert = snoozedAlerts[index];
    if (!alert) return;
    
    triggerWebAdhan(alert.prayerName);
    showToast(`Triggering ${alert.prayerName} Adhan now! 🕋`);
    
    setSnoozedAlerts(prev => {
      const remaining = prev.filter((_, i) => i !== index);
      localStorage.setItem("deen_snoozed_alerts", JSON.stringify(remaining));
      return remaining;
    });
  };

  const handleCancelSnooze = (index: number) => {
    const alert = snoozedAlerts[index];
    if (!alert) return;
    
    setSnoozedAlerts(prev => {
      const remaining = prev.filter((_, i) => i !== index);
      localStorage.setItem("deen_snoozed_alerts", JSON.stringify(remaining));
      return remaining;
    });
    showToast(`Snoozed ${alert.prayerName} Adhan cancelled`);
  };

  // Check for snoozed alerts triggering when currentTimeState updates every second
  useEffect(() => {
    const nowMs = Date.now();
    const triggering = snoozedAlerts.filter(alert => nowMs >= alert.triggerTime);
    if (triggering.length > 0) {
      triggering.forEach(alert => {
        triggerWebAdhan(alert.prayerName);
        showToast(`Snoozed ${alert.prayerName} Adhan triggered! 🕋`);
      });
      setSnoozedAlerts(prev => {
        const remaining = prev.filter(alert => nowMs < alert.triggerTime);
        localStorage.setItem("deen_snoozed_alerts", JSON.stringify(remaining));
        return remaining;
      });
    }
  }, [currentTimeState, snoozedAlerts]);

  const convertTo12Hour = (timeStr: string): string => {
    if (!timeStr) return "";
    const clean = timeStr.trim();
    if (clean.toUpperCase().includes("AM") || clean.toUpperCase().includes("PM")) {
      return clean;
    }
    const parts = clean.split(":");
    let hrs = parseInt(parts[0], 10);
    const mins = parts[1]?.split(" ")[0] || "00";
    if (isNaN(hrs)) return timeStr;
    const ampm = hrs >= 12 ? "PM" : "AM";
    hrs = hrs % 12;
    if (hrs === 0) hrs = 12;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hrs)}:${mins.substring(0, 2)} ${ampm}`;
  };

  const normalizeTimeCheck = (t: string) => {
    return t.replace(/^0/, "").trim().toUpperCase();
  };

  const fetchGpsPrayerTimes = (params?: { method?: string; school?: string; key?: string }) => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const method = params?.method !== undefined ? params.method : apiMethod;
        const school = params?.school !== undefined ? params.school : apiSchool;
        const key = params?.key !== undefined ? params.key : customApiKey;

        // Calculate Qibla angle and distance to Mecca using high precision spherical models
        const latitudeMecca = 21.4225;
        const longitudeMecca = 39.8262;

        const phi_u = lat * Math.PI / 180;
        const lambda_u = lon * Math.PI / 180;
        const phi_k = latitudeMecca * Math.PI / 180;
        const lambda_k = longitudeMecca * Math.PI / 180;

        const y = Math.sin(lambda_k - lambda_u);
        const x = Math.cos(phi_u) * Math.tan(phi_k) - Math.sin(phi_u) * Math.cos(lambda_k - lambda_u);
        const qiblaRad = Math.atan2(y, x);
        const qiblaDeg = (qiblaRad * 180 / Math.PI + 360) % 360;

        // Haversine distance
        const R = 6371; // Earth Radius
        const dLat = (latitudeMecca - lat) * Math.PI / 180;
        const dLon = (longitudeMecca - lon) * Math.PI / 180;
        const aVal = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
                     Math.cos(lat * Math.PI / 180) * Math.cos(latitudeMecca * Math.PI / 180) * 
                     Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const cVal = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
        const distKm = Math.round(R * cVal);

        const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        const dIndex = Math.round(((qiblaDeg % 360) / 45)) % 8;
        const qiblaString = `${qiblaDeg.toFixed(1)}° ${directions[dIndex]}`;

        let success = false;
        let fetchedTimes: Partial<PrayerTimesSet> = {};

        // 1. Prepare endpoints
        const islamicApiUrl = `https://islamicapi.com/api/v1/prayer-time/?lat=${lat}&lon=${lon}&method=${method}&school=${school}&api_key=${key}`;
        const aladhanUrl = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=${method}`;

        // Attempt IslamicAPI if key exists and is non-empty/non-placeholder
        if (key && key !== "{YOUR_API_KEY}" && key.trim() !== "") {
          try {
            const response = await fetch(islamicApiUrl);
            if (response.ok) {
              const data = await response.json();
              let times: any = null;
              
              if (data.timings) times = data.timings;
              else if (data.data && data.data.timings) times = data.data.timings;
              else if (data.results) times = data.results;
              else if (data.times) times = data.times;
              else times = data;

              if (times) {
                const findField = (name: string) => {
                  const k = Object.keys(times).find(key => key.toLowerCase() === name.toLowerCase());
                  return k ? times[k] : null;
                };

                const f = findField("fajr");
                const d = findField("dhuhr");
                const as = findField("asr");
                const m = findField("maghrib");
                const i = findField("isha");

                if (f && d && as && m && i) {
                  fetchedTimes = {
                    fajr: convertTo12Hour(f),
                    dhuhr: convertTo12Hour(d),
                    asr: convertTo12Hour(as),
                    maghrib: convertTo12Hour(m),
                    isha: convertTo12Hour(i)
                  };
                  success = true;
                  showToast("Prayer times fetched from IslamicAPI! 🌍");
                }
              }
            }
          } catch (e) {
            console.warn("IslamicAPI call failed, falling back to backup:", e);
          }
        }

        // 2. Clear backup call (Aladhan API free tier)
        if (!success) {
          try {
            const response = await fetch(aladhanUrl);
            if (response.ok) {
              const data = await response.json();
              if (data.data && data.data.timings) {
                const t = data.data.timings;
                fetchedTimes = {
                  fajr: convertTo12Hour(t.Fajr),
                  dhuhr: convertTo12Hour(t.Dhuhr),
                  asr: convertTo12Hour(t.Asr),
                  maghrib: convertTo12Hour(t.Maghrib),
                  isha: convertTo12Hour(t.Isha)
                };
                success = true;
                showToast("Prayer times fetched using high-availability GPS! 📍");
              }
            }
          } catch (e) {
            console.error("Backup API failed:", e);
          }
        }

        if (success) {
          const combined: PrayerTimesSet = {
            fajr: fetchedTimes.fajr || "05:00 AM",
            dhuhr: fetchedTimes.dhuhr || "12:15 PM",
            asr: fetchedTimes.asr || "03:30 PM",
            maghrib: fetchedTimes.maghrib || "06:30 PM",
            isha: fetchedTimes.isha || "08:00 PM",
            distance: distKm.toLocaleString(),
            angle: qiblaString,
            compassRotation: qiblaDeg
          };

          setCustomPrayerTimes(combined);
          localStorage.setItem("deen_custom_prayer_times", JSON.stringify(combined));
          setGpsError(null);
        } else {
          setGpsError("Check connectivity. Defaulting to loaded profile.");
        }
        setGpsLoading(false);
      },
      (error) => {
        let msg = "Geolocation failed: " + error.message;
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Please allow location access to fetch live prayer times.";
        }
        setGpsError(msg);
        setGpsLoading(false);
        showToast("GPS location access skipped ⚠️");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    if (selectedLocation === "Automatic (GPS Location)") {
      fetchGpsPrayerTimes();
    }
  }, [selectedLocation]);

  const checkAdhanTrigger = (currentTimeStr12: string, currentTimeStr24: string) => {
    const prayers = [
      { key: "fajr", time: fajr, name: "Fajr" },
      { key: "dhuhr", time: dhuhr, name: "Dhuhr" },
      { key: "asr", time: asr, name: "Asr" },
      { key: "maghrib", time: maghrib, name: "Maghrib" },
      { key: "isha", time: isha, name: "Isha" },
    ];
    
    for (const p of prayers) {
      if (mutedPrayers[p.key]) continue;
      
      const normTime = normalizeTimeCheck(p.time);
      const norm12 = normalizeTimeCheck(currentTimeStr12);
      const norm24 = normalizeTimeCheck(currentTimeStr24);
      
      if (normTime === norm12 || normTime === norm24) {
        return p;
      }
    }
    return null;
  };

  // Real-time tracker loop to automatic trigger Adhan sound when prayer times match
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date();
      const hrs = now.getHours();
      const mins = now.getMinutes();
      const ampm = hrs >= 12 ? "PM" : "AM";
      const pad = (n: number) => String(n).padStart(2, '0');
      
      const time12Str = `${pad(hrs % 12 || 12)}:${pad(mins)} ${ampm}`;
      const time24Str = `${pad(hrs)}:${pad(mins)} ${ampm}`;
      
      const currentMinuteKey = `${selectedLocation}_${hrs}_${mins}`;
      
      if (lastTriggeredRef.current !== currentMinuteKey) {
        const matched = checkAdhanTrigger(time12Str, time24Str);
        if (matched) {
          lastTriggeredRef.current = currentMinuteKey;
          triggerWebAdhan(matched.name);
        }
      }
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(checkInterval);
    };
  }, [selectedLocation, fajr, dhuhr, asr, maghrib, isha, mutedPrayers, selectedMuezzin]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Compass Jitter Effect simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const target = compassRotation;
    
    const jitter = () => {
      // Add standard micro-variation fluctuation simulating high quality precision magnetometer alignment
      const offset = (Math.random() - 0.5) * 2.2;
      setNeedleRotation(target + offset);
    };

    interval = setInterval(jitter, 180);
    return () => clearInterval(interval);
  }, [compassRotation]);

  const toggleMute = (prayerKey: string, prayerName: string) => {
    const nextState = !mutedPrayers[prayerKey];
    const updated = { ...mutedPrayers, [prayerKey]: nextState };
    setMutedPrayers(updated);
    localStorage.setItem("deen_muted_prayers", JSON.stringify(updated));
    
    // Toast notification feedback
    setNotifyToast(`${prayerName} Adhan ${nextState ? "muted" : "alarm scheduled ✅"}`);
    setTimeout(() => setNotifyToast(null), 2500);
  };

  const handleMuezzinPlay = (muezzinId: string) => {
    if (playMuezzinId === muezzinId && isAdhanPlaying) {
      stopActiveAdhan();
    } else {
      const choice = MUEZZIN_CHOICES.find(m => m.id === muezzinId) || MUEZZIN_CHOICES[0];
      const nameClean = choice.name.split(" (")[0];
      playAudioUrlWithFallback(choice.id, choice.url, `Adhan (${nameClean})`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert Banner */}
      <AnimatePresence>
        {notifyToast && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#012d1d] text-white px-5 py-3 rounded-full shadow-xl text-xs font-semibold z-50 flex items-center gap-2 border border-gold-accent"
          >
            <Check className="w-4 h-4 text-gold-accent" />
            <span>{notifyToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Autoplay Block Info/Interaction Banner */}
      <AnimatePresence>
        {autoplayBlocked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md bg-amber-50 border border-amber-200 rounded-[28px] p-5 shadow-2xl z-50 text-left space-y-4 font-sans"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <VolumeX className="w-5 h-5 text-amber-700 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">Adhan Autoplay Blocked!</h4>
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  Your browser stopped the automatic {blockedPrayerLabel || "Prayer"} sound because you haven't interacted with the app yet. Tap below to hear the beautiful Adhan call!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/50">
              <button
                type="button"
                onClick={() => {
                  const choice = MUEZZIN_CHOICES.find(m => m.id === selectedMuezzin) || MUEZZIN_CHOICES[0];
                  playAudioUrlWithFallback(choice.id, choice.url, blockedPrayerLabel || "Adhan");
                }}
                className="flex-1 min-w-[120px] px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-[11px] font-extrabold uppercase tracking-wider transition-all hover:scale-[1.03] active:scale-95 cursor-pointer shadow-md text-center flex items-center justify-center gap-1 border-none"
              >
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                <span>Play Adhan</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleSnooze(blockedPrayerLabel || "Adhan", 5)}
                className="px-3 py-2 bg-white hover:bg-amber-100 text-amber-900 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-[1.03] active:scale-95 cursor-pointer border border-amber-200 text-center"
              >
                Snooze 5m
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setAutoplayBlocked(false);
                  setBlockedPrayerLabel("");
                }}
                className="p-2 text-amber-700 hover:text-amber-900 font-semibold text-[11px] uppercase tracking-wider hover:underline cursor-pointer border-none bg-transparent"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Snoozed Alerts Widget */}
      {snoozedAlerts.length > 0 && (
        <div className="bg-[#fffdf5] border border-[#f5ebcb] rounded-[28px] p-5 shadow-sm space-y-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#fed65b]/20 flex items-center justify-center text-[#735c00]">
                <Clock className="w-4 h-4 text-[#735c00] animate-[spin_6s_linear_infinite]" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-[#012d1d] uppercase tracking-wider block">Snoozed Alerts (प्रार्थना स्नुज)</span>
                <p className="text-[9.5px] text-on-surface-variant font-medium mt-0.5">Delaying automated Adhan alerts temporarily</p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-[#735c00] uppercase tracking-widest bg-[#fed65b]/25 rounded-full border border-gold-accent/20 px-2.5 py-1">
              {snoozedAlerts.length} Active
            </span>
          </div>

          <div className="space-y-2">
            {snoozedAlerts.map((alert, idx) => {
              const secondsLeft = Math.max(0, Math.round((alert.triggerTime - Date.now()) / 1000));
              const mLeft = Math.floor(secondsLeft / 60);
              const sLeft = secondsLeft % 60;
              return (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-4 py-3 rounded-2xl border border-outline-variant/30 hover:border-[#fed65b]/30 transition-all gap-3">
                  <div className="text-left space-y-0.5">
                    <p className="text-xs font-bold text-[#012d1d] flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-[#fed65b] rounded-full animate-ping"></span>
                      <span>{alert.prayerName} Adhan</span>
                    </p>
                    <p className="text-[10px] text-on-surface-variant font-medium">
                      Resuming in <span className="text-[#bf9600] font-bold">{mLeft}m {sLeft}s</span> ({new Date(alert.triggerTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTriggerNow(idx)}
                      className="text-[9px] font-sans font-extrabold text-[#012d1d] hover:text-white hover:bg-[#012d1d] bg-emerald-50 hover:border-[#012d1d] border border-emerald-250 px-3 py-1.5 rounded-full uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                    >
                      Trigger Now
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelSnooze(idx)}
                      className="text-[9px] font-sans font-extrabold text-red-650 hover:text-white hover:bg-red-600 bg-red-50 hover:border-red-600 border border-red-200 px-3 py-1.5 rounded-full uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Adhan Media Broadcast Controller Banner */}
      <AnimatePresence>
        {(isAdhanPlaying || playMuezzinId) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="p-5 bg-gradient-to-r from-[#012d1d] to-[#013f28] rounded-[28px] border border-gold-accent/40 shadow-xl text-white space-y-4.5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gold-accent/5 rounded-full blur-xl pointer-events-none"></div>
            
            {/* Top row with name & silence */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold-accent/25 flex items-center justify-center text-gold-accent animate-pulse">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-gold-accent flex items-center gap-1.5">
                    {audioLoading ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-gold-accent rounded-full animate-ping"></span>
                        Connecting Sanctuary...
                      </span>
                    ) : (
                      "Broadcasting Spiritual Echo"
                    )}
                  </h4>
                  <p className="font-serif text-sm font-bold text-white transition-opacity truncate max-w-[160px]">
                    {activeAdhanName || "Islamic Adhan Calling"}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Micro Play/Pause Control Option */}
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      if (audioRef.current.paused) {
                        audioRef.current.play().catch(e => console.warn(e));
                        setIsAdhanPlaying(true);
                      } else {
                        audioRef.current.pause();
                        setIsAdhanPlaying(false);
                      }
                    }
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white border-none cursor-pointer scale-100 active:scale-95 transition-all"
                  title={audioRef.current?.paused ? "Resume Adhan" : "Pause Adhan"}
                >
                  {isAdhanPlaying && audioRef.current && !audioRef.current.paused ? (
                    <Pause className="w-4 h-4 text-gold-accent fill-gold-accent" />
                  ) : (
                    <Play className="w-4 h-4 text-gold-accent fill-gold-accent ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSnooze(activeAdhanName || "Adhan", 5)}
                  className="px-3 py-1.5 bg-gold-accent hover:bg-gold-accent/90 text-[#012d1d] rounded-full font-sans text-[10px] font-extrabold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 border-none cursor-pointer flex items-center gap-1 shadow-sm"
                  title="Snooze Adhan by 5 minutes"
                >
                  <Clock className="w-3.5 h-3.5 text-[#012d1d]" />
                  <span>Snooze 5m</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSnooze(activeAdhanName || "Adhan", 10)}
                  className="px-3 py-1.5 bg-gold-accent hover:bg-gold-accent/90 text-[#012d1d] rounded-full font-sans text-[10px] font-extrabold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 border-none cursor-pointer flex items-center gap-1 shadow-sm"
                  title="Snooze Adhan by 10 minutes"
                >
                  <Clock className="w-3.5 h-3.5 text-[#012d1d]" />
                  <span>Snooze 10m</span>
                </button>

                <button 
                  onClick={stopActiveAdhan}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full font-sans text-[10px] font-extrabold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 border-none cursor-pointer"
                >
                  Silence
                </button>
              </div>
            </div>

            {/* Custom Interactive Time Slider & Progress Indicators */}
            <div className="space-y-1.5">
              <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-gold-accent rounded-full transition-all duration-300"
                  style={{ width: `${audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0}%` }}
                ></div>
                {audioLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-accent/40 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                )}
              </div>
              
              {/* Timing Numbers */}
              <div className="flex items-center justify-between text-[10px] text-white/60 font-mono">
                <span>
                  {audioLoading ? "Buffering waves..." : (
                    <>Elapsed: <span className="text-white font-bold">{Math.floor(audioCurrentTime / 60)}:{(Math.floor(audioCurrentTime % 60)).toString().padStart(2, '0')}</span></>
                  )}
                </span>
                <span>
                  Total Playtime: <span className="text-[#a5d0b9] font-bold">{Math.floor(audioDuration / 60)}:{(Math.floor(audioDuration % 60)).toString().padStart(2, '0')}</span>
                </span>
              </div>
            </div>
            
            {/* Audio wave pulse graphic bar */}
            <div className="flex items-center justify-between bg-[#011d13] px-3.5 py-2.5 rounded-2xl border border-white/5">
              <span className="text-[10px] text-[#a5d0b9] font-medium tracking-wide flex items-center gap-1.5">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${audioLoading ? "bg-amber-400 animate-ping" : "bg-emerald-500 animate-pulse"}`}></span>
                {audioLoading ? "Preparing high-availability audio stream..." : "Live Connection Active • Safe Autoplay Enabled"}
              </span>
              <div className="flex items-end gap-1 h-3.5">
                <div className={`w-0.75 h-2 bg-gold-accent rounded-full ${isAdhanPlaying ? "animate-[pulse_0.4s_infinite_alternate]" : ""}`}></div>
                <div className={`w-0.75 h-3.5 bg-gold-accent rounded-full ${isAdhanPlaying ? "animate-[pulse_0.6s_infinite_alternate_0.2s]" : ""}`}></div>
                <div className={`w-0.75 h-3 bg-gold-accent rounded-full ${isAdhanPlaying ? "animate-[pulse_0.5s_infinite_alternate_0.1s]" : ""}`}></div>
                <div className={`w-0.75 h-1 bg-gold-accent rounded-full ${isAdhanPlaying ? "animate-[pulse_0.3s_infinite_alternate_0.3s]" : ""}`}></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header & Location Picker */}
      <div className="text-center relative py-2">
        <h2 className="font-serif text-2xl font-bold text-primary-base mb-2">Prayer Times</h2>
        
        {/* Dropdown container */}
        <div className="relative inline-block">
          <button 
            onClick={() => setLocationOpen(!locationOpen)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-base/5 border border-primary-base/10 text-primary-base font-sans text-xs font-bold hover:bg-primary-base/10 transition-colors cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-gold-accent" />
            <span>{selectedLocation}</span>
            <ChevronDown className="w-3.5 h-3.5 text-primary-base" />
          </button>

          <AnimatePresence>
            {locationOpen && (
              <>
                {/* Backdrop click dismisser */}
                <div className="fixed inset-0 z-20" onClick={() => setLocationOpen(false)}></div>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-1/2 -translate-x-1/2 top-11 mt-1 bg-white border border-outline-variant/60 rounded-2xl shadow-xl w-56 py-2 z-30 max-h-72 overflow-y-auto"
                >
                  <button
                    onClick={() => {
                      setSelectedLocation("Automatic (GPS Location)");
                      localStorage.setItem("deen_selected_location", "Automatic (GPS Location)");
                      window.dispatchEvent(new Event("deen_location_changed"));
                      setLocationOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-surface-container transition-colors flex items-center justify-between ${selectedLocation === "Automatic (GPS Location)" ? "text-gold-accent bg-primary-base/5" : "text-primary-base"}`}
                  >
                    <span className="flex items-center gap-1.5 text-emerald-800 font-extrabold font-sans">
                      <span className="inline-block w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></span>
                      Automatic (GPS)
                    </span>
                    {selectedLocation === "Automatic (GPS Location)" && <Check className="w-3.5 h-3.5 text-gold-accent" />}
                  </button>

                  <div className="h-[1px] bg-outline-variant/30 my-1"></div>

                  {Object.keys(LOCATION_DATA).map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        setSelectedLocation(loc);
                        localStorage.setItem("deen_selected_location", loc);
                        window.dispatchEvent(new Event("deen_location_changed"));
                        setLocationOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-surface-container transition-colors flex items-center justify-between ${selectedLocation === loc ? "text-gold-accent bg-primary-base/5" : "text-[#012d1d]"}`}
                    >
                      {loc.split(",")[0]}
                      {selectedLocation === loc && <Check className="w-3.5 h-3.5 text-gold-accent" />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* GPS Status / Loading Banner */}
      {selectedLocation === "Automatic (GPS Location)" && (gpsLoading || gpsError) && (
        <div className="p-3 bg-primary-base/5 rounded-2xl border border-primary-base/10 text-center flex flex-col items-center justify-center gap-1">
          {gpsLoading && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gold-accent animate-ping"></span>
              <span className="text-xs font-medium text-emerald-950">Detecting satellite & fetching live timings...</span>
            </div>
          )}
          {gpsError && (
            <div className="flex items-center gap-1.5 text-red-700 font-sans">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs font-semibold">{gpsError}</span>
            </div>
          )}
        </div>
      )}

      {/* Muezzin Voice Selection & Real-time Player Panel */}
      <section className="bg-white border border-outline-variant/40 rounded-[28px] p-5 shadow-sm space-y-3.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-gold-accent/5 rounded-full blur-xl pointer-events-none"></div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 select-none">
            <span className="text-lg">📢</span>
            <div>
              <h3 className="font-serif text-sm font-bold text-primary-base">Adhan Voice Options</h3>
              <p className="text-[10px] text-on-surface-variant font-medium">Choose who delivers the automated Adhan call</p>
            </div>
          </div>
          <span className="text-[10px] text-[#735c00] font-sans font-extrabold tracking-wider bg-gold-accent/15 px-2.5 py-1 rounded-full uppercase">
            {MUEZZIN_CHOICES.find(m => m.id === selectedMuezzin)?.name.split(" (")[0] || "Default"}
          </span>
        </div>

        {/* Chooser Buttons */}
        <div className="grid grid-cols-1 gap-2.5">
          {MUEZZIN_CHOICES.map((muezzin) => {
            const isSelected = selectedMuezzin === muezzin.id;
            const isPlayingThis = playMuezzinId === muezzin.id;
            return (
              <div
                key={muezzin.id}
                onClick={() => {
                  setSelectedMuezzin(muezzin.id);
                  localStorage.setItem("deen_selected_muezzin", muezzin.id);
                  showToast(`${muezzin.name.split(" (")[0]} chosen for the automated Adhan! 🕋`);
                }}
                className={`p-3 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center justify-between group ${
                  isSelected 
                    ? "border-gold-accent bg-gold-accent/[0.08]" 
                    : "border-outline-variant/55 bg-surface-container-lowest hover:bg-surface-container-low"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMuezzinPlay(muezzin.id);
                    }}
                    className={`w-[32px] h-[32px] rounded-full flex items-center justify-center transition-all ${
                      isPlayingThis 
                        ? "bg-[#012d1d] text-white rotate-12" 
                        : "bg-gold-accent/15 text-gold-accent hover:bg-gold-accent hover:text-white"
                    } border-none cursor-pointer`}
                    title={isPlayingThis ? "Pause Preview" : "Play Adhan Preview"}
                  >
                    {isPlayingThis ? (
                      <Pause className="w-3.5 h-3.5 text-gold-accent fill-gold-accent" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-primary-base fill-primary-base" />
                    )}
                  </button>
                  <div>
                    <p className={`text-xs font-bold leading-tight ${isSelected ? "text-primary-base" : "text-slate-800"}`}>
                      {muezzin.name}
                    </p>
                    <p className="text-[9px] text-[#735c00] font-sans font-semibold mt-0.5">
                      Authentic Voice Call • Duration: {muezzin.duration} mins
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-[#012d1d] text-gold-accent flex items-center justify-center text-[10px] font-bold shadow-xs">
                      ✓
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Prayer Notification and Alarm Settings Shortcut Card */}
      <div className="bg-white border border-outline-variant/30 rounded-[28px] p-5 shadow-sm space-y-3.5 font-sans relative overflow-hidden">
        <div className="absolute inset-0 islamic-pattern-bg opacity-[0.01] pointer-events-none"></div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-[38px] h-[38px] rounded-full bg-[#012d1d]/10 flex items-center justify-center text-primary-base">
              <Bell className="w-4 h-4 text-[#012d1d]" />
            </div>
            <div className="text-left">
              <h3 className="text-xs font-bold text-primary-base">Custom Alarms & Alerts</h3>
              <p className="text-[9.5px] text-on-surface-variant font-medium leading-normal mt-0.5 max-w-[210px]">
                Configured with custom offsets and adhan playing in {selectedLocation.split(",")[0]}.
              </p>
            </div>
          </div>
          
          <div>
            {notificationStatus === "granted" ? (
              <span className="text-[9.5px] font-sans font-extrabold text-[#012d1d] tracking-wide bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                ACTIVE
              </span>
            ) : (
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="px-3.5 py-1.5 bg-[#012d1d] hover:bg-primary-light text-white rounded-full font-sans text-[9px] font-extrabold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 border-none cursor-pointer"
              >
                Enable
              </button>
            )}
          </div>
        </div>

        {notificationStatus === "denied" && (
          <div className="flex items-start gap-1.5 p-2 bg-red-50 text-red-900 rounded-xl text-[9px] leading-tight font-medium relative z-10">
            <span>⚠️ System alerts are blocked. Reset site permissions in your browser.</span>
          </div>
        )}

        {/* Action Button & Metadata */}
        <div className="flex items-center justify-between pt-3 border-t border-dashed border-outline-variant/30 text-[10px] relative z-10">
          <span className="text-[#735c00] font-sans font-extrabold flex items-center gap-1 uppercase tracking-wider text-[9px]">
            <span className="w-1.5 h-1.5 bg-gold-accent rounded-full"></span>
            Alarms Scheduled: {Object.values(mutedPrayers).filter(muted => !muted).length}/5 On
          </span>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate("settings")}
            className="text-[9px] font-sans font-black text-[#735c00] hover:text-[#011d13] bg-gold-accent/15 hover:bg-gold-accent/25 px-3 py-1.5 rounded-full border border-gold-accent/25 uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center gap-1"
          >
            <Settings className="w-3 h-3 text-[#735c00]" />
            <span>Configure Alarms →</span>
          </button>
        </div>
      </div>

      {/* Prayer List section mirroring mock elements precisely */}
      <div className="space-y-4">
        {[
          { key: "fajr", label: "Fajr", short: "F", desc: "Dawn invocation", bgShort: "bg-amber-500/10 text-amber-700", val: fajr },
          { key: "dhuhr", label: "Dhuhr", short: "Dh", desc: "Midday prayer", bgShort: "bg-[#735c00]/10 text-[#735c00]", val: dhuhr },
          { key: "asr", label: "Asr", short: "As", desc: "Late afternoon prayer", bgShort: "bg-gold-accent/25 text-gold-accent", val: asr },
          { key: "maghrib", label: "Maghrib", short: "M", desc: "Sunset prayer", bgShort: "bg-red-500/10 text-red-700", val: maghrib },
          { key: "isha", label: "Isha", short: "I", desc: "Night prayer", bgShort: "bg-indigo-500/10 text-indigo-700", val: isha },
        ].map((prayer) => {
          const isActive = activePrayerKey === prayer.key;
          if (isActive) {
            return (
              <div 
                key={prayer.key} 
                className="active-prayer-glow flex items-center justify-between p-5 bg-[#012d1d] text-white rounded-[28px] border-2 border-gold-accent/40 shadow-md relative overflow-hidden group hover:scale-[1.01] transition-all"
              >
                <div className="absolute inset-0 bg-primary-light/10 pointer-events-none z-0"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <span className="text-xs font-bold px-2 py-1 rounded bg-gold-accent/25 text-gold-accent font-sans">
                    {prayer.short}
                  </span>
                  <div>
                    <span className="font-serif text-[15px] font-bold text-white block">
                      {prayer.label}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-[#a5d0b9] font-semibold font-sans">
                      Current Prayer
                    </span>
                  </div>
                </div>
                <div className="relative z-10 flex items-center gap-3">
                  <span className="font-serif text-lg font-bold text-gold-accent mr-2">
                    {prayer.val}
                  </span>
                  <button 
                    onClick={() => {
                      if (isAdhanPlaying && activeAdhanName === prayer.label) {
                        stopActiveAdhan();
                      } else {
                        triggerWebAdhan(prayer.label);
                      }
                    }}
                    className="p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer border-none bg-transparent flex items-center justify-center animate-none"
                    title={`Listen to ${prayer.label} Adhan`}
                  >
                    {isAdhanPlaying && activeAdhanName === prayer.label ? (
                      <Pause className="w-[18px] h-[18px] text-gold-accent fill-gold-accent animate-pulse" />
                    ) : (
                      <Play className="w-[18px] h-[18px] text-white/50 hover:text-gold-accent" />
                    )}
                  </button>
                  <button 
                    onClick={() => toggleMute(prayer.key, prayer.label)}
                    className={`p-2 rounded-full transition-colors border-none bg-transparent flex items-center justify-center cursor-pointer ${
                      mutedPrayers[prayer.key] 
                        ? "text-white/40 hover:text-white" 
                        : "text-gold-accent hover:opacity-90 animate-bounce-slow"
                    }`}
                  >
                    {mutedPrayers[prayer.key] ? <BellOff className="w-4.5 h-4.5" /> : <Bell className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
            );
          } else {
            return (
              <div 
                key={prayer.key} 
                className="flex items-center justify-between p-4 bg-white hover:bg-surface-container-low rounded-2xl border border-outline-variant/30 shadow-sm transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${prayer.bgShort}`}>
                    {prayer.short}
                  </span>
                  <div>
                    <span className="font-serif text-sm font-bold text-primary-base block">
                      {prayer.label}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                      {prayer.desc}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-serif text-[17px] font-bold text-primary-base mr-2">
                    {prayer.val}
                  </span>
                  <button 
                    onClick={() => {
                      if (isAdhanPlaying && activeAdhanName === prayer.label) {
                        stopActiveAdhan();
                      } else {
                        triggerWebAdhan(prayer.label);
                      }
                    }}
                    className="p-2 rounded-full hover:bg-gold-accent/15 transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                    title={`Listen to ${prayer.label} Adhan`}
                  >
                    {isAdhanPlaying && activeAdhanName === prayer.label ? (
                      <Pause className="w-[18px] h-[18px] text-gold-accent fill-gold-accent animate-pulse" />
                    ) : (
                      <Play className="w-[18px] h-[18px] text-primary-base/40 hover:text-gold-accent" />
                    )}
                  </button>
                  <button 
                    onClick={() => toggleMute(prayer.key, prayer.label)}
                    className={`p-2 rounded-full transition-colors border-none bg-transparent flex items-center justify-center cursor-pointer ${
                      mutedPrayers[prayer.key] 
                        ? "text-on-surface-variant/40 hover:text-primary-base" 
                        : "text-gold-accent hover:opacity-85"
                    }`}
                  >
                    {mutedPrayers[prayer.key] ? <BellOff className="w-4.5 h-4.5" /> : <Bell className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
            );
          }
        })}
      </div>

      {/* Qibla Compass Widget & Compass Frame */}
      <section className="bg-white border border-outline-variant/40 rounded-[32px] p-6 shadow-md overflow-hidden relative">
        <div className="absolute inset-0 islamic-pattern-bg opacity-[0.02] pointer-events-none z-0"></div>
        <div className="relative z-10 flex flex-col items-center">
          <h3 className="font-serif text-base font-bold text-primary-base mb-4 flex items-center gap-2">
            <Compass className="w-4.5 h-4.5 text-gold-accent animate-spin-slow" />
            Interactive Qibla Compass
          </h3>

          {/* Virtual Compass Outer Base Dial representation */}
          <div 
            id="qiblaCompassContainer"
            onMouseDown={handleCompassStart}
            onTouchStart={handleCompassStart}
            className="relative w-52 h-52 mb-5 group flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            title="Click & drag or swipe to rotate compass housing"
          >
            {/* Outer Pulsing Ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary-base/5 to-gold-accent/15 scale-105 pointer-events-none"></div>
            {/* Compass Inner Dark Emerald Rim Plate */}
            <div className="relative w-[184px] h-[184px] rounded-full bg-gradient-to-b from-[#012d1d] to-[#01140d] border-4 border-gold-accent/25 shadow-2xl flex items-center justify-center overflow-hidden">
              
              {/* Inner Gridded Lines */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                <div className="absolute w-[1.5px] h-full bg-gold-accent/20"></div>
                <div className="absolute w-full h-[1.5px] bg-gold-accent/20"></div>
                <div className="absolute w-[1px] h-full bg-gold-accent/10 rotate-45"></div>
                <div className="absolute w-full h-[1px] bg-gold-accent/10 rotate-45"></div>
              </div>

              {/* Rotating Compass Needle Dial Container */}
              <div 
                style={{ transform: `rotate(${needleRotation}deg)` }}
                className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
                id="qiblaCompassDial"
              >
                {/* Needle structure */}
                <div className="relative h-full w-full flex items-center justify-center">
                  
                  {/* Top Pointer - Mecca Kaaba symbol */}
                  <div className="absolute top-5 flex flex-col items-center">
                    <div className="w-9 h-9 bg-[#fed65b]/20 border border-gold-accent/50 rounded-lg flex items-center justify-center drop-shadow-[0_0_5px_rgba(212,175,55,0.4)] mb-1">
                      <span className="text-xs font-serif font-extrabold text-[#fed65b]">🕋</span>
                    </div>
                    <span className="text-[7.5px] font-sans font-bold text-[#fed65b] tracking-widest">KAABA</span>
                  </div>

                  {/* Center Hub Spot Pin */}
                  <div className="w-10 h-10 rounded-full bg-gold-accent shadow-md flex items-center justify-center z-10 border-4 border-primary-base">
                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                  </div>

                  {/* Gold Needle Stem Filament */}
                  <div className="absolute w-[1.5px] h-[65%] bg-gradient-to-b from-gold-accent via-gold-accent/20 to-transparent"></div>
                </div>
              </div>
            </div>

            {/* Float Accuracy Tag */}
            <div className="absolute -bottom-2 bg-white px-4 py-1.5 rounded-full border border-outline-variant/50 shadow-sm flex items-center gap-1.5 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] font-sans font-bold text-primary-base uppercase tracking-wider">Calibration High</span>
            </div>
          </div>

          <div className="text-center space-y-2 mt-2 w-full">
            <p className="font-sans text-xs text-on-surface-variant font-semibold">
              Mecca Direction (Bearing): <span className="text-gold-accent">{angle}</span>
            </p>
            
            <div className="w-full max-w-[200px] mx-auto pt-1 pb-2 space-y-1.5 border-t border-outline-variant/10">
              <div className="flex justify-between text-[11px] font-sans font-bold text-on-surface-variant">
                <span>Facing Direction:</span>
                <span className="text-primary-base font-mono bg-primary-base/5 px-2 py-0.5 rounded">
                  {deviceHeading}° {getCardinalDirection(deviceHeading)}
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="359" 
                value={deviceHeading} 
                onChange={(e) => setDeviceHeading(parseInt(e.target.value, 10))}
                className="w-full accent-gold-accent cursor-pointer h-1.5 rounded-lg bg-primary-base/10"
                title="Rotate your device's heading"
              />
            </div>

            <p className="font-sans text-[10px] text-on-surface-variant/70 italic flex items-center justify-center gap-1">
              <Info className="w-3.5 h-3.5 text-gold-accent" />
              Drag the compass dial or use slider to rotate housing!
            </p>
          </div>

          {/* Adhan Sound Settings Button and Controls */}
          <button 
            onClick={() => setAdhanModalOpen(true)}
            className="w-full mt-4 py-3 bg-primary-base hover:bg-primary-light text-white font-sans font-bold text-xs rounded-full transition-all flex items-center justify-center gap-2 active:scale-95 shadow"
          >
            <Music className="w-4 h-4 text-gold-accent" />
            <span>Adhan Settings</span>
          </button>
        </div>
      </section>

      {/* Distance and Angle Grid cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Distance Card */}
        <div className="bg-white p-4.5 rounded-[24px] border border-outline-variant/35 shadow-sm flex flex-col justify-between h-32">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Distance to Mecca</span>
          <div>
            <span className="font-serif text-[26px] font-bold text-primary-base block">
              {distance} <span className="font-sans text-xs text-on-surface-variant font-medium">km</span>
            </span>
          </div>
          <span className="text-[9px] text-[#735c00] font-sans font-semibold bg-gold-accent/15 px-2 py-0.5 rounded-md w-fit">
            Via Geodesic
          </span>
        </div>

        {/* Angle Code Card */}
        <div className="bg-white p-4.5 rounded-[24px] border border-outline-variant/35 shadow-sm flex flex-col justify-between h-32">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">True Qibla Bearing</span>
          <div>
            <span className="font-serif text-[26px] font-bold text-[#735c00] block">
              {compassRotation}°
            </span>
          </div>
          <span className="text-[9px] text-primary-base font-sans font-semibold bg-primary-base/10 px-2 py-0.5 rounded-md w-fit">
            True North Offset
          </span>
        </div>
      </div>

      {/* Bottom Guideline Info card */}
      <div className="bg-primary-base/5 border border-primary-base/10 rounded-2xl p-4 flex gap-4 items-center">
        <div className="w-10 h-10 rounded-full bg-[#fed65b]/20 text-[#735c00] flex items-center justify-center flex-shrink-0 animate-pulse">
          💡
        </div>
        <p className="text-xs text-primary-light font-medium leading-relaxed">
          Keep your phone <strong className="font-semibold text-primary-base">flat</strong> and away from metallic structures or laptops to secure precise magnet alignments.
        </p>
      </div>

      {/* Adhan Settings Dialog Modal */}
      <AnimatePresence>
        {adhanModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[28px] max-w-sm w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-serif text-base font-bold text-primary-base">Prayer Settings & Alarms</h3>
                  <p className="text-xs text-on-surface-variant">Configure Voice, Athan tones, and dynamic calculations</p>
                </div>
                <button 
                  onClick={() => {
                    setAdhanModalOpen(false);
                    setPlayMuezzinId(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Muezzin Selection List */}
              <div className="space-y-3 pt-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Select Muezzin & Audio Tone
                </span>
                {MUEZZIN_CHOICES.map((muezzin) => (
                  <div 
                    key={muezzin.id}
                    onClick={() => {
                      setSelectedMuezzin(muezzin.id);
                      localStorage.setItem("deen_selected_muezzin", muezzin.id);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${selectedMuezzin === muezzin.id ? "border-gold-accent bg-gold-accent/10" : "border-outline-variant/50 bg-surface-container-low hover:bg-surface-container"}`}
                  >
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMuezzinPlay(muezzin.id);
                        }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center bg-primary-base text-white transition-transform active:scale-90`}
                      >
                        {playMuezzinId === muezzin.id ? (
                          <Pause className="w-3 h-3 text-gold-accent" />
                        ) : (
                          <Play className="w-3 h-3 text-gold-accent fill-gold-accent" />
                        )}
                      </button>
                      <span className="text-xs font-semibold text-primary-base">{muezzin.name}</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant font-medium">{muezzin.duration}</span>
                  </div>
                ))}
              </div>

              {/* Visual simulated player if active */}
              {playMuezzinId && (
                <div className="bg-[#012d1d] text-white p-3 rounded-xl flex items-center justify-between animate-pulse">
                  <span className="text-[10px] font-sans font-bold text-gold-accent tracking-widest flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    PLAYING PREVIEW...
                  </span>
                  <div className="flex gap-0.5">
                    <span className="w-1 h-3 bg-gold-accent animate-bounce"></span>
                    <span className="w-1 h-4 bg-gold-accent animate-bounce [animation-delay:0.15s]"></span>
                    <span className="w-1 h-3 bg-gold-accent animate-bounce [animation-delay:0.3s]"></span>
                  </div>
                </div>
              )}

              {/* IslamicAPI & GPS Calculation Parameters */}
              <div className="pt-4 border-t border-dashed border-outline-variant/60 space-y-3.5">
                <h4 className="font-serif text-sm font-extrabold text-[#012d1d] flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-gold-accent animate-spin-slow" />
                  API & Calculation Parameters
                </h4>

                {/* API Key box for islamicapi.com */}
                {currentUser?.email === "armanorig7@gmail.com" ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                        IslamicAPI.com Key
                      </label>
                      <span className="text-[9px] text-[#735c00] font-semibold">Optional</span>
                    </div>
                    <input 
                      type="password" 
                      value={customApiKey} 
                      onChange={(e) => {
                        const next = e.target.value;
                        setCustomApiKey(next);
                        localStorage.setItem("deen_islamic_api_key", next);
                      }}
                      placeholder="Enter api_key..."
                      className="w-full text-xs font-semibold text-primary-base rounded-xl border border-outline-variant bg-surface-container-low p-2.5 focus:outline-none focus:border-gold-accent focus:bg-white transition-colors"
                    />
                    <span className="text-[9.5px] text-[#735c00] font-bold leading-normal block">
                      Admin: If key matches the URL pattern, timings fetch on coordinates. Else, a free zero-config backup endpoint is run.
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-[#012d1d]/5 border border-[#012d1d]/15 rounded-xl text-[10px] text-emerald-950 font-bold leading-normal space-y-1">
                    <p>🛡️ API Key & Calculation Config</p>
                    <p className="text-gray-400 font-medium">Locked by Super Administrator (armanorig7@gmail.com). Free automated backup prayer timelines are active.</p>
                  </div>
                )}

                {/* Method selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Calculation Method
                  </label>
                  <select 
                    value={apiMethod} 
                    onChange={(e) => {
                      const next = e.target.value;
                      setApiMethod(next);
                      localStorage.setItem("deen_api_method", next);
                      if (selectedLocation === "Automatic (GPS Location)") {
                        fetchGpsPrayerTimes({ method: next });
                      }
                    }}
                    className="w-full text-xs font-semibold text-primary-base rounded-xl border border-outline-variant bg-surface-container-low p-2.5 focus:outline-none focus:border-gold-accent"
                  >
                    <option value="1">University of Islamic Sciences, Karachi</option>
                    <option value="2">Islamic Society of North America (ISNA)</option>
                    <option value="3">Muslim World League (MWL)</option>
                    <option value="4">Umm Al-Qura University, Makkah</option>
                    <option value="5">Egyptian General Authority of Survey</option>
                    <option value="7">Institute of Geophysics, University of Tehran</option>
                    <option value="12">Union Organization Islamique de France</option>
                    <option value="13">Diyanet İşleri Başkanlığı, Turkey</option>
                  </select>
                </div>

                {/* Juristic School selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Juristic School (Asr Time)
                  </label>
                  <select 
                    value={apiSchool} 
                    onChange={(e) => {
                      const next = e.target.value;
                      setApiSchool(next);
                      localStorage.setItem("deen_api_school", next);
                      if (selectedLocation === "Automatic (GPS Location)") {
                        fetchGpsPrayerTimes({ school: next });
                      }
                    }}
                    className="w-full text-xs font-semibold text-primary-base rounded-xl border border-outline-variant bg-surface-container-low p-2.5 focus:outline-none focus:border-gold-accent"
                  >
                    <option value="0">Standard (Shafi'i, Maliki, Hanbali)</option>
                    <option value="1">Hanafi School</option>
                  </select>
                </div>

                {/* Manual coordinate check or recapture */}
                {selectedLocation === "Automatic (GPS Location)" && (
                  <button
                    type="button"
                    onClick={() => fetchGpsPrayerTimes()}
                    className="w-full py-2 border border-dashed border-[#012d1d]/30 bg-emerald-50/10 hover:bg-emerald-50/20 rounded-xl font-sans text-[10px] font-bold text-emerald-800 transition-colors"
                  >
                    🔄 Recalculate Live Coordinates
                  </button>
                )}
              </div>

              <button 
                onClick={() => {
                  setAdhanModalOpen(false);
                  setPlayMuezzinId(null);
                  if (selectedLocation === "Automatic (GPS Location)") {
                    fetchGpsPrayerTimes();
                  }
                  setNotifyToast("Alarm & calculation configurations successfully updated! 🔔");
                  setTimeout(() => setNotifyToast(null), 2500);
                }}
                className="w-full py-3 bg-primary-base hover:bg-primary-light text-white font-sans font-bold text-xs rounded-full shadow transition-all active:scale-95 text-center block border-none cursor-pointer"
              >
                Save configurations
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
