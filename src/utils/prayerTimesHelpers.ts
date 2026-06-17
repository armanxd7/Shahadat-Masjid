/**
 * Shared prayer times static database and quick calculation utilities
 */

export interface PrayerTimesSet {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  distance: string;
  angle: string;
  compassRotation: number;
}

export const LOCATION_DATA: Record<string, PrayerTimesSet> = {
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

export const parseTimeToMinutes = (timeStr: string): number => {
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

export function getActiveTimes(
  selectedLocation: string,
  customPrayerTimes: PrayerTimesSet | null,
  adminPrayerTimes: Record<string, any>
): PrayerTimesSet {
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
}

export const normalizeTimeCheck = (t: string) => {
  return t.replace(/^0/, "").trim().toUpperCase();
};
