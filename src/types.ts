/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PrayerTime {
  id: string;
  name: string;
  time: string; // e.g. "04:36 AM"
  icon: string; // lucide icon identifier
}

export interface DayHabit {
  id: string;
  name: string;
  completed: boolean;
  type: 'salah' | 'quran' | 'dhikr' | 'charity' | 'custom';
  extraInfo?: string; // e.g., "20 min" or tick checkboxes
}

export interface SavingTransaction {
  id: string;
  amount: number;
  date: string;
  note: string;
}

export interface SavingGoal {
  target: number;
  current: number;
  daysLeft: number;
  transactions: SavingTransaction[];
}

export interface DuaItem {
  id: string;
  title: string;
  arabic: string;
  translation: string;
  urduTranslation?: string;
  category: 'Morning' | 'Evening' | 'After Prayer' | 'Travel';
  phonetic?: string;
}

export interface SurahItem {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  arabicName: string;
  readingNow?: boolean;
}

export type AppScreen = 'splash' | 'home' | 'prayer' | 'habits' | 'quran' | 'duas' | 'planner' | 'profile' | 'aideen' | 'dhikr' | 'settings';
