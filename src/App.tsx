/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, FormEvent, useRef, ErrorInfo, ReactNode, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, PieChart, LayoutGrid, Info, CheckCircle2, Star, 
  Folder as FolderIcon, Image as ImageIcon, Download, Upload, 
  Settings, User, ChevronRight, ChevronLeft, ChevronDown, X, ArrowLeft, Search, Clock,
  Loader2, AlertCircle, Grid, List as ListIcon, Trophy, Flame,
  Zap, Target, Gift, RefreshCw, RefreshCcw, Eye, EyeOff, Check, Lock, Unlock, Tag, TrendingUp,
  Share2, Columns, History, Lightbulb, Coins, Shield, Database, Layout,
  Monitor, Smartphone, Activity, Award, Palette, Gauge, Layers, Moon, Map,
  BookOpen, Puzzle, PlayCircle
} from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';
import LZString from 'lz-string';
import { GoogleGenAI } from "@google/genai";

// --- Types ---

type CoinType = string;
const DEFAULT_DENOMINATIONS = [
  '50p', '£1', '£2', 
  'Farthing', 'Half Penny', 'Penny', 'Threepence', 'Sixpence', 
  'Shilling', 'Florin', 'Half Crown', 'Crown'
];
type Rarity = 'Common' | 'Rare' | 'Very Rare';
type SortOption = 'year' | 'denomination' | 'date' | 'month' | 'added' | 'opened' | 'name';
type GroupOption = 'year' | 'denomination' | 'date' | 'month' | 'none';
type ExploreMode = 'timeline' | 'mindmap' | 'story';

interface Coin {
  id: string;
  name: string;
  year: string;
  type: CoinType;
  rarity: Rarity;
  summary: string;
  image?: string;
  folderId: string;
  dateAdded: number;
  lastOpened: number;
  amountPaid: number;
  tags?: string[];
  mint?: string;
  era?: string;
}

interface Folder {
  id: string;
  name: string;
  isDefault?: boolean;
  isLocked?: boolean;
}

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  type: 'count' | 'value' | 'rarity' | 'type';
  isCompleted: boolean;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  points: number;
  isCompleted: boolean;
  type: 'daily' | 'weekly';
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  unlockedAt?: number;
}

interface TimelineEvent {
  year: string;
  event: string;
  note: string;
}

interface Timeline {
  id: string;
  title: string;
  description: string;
  category: 'Popular' | 'New' | 'All';
  events: TimelineEvent[];
  unlockCriteria?: {
    coins?: number;
    xp?: number;
    timelineId?: string;
  };
}

interface GameMode {
  id: string;
  title: string;
  description: string;
  icon: any;
  isLocked?: boolean;
  unlockCriteria?: string;
}

interface Challenge {
  id: string;
  description: string;
  target: number;
  type: 'count' | 'rarity';
  rarity?: Rarity;
}

interface Era {
  id: string;
  name: string;
  years: [number, number];
  challenges: Challenge[];
  loreCard: string;
  badgeId: string;
}

interface AppVersion {
  version: string;
  date: string;
  notes: string;
}

interface NarrativeChapter {
  id: string;
  title: string;
  description: string;
  requirement: {
    coins?: number;
    rarity?: Rarity;
    yearRange?: [number, number];
  };
}

interface NarrativeStory {
  id: string;
  title: string;
  description: string;
  icon: any;
  chapters: NarrativeChapter[];
  badgeId?: string;
}

interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'error' | 'action' | 'load';
}

interface Profile {
  name: string;
  recoveryCode: string;
  points: number;
  streak: {
    current: number;
    lastLoginDate: number;
  };
  missions: Mission[];
  badges: Badge[];
  lastSpinDate: number;
  unlockedMilestones: string[];
  lastTimelineId?: string;
  timelineProgress: { [timelineId: string]: number };
  timelineStreak: number;
  lastTimelineExplorationDate: number;
  gameModeProgress: {
    eraConquest: { [eraId: string]: { completedChallenges: string[], loreUnlocked: boolean } };
    mintMarkDetective: { discoveredMarks: string[] };
  };
  narrativeProgress: { [storyId: string]: { unlockedChapters: string[], completed: boolean, chapterStories: { [chapterId: string]: string } } };
  preferences: {
    sortBy: SortOption;
    groupBy: GroupOption;
    groupViewEnabled: boolean;
    theme: 'light' | 'dark' | 'system' | 'paper' | 'glass' | 'wood' | 'metal' | 'fabric';
    compactUI: boolean;
    showBottomMenu: boolean;
    textMode: boolean;
    autoRemoveBackground: boolean;
    purchaseMode: boolean;
    showPrice: boolean;
    quickAddMode: boolean;
    performanceMode: boolean;
    experimentalFeatures: boolean;
    focusMode: boolean;
    nightBonusEnabled: boolean;
    showCollectorCard: boolean;
    showTopSummary: boolean;
    showRankSystem: boolean;
    showProgressCard: boolean;
    debugMode: boolean;
    ambientMotionEnabled: boolean;
    showFolder: boolean;
    fixedPriceMode: boolean;
    customDenominations: string[];
    denominationPrices: { [key: string]: number };
  };
}

const TARGET_PER_TYPE = 20;

const LEVELS = [
  { name: 'Beginner', minPoints: 0 },
  { name: 'Collector', minPoints: 100 },
  { name: 'Expert', minPoints: 500 },
  { name: 'Master', minPoints: 2000 },
];

const RARITY_POINTS = {
  'Common': 10,
  'Rare': 50,
  'Very Rare': 100,
};

const APP_VERSION_HISTORY: AppVersion[] = [
  { 
    version: '2.1.0', 
    date: '2026-04-01', 
    notes: 'Introduced the Timeline Hub with 6 historical and fictional coin stories. Added App Version History to settings.' 
  },
  { 
    version: '2.0.5', 
    date: '2026-03-25', 
    notes: 'Improved background removal AI and added support for custom folder icons.' 
  },
  { 
    version: '2.0.0', 
    date: '2026-03-10', 
    notes: 'Major redesign with new Glass and Metal themes. Introduced the Rank System and XP rewards.' 
  },
  { 
    version: '1.5.0', 
    date: '2026-02-15', 
    notes: 'Added data import/export functionality and local backup system.' 
  },
  { 
    version: '1.0.0', 
    date: '2026-01-01', 
    notes: 'Initial release of the Coin Collector app.' 
  }
];

const TIMELINES: Timeline[] = [
  {
    id: 'numismatic-journey',
    title: 'Numismatic Journey',
    description: 'The history of coin collecting from ancient kings to modern enthusiasts.',
    category: 'Popular',
    events: [
      { year: '600 BC', event: 'First Lydian Coins', note: 'The birth of standardized coinage in Lydia (modern Turkey).' },
      { year: '1300s', event: 'Petrarch\'s Collection', note: 'The famous poet Petrarch becomes one of the first recorded coin collectors.' },
      { year: '1858', event: 'American Numismatic Society', note: 'Founded in New York, marking a new era for organized collecting.' },
      { year: '2026', event: 'Digital Numismatics', note: 'The integration of blockchain and AI into the world of coin collecting.' }
    ]
  },
  {
    id: 'coin-evolution',
    title: 'Coin Evolution',
    description: 'Witness the transformation of currency from raw metal to precision engineering.',
    category: 'Popular',
    events: [
      { year: '7th Century BC', event: 'Electrum Coins', note: 'Early coins made from a natural alloy of gold and silver.' },
      { year: '1792', event: 'US Mint Established', note: 'Standardized modern minting processes begin in the United States.' },
      { year: '1965', event: 'Clad Coinage', note: 'Silver is removed from common circulation coins due to rising costs.' },
      { year: '2024', event: 'Smart Coins', note: 'Coins with embedded NFC chips for authenticity verification.' }
    ]
  },
  {
    id: 'coin-conspiracy',
    title: 'Coin Conspiracy',
    description: 'Uncover the mysteries and legends behind the world\'s most elusive coins.',
    category: 'New',
    events: [
      { year: '1933', event: 'The Double Eagle Mystery', note: 'The gold coin that was never supposed to exist, yet some escaped the mint.' },
      { year: '1943', event: 'Copper Penny Legend', note: 'A few copper pennies were accidentally struck during WWII when steel was the norm.' },
      { year: '1974', event: 'The Aluminum Cent', note: 'A prototype cent that was never released, with most being destroyed.' }
    ],
    unlockCriteria: { coins: 5 }
  },
  {
    id: 'time-loop-collector',
    title: 'Time Loop Collector',
    description: 'A fictional journey of a collector stuck in a temporal loop of rare finds.',
    category: 'New',
    events: [
      { year: '2026', event: 'The First Loop', note: 'You find a coin that shouldn\'t exist yet.' },
      { year: '1926', event: 'The Echo', note: 'The same coin appears in a vintage collection, but older.' },
      { year: '2126', event: 'The Resolution', note: 'The loop closes as you return the coin to its origin.' }
    ],
    unlockCriteria: { xp: 200 }
  },
  {
    id: 'design-evolution',
    title: 'Design Evolution Timeline',
    description: 'Explore the artistic shift from classical portraits to abstract modernism.',
    category: 'All',
    events: [
      { year: 'Ancient Greece', event: 'Archaic Style', note: 'Focus on symbolic representations and deities.' },
      { year: 'Renaissance', event: 'Realism Returns', note: 'Detailed portraits of monarchs and intricate heraldry.' },
      { year: 'Art Nouveau', event: 'Flowing Lines', note: 'The early 20th century brings organic shapes to coin design.' },
      { year: 'Modern Era', event: 'Minimalism', note: 'Clean lines and abstract concepts dominate modern commemoratives.' }
    ],
    unlockCriteria: { timelineId: 'numismatic-journey' }
  },
  {
    id: 'mint-mark-detective',
    title: 'Mint Mark Detective',
    description: 'Learn to decode the secret language of mint marks across the globe.',
    category: 'All',
    events: [
      { year: 'Ancient Rome', event: 'Officina Marks', note: 'Early workshops identify their output with specific symbols.' },
      { year: '1838', event: 'New Orleans Mint', note: 'The "O" mint mark becomes a symbol of Southern numismatics.' },
      { year: '1968', event: 'San Francisco Returns', note: 'The "S" mark returns to US proof sets after a brief hiatus.' }
    ]
  }
];

const GAME_MODES: GameMode[] = [
  { id: 'era-conquest', title: 'Era Conquest Mode', description: 'Conquer history by collecting coins from every era.', icon: History },
  { id: 'timeline-explorer', title: 'Timeline Explorer', description: 'Journey through historical and fictional coin stories.', icon: Clock },
  { id: 'timeline-puzzle', title: 'Timeline Puzzle', description: 'Reconstruct broken timelines to earn massive XP rewards.', icon: Puzzle },
  { id: 'mint-mark-detective', title: 'Mint Mark Detective', description: 'Decode the secret language of mint marks.', icon: Search },
  { id: 'my-coin-story', title: 'My Coin Story', description: 'Generate a personal timeline from your own collection.', icon: User },
];

const NARRATIVE_STORIES: NarrativeStory[] = [
  {
    id: 'coin-journey',
    title: 'Coin Journey',
    description: 'An era-based narrative following the evolution of currency.',
    icon: Map,
    chapters: [
      { id: 'cj-1', title: 'The Victorian Dawn', description: 'Begin your journey with a coin from the 1800s.', requirement: { yearRange: [1800, 1899], coins: 1 } },
      { id: 'cj-2', title: 'The Early 20th Century', description: 'Expand your collection with coins from 1900-1919.', requirement: { yearRange: [1900, 1919], coins: 3 } },
      { id: 'cj-3', title: 'The Roaring Twenties', description: 'Collect coins from the 1920s.', requirement: { yearRange: [1920, 1929], coins: 5 } },
      { id: 'cj-4', title: 'The Modern Era', description: 'Complete the journey with modern coins.', requirement: { yearRange: [1930, 2026], coins: 10 } },
    ],
    badgeId: 'badge-coin-journey'
  },
  {
    id: 'mystery-trail',
    title: 'Mystery Trail',
    description: 'Follow the clues hidden in your coins to reveal the next chapter.',
    icon: Search,
    chapters: [
      { id: 'mt-1', title: 'The First Clue', description: 'Find a Rare coin to start the trail.', requirement: { rarity: 'Rare', coins: 1 } },
      { id: 'mt-2', title: 'The Hidden Mark', description: 'Collect 5 coins to reveal the secret mint mark.', requirement: { coins: 5 } },
      { id: 'mt-3', title: 'The Final Secret', description: 'Find a Very Rare coin to solve the mystery.', requirement: { rarity: 'Very Rare', coins: 1 } },
    ],
    badgeId: 'badge-mystery-trail'
  },
  {
    id: 'time-traveler',
    title: 'Time Traveler',
    description: 'Experience major historical events through the coins of that time.',
    icon: Clock,
    chapters: [
      { id: 'tt-1', title: 'The Great War', description: 'Collect a coin from 1914-1918.', requirement: { yearRange: [1914, 1918], coins: 1 } },
      { id: 'tt-2', title: 'The Moon Landing', description: 'Collect a coin from 1969.', requirement: { yearRange: [1969, 1969], coins: 1 } },
      { id: 'tt-3', title: 'The New Millennium', description: 'Collect a coin from 2000.', requirement: { yearRange: [2000, 2000], coins: 1 } },
    ],
    badgeId: 'badge-time-traveler'
  },
  {
    id: 'collector-diary',
    title: 'Collector Diary',
    description: 'Your personal story as a collector, one coin at a time.',
    icon: BookOpen,
    chapters: [
      { id: 'cd-1', title: 'The First Find', description: 'Add your first coin to start your diary.', requirement: { coins: 1 } },
      { id: 'cd-2', title: 'The Growing Collection', description: 'Reach 10 coins in your collection.', requirement: { coins: 10 } },
      { id: 'cd-3', title: 'The Master Collector', description: 'Reach 50 coins to complete your diary.', requirement: { coins: 50 } },
    ],
    badgeId: 'badge-collector-diary'
  }
];

const ERAS: Era[] = [
  {
    id: '1800s',
    name: 'The Victorian Era',
    years: [1800, 1899],
    challenges: [
      { id: 'v-1', description: 'Collect 1 coin from the 1800s', target: 1, type: 'count' },
      { id: 'v-2', description: 'Collect 3 coins from the 1800s', target: 3, type: 'count' },
      { id: 'v-3', description: 'Find a Rare 1800s coin', target: 1, type: 'rarity', rarity: 'Rare' }
    ],
    loreCard: 'The 19th century saw the transition from hand-struck to machine-made coins, with Queen Victoria\'s long reign dominating the numismatic landscape.',
    badgeId: 'era-1800s'
  },
  {
    id: '1900s',
    name: 'Early 20th Century',
    years: [1900, 1919],
    challenges: [
      { id: 'e-1', description: 'Collect 2 coins from 1900-1919', target: 2, type: 'count' },
      { id: 'e-2', description: 'Find a Very Rare early 1900s coin', target: 1, type: 'rarity', rarity: 'Very Rare' }
    ],
    loreCard: 'The Edwardian era and WWI brought changes in metal composition and design, reflecting the global shifts of the time.',
    badgeId: 'era-1900s'
  },
  {
    id: '1920s',
    name: 'The Roaring Twenties',
    years: [1920, 1929],
    challenges: [
      { id: 't-1', description: 'Collect 3 coins from the 1920s', target: 3, type: 'count' },
      { id: 't-2', description: 'Collect 5 coins from the 1920s', target: 5, type: 'count' }
    ],
    loreCard: 'Post-war recovery led to a boom in trade and a high demand for new coinage, featuring iconic designs of the 1920s.',
    badgeId: 'era-1920s'
  },
  {
    id: 'modern',
    name: 'Modern Age',
    years: [1930, 2026],
    challenges: [
      { id: 'm-1', description: 'Collect 10 modern coins', target: 10, type: 'count' },
      { id: 'm-2', description: 'Collect 20 modern coins', target: 20, type: 'count' },
      { id: 'm-3', description: 'Find 5 Rare modern coins', target: 5, type: 'rarity', rarity: 'Rare' }
    ],
    loreCard: 'The modern era is defined by decimalization and the introduction of complex commemorative designs.',
    badgeId: 'era-modern'
  }
];

const CLUE_MAP: Record<string, string> = {
  'Kew Gardens': 'The Great Pagoda holds a secret... look for the 2009 50p.',
  'Isaac Newton': 'Gravity pulls us towards the 2017 50p... check the year.',
  'Battle of Hastings': '1066 is the key to the 2016 50p... find the arrow.',
  'Paddington': 'A bear at the station... look for the 2018 50p.',
  'Sherlock Holmes': 'Elementary! The 2019 50p hides a mystery.',
};

const isNightTime = () => {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 6; // 8 PM to 6 AM
};

const DEFAULT_MISSIONS: Mission[] = [
  { id: 'daily-check', title: 'Daily Check-in', description: 'Open the app today', points: 5, isCompleted: false, type: 'daily' },
  { id: 'add-coin', title: 'New Addition', description: 'Add a coin to your collection', points: 15, isCompleted: false, type: 'daily' },
  { id: 'view-stats', title: 'Data Analyst', description: 'Check your collection stats', points: 5, isCompleted: false, type: 'daily' },
];

const DEFAULT_BADGES: Badge[] = [
  { id: 'first-coin', name: 'First Coin', description: 'Added your first coin', icon: 'Trophy', isUnlocked: false },
  { id: 'rare-find', name: 'Rare Find', description: 'Added a Rare or Very Rare coin', icon: 'Star', isUnlocked: false },
  { id: 'collector-10', name: 'Collector', description: 'Collected 10 coins', icon: 'FolderIcon', isUnlocked: false },
  { id: 'expert-50', name: 'Expert', description: 'Collected 50 coins', icon: 'Zap', isUnlocked: false },
  { id: 'master-100', name: 'Master', description: 'Collected 100 coins', icon: 'Trophy', isUnlocked: false },
  { id: 'streak-7', name: 'Week Streak', description: 'Maintained a 7-day streak', icon: 'Flame', isUnlocked: false },
  { id: 'mint-master', name: 'Mint Master', description: 'Explored 50 timeline events', icon: 'Award', isUnlocked: false },
  { id: 'history-explorer', name: 'History Explorer', description: 'Completed 3 full timelines', icon: 'History', isUnlocked: false },
  { id: 'badge-coin-journey', name: 'Time Traveler', description: 'Completed the Coin Journey story', icon: 'Map', isUnlocked: false },
  { id: 'badge-mystery-trail', name: 'Detective', description: 'Solved the Mystery Trail', icon: 'Search', isUnlocked: false },
  { id: 'badge-time-traveler', name: 'Chrononaut', description: 'Traveled through all Time Traveler chapters', icon: 'Clock', isUnlocked: false },
  { id: 'badge-collector-diary', name: 'Storyteller', description: 'Completed your personal Collector Diary', icon: 'BookOpen', isUnlocked: false },
  { id: 'mind-map-explorer', name: 'Mind Map Explorer', description: 'Explored 20 collection nodes', icon: 'Map', isUnlocked: false },
];

// --- Error Boundary ---

interface ErrorBoundaryProps {
  children: ReactNode;
  onExport: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App Error:", error, errorInfo);
  }

  handleSafeMode = () => {
    localStorage.setItem('coin-safe-mode', 'true');
    window.location.reload();
  };

  render() {
    const self = this as any;
    if (self.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-[2rem] flex items-center justify-center text-red-600 mb-6 mx-auto">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-3xl font-black text-red-900 mb-2 tracking-tight">App Encountered an Issue</h2>
          <p className="text-red-700 mb-8 max-w-md mx-auto font-medium">
            Something went wrong while loading your collection. You can try reloading or enter Safe Mode to recover your data.
          </p>
          
          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-red-200 active:scale-95 transition-all"
            >
              <RefreshCw size={20} /> Try Reloading
            </button>
            
            <button
              onClick={this.handleSafeMode}
              className="bg-white text-red-600 border-2 border-red-100 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Zap size={20} /> Launch Safe Mode
            </button>

            <button
              onClick={self.props.onExport}
              className="mt-4 text-red-500 font-bold flex items-center justify-center gap-2 hover:underline"
            >
              <Download size={18} /> Export Data to Safety
            </button>
          </div>
        </div>
      );
    }
    return self.props.children;
  }
}

// --- Storage Helper ---

const storage = {
  save: (key: string, data: any) => {
    try {
      const json = JSON.stringify(data);
      const compressed = LZString.compressToUTF16(json);
      localStorage.setItem(key, compressed);
    } catch (e) {
      console.error('Failed to save data:', e);
    }
  },
  load: (key: string) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      // Try decompressing
      const decompressed = LZString.decompressFromUTF16(raw);
      if (decompressed) return JSON.parse(decompressed);
      // Fallback to plain JSON
      return JSON.parse(raw);
    } catch (e) {
      try {
        return JSON.parse(raw);
      } catch (e2) {
        console.error('Failed to load data:', e2);
        return null;
      }
    }
  }
};

// --- Main App ---

// --- Components ---

interface MindMapProps {
  coins: Coin[];
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  openCoin: (coin: Coin) => void;
  addLog: (msg: string, type: string) => void;
  setActiveTab: (tab: any) => void;
  setExpandedNodes: (nodes: Set<string>) => void;
}

const MindMap = ({ coins, expandedNodes, toggleNode, openCoin, addLog, setActiveTab, setExpandedNodes }: MindMapProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    addLog('Mind Map: Component mounted', 'system');
    const timer = setTimeout(() => {
      setIsLoading(false);
      addLog('Mind Map: Loading complete', 'system');
    }, 800);
    return () => {
      clearTimeout(timer);
      addLog('Mind Map: Component unmounted', 'system');
    };
  }, []);

  // Grouping logic for the tree
  const treeData = useMemo(() => {
    try {
      if (coins.length === 0) {
        addLog('Mind Map: No coins found for tree generation', 'info');
        return null;
      }
      addLog(`Mind Map: Generating tree for ${coins.length} coins`, 'system');
      const root = { id: 'root', label: 'Collection Root', children: [] as any[], level: 0 };
      
      const eras = Array.from(new Set(coins.map(c => c.era || 'Unknown Era'))).sort();
      
      eras.forEach(era => {
        const eraNode = { id: `era-${era}`, label: era, children: [] as any[], level: 1 };
        const eraCoins = coins.filter(c => (c.era || 'Unknown Era') === era);
        
        const years = Array.from(new Set(eraCoins.map(c => c.year))).sort();
        years.forEach(year => {
          const yearNode = { id: `era-${era}-year-${year}`, label: year, children: [] as any[], level: 2 };
          const yearCoins = eraCoins.filter(c => c.year === year);
          
          const mints = Array.from(new Set(yearCoins.map(c => c.mint || 'Unknown Mint')));
          mints.forEach(mint => {
            const mintNode = { id: `era-${era}-year-${year}-mint-${mint}`, label: mint, children: [] as any[], level: 3 };
            const mintCoins = yearCoins.filter(c => (c.mint || 'Unknown Mint') === mint);
            
            const types = Array.from(new Set(mintCoins.map(c => c.type)));
            types.forEach(type => {
              const typeNode = { id: `era-${era}-year-${year}-mint-${mint}-type-${type}`, label: type, children: [] as any[], level: 4 };
              const typeCoins = mintCoins.filter(c => c.type === type);
              
              typeCoins.forEach(coin => {
                typeNode.children.push({ id: coin.id, label: coin.name, coin, level: 5 });
              });
              
              mintNode.children.push(typeNode);
            });
            
            yearNode.children.push(mintNode);
          });
          
          eraNode.children.push(yearNode);
        });
        
        root.children.push(eraNode);
      });
      
      return root;
    } catch (err) {
      console.error('Mind Map Error:', err);
      addLog(`Mind Map Render Error: ${err instanceof Error ? err.message : String(err)}`, 'error');
      return null;
    }
  }, [coins]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30 dark:bg-gray-900/30 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/50 p-6">
        <Loader2 size={32} className="text-blue-600 animate-spin mb-4" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Generating Map...</p>
      </div>
    );
  }

  if (!treeData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30 dark:bg-gray-900/30 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/50 p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-6 text-gray-300">
          <Map size={32} />
        </div>
        <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 mb-2">No Data Available</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-8 max-w-[200px] leading-relaxed">Add coins to your collection to see them visualized in the Mind Map.</p>
        <button 
          onClick={() => setActiveTab('collection')}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
        >
          Add Coins
        </button>
      </div>
    );
  }

  const renderTreeNode = (node: any) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isCoin = !!node.coin;

    return (
      <div key={node.id} className="flex flex-col">
        <motion.div 
          layout
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`group flex items-center gap-3 py-2 px-4 rounded-xl transition-all cursor-pointer relative ${
            isCoin 
              ? 'ios-surface' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
          }`}
          style={{ marginLeft: `${node.level * 20}px` }}
          onClick={() => {
            if (isCoin) {
              openCoin(node.coin);
            } else if (hasChildren) {
              toggleNode(node.id);
            }
          }}
        >
          {/* Vertical Line for hierarchy */}
          {node.level > 0 && (
            <div className="absolute -left-3 top-0 bottom-0 w-[1px] bg-gray-200 dark:bg-gray-800" />
          )}
          {/* Horizontal branch line */}
          {node.level > 0 && (
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-[1px] bg-gray-200 dark:bg-gray-800" />
          )}

          {hasChildren && (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              className="text-gray-400 group-hover:text-blue-500 transition-colors"
            >
              <ChevronRight size={12} />
            </motion.div>
          )}
          
          {!hasChildren && !isCoin && <div className="w-3" />}

          <div className="flex flex-col">
            <span className={`text-sm ${isCoin ? 'font-bold text-gray-900 dark:text-gray-100' : 'font-black uppercase tracking-widest text-[9px] text-gray-400'}`}>
              {node.label}
            </span>
            {isCoin && node.coin.rarity !== 'Common' && (
              <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">
                {node.coin.rarity}
              </span>
            )}
          </div>

          {hasChildren && !isExpanded && (
            <span className="ml-auto text-[8px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest">
              {node.children.length}
            </span>
          )}
        </motion.div>
        
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {node.children.map((child: any) => renderTreeNode(child))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30 dark:bg-gray-900/30 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/50 inner-glow p-6">
      {/* Header / Progress */}
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tree Progress</span>
          <div className="flex items-center gap-3 mt-1">
            <div className="h-1 w-24 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((coins.length / 50) * 100, 100)}%` }}
                className="h-full bg-blue-500"
              />
            </div>
            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400">{coins.length}/50 Nodes</span>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setExpandedNodes(new Set(['root']))}
          className="text-[9px] font-black text-gray-400 hover:text-blue-500 uppercase tracking-widest flex items-center gap-1.5"
        >
          <RefreshCw size={10} /> Reset
        </motion.button>
      </div>

      {/* Tree Canvas */}
      <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
        <div className="space-y-1">
          {renderTreeNode(treeData)}
        </div>
      </div>
    </div>
  );
};

const AmbientBackground = ({ enabled }: { enabled: boolean }) => {
  if (!enabled) return null;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none opacity-30 dark:opacity-10">
      <motion.div
        animate={{
          x: [0, 50, -50, 0],
          y: [0, 30, -30, 0],
          scale: [1, 1.05, 0.95, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-amber-500/10 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{
          x: [0, -40, 40, 0],
          y: [0, -20, 20, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -bottom-1/4 -right-1/4 w-[150%] h-[150%] bg-gradient-to-tl from-emerald-500/10 via-blue-500/10 to-pink-500/10 rounded-full blur-[120px]"
      />
    </div>
  );
};

export default function App() {
  // --- State ---
  
  const [isSafeMode, setIsSafeMode] = useState(() => {
    return localStorage.getItem('coin-safe-mode') === 'true';
  });

  const [isAppReady, setIsAppReady] = useState(false);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);

  const [coins, setCoins] = useState<Coin[]>(() => {
    const key = isSafeMode ? 'coin-backup-collection' : 'coin-collection';
    const saved = storage.load(key);
    return saved || [];
  });

  const [folders, setFolders] = useState<Folder[]>(() => {
    const key = isSafeMode ? 'coin-backup-folders' : 'coin-folders';
    const saved = storage.load(key);
    if (saved) return saved;
    return [{ id: 'purchased', name: 'Coins Purchased', isDefault: true }];
  });

  const [profile, setProfile] = useState<Profile>(() => {
    const key = isSafeMode ? 'coin-backup-profile' : 'coin-profile';
    const saved = storage.load(key);
    if (saved) {
      const parsed = saved;
      // Migration for new fields
      return {
        ...parsed,
        points: parsed.points ?? 0,
        streak: parsed.streak ?? { current: 0, lastLoginDate: 0 },
        missions: parsed.missions ?? DEFAULT_MISSIONS,
        badges: parsed.badges ?? DEFAULT_BADGES,
        lastSpinDate: parsed.lastSpinDate ?? 0,
        unlockedMilestones: parsed.unlockedMilestones ?? [],
        lastTimelineId: parsed.lastTimelineId,
        lastStoryItemId: parsed.lastStoryItemId,
        timelineProgress: parsed.timelineProgress ?? {},
        timelineStreak: parsed.timelineStreak ?? 0,
        lastTimelineExplorationDate: parsed.lastTimelineExplorationDate ?? 0,
        gameModeProgress: parsed.gameModeProgress ?? {
          eraConquest: {},
          mintMarkDetective: { discoveredMarks: [] }
        },
        narrativeProgress: parsed.narrativeProgress ?? {},
        preferences: {
          sortBy: parsed.preferences?.sortBy ?? 'added',
          groupBy: parsed.preferences?.groupBy ?? 'none',
          groupViewEnabled: parsed.preferences?.groupViewEnabled ?? false,
          theme: parsed.preferences?.theme ?? 'system',
          compactUI: parsed.preferences?.compactUI ?? false,
          showBottomMenu: parsed.preferences?.showBottomMenu ?? true,
          textMode: parsed.preferences?.textMode ?? false,
          autoRemoveBackground: parsed.preferences?.autoRemoveBackground ?? true,
          purchaseMode: parsed.preferences?.purchaseMode ?? false,
          showPrice: parsed.preferences?.showPrice ?? true,
          quickAddMode: parsed.preferences?.quickAddMode ?? false,
          performanceMode: parsed.preferences?.performanceMode ?? false,
          experimentalFeatures: parsed.preferences?.experimentalFeatures ?? false,
          focusMode: parsed.preferences?.focusMode ?? false,
          nightBonusEnabled: parsed.preferences?.nightBonusEnabled ?? true,
          showCollectorCard: parsed.preferences?.showCollectorCard ?? true,
          showTopSummary: parsed.preferences?.showTopSummary ?? true,
          showRankSystem: parsed.preferences?.showRankSystem ?? true,
          showProgressCard: parsed.preferences?.showProgressCard ?? true,
          debugMode: parsed.preferences?.debugMode ?? false,
          ambientMotionEnabled: parsed.preferences?.ambientMotionEnabled ?? true,
          showFolder: parsed.preferences?.showFolder ?? true,
          fixedPriceMode: parsed.preferences?.fixedPriceMode ?? false,
          customDenominations: parsed.preferences?.customDenominations ?? [],
          denominationPrices: parsed.preferences?.denominationPrices ?? { 
            '50p': 0.5, '£1': 1.0, '£2': 2.0,
            'Farthing': 0.01, 'Half Penny': 0.02, 'Penny': 0.05,
            'Threepence': 0.10, 'Sixpence': 0.20, 'Shilling': 0.50,
            'Florin': 1.00, 'Half Crown': 1.25, 'Crown': 2.50
          },
        }
      };
    }
    return {
      name: 'Collector',
      recoveryCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
      points: 0,
      streak: { current: 0, lastLoginDate: 0 },
      missions: DEFAULT_MISSIONS,
      badges: DEFAULT_BADGES,
      lastSpinDate: 0,
      unlockedMilestones: [],
      timelineProgress: {},
      timelineStreak: 0,
      lastTimelineExplorationDate: 0,
      gameModeProgress: {
        eraConquest: {},
        mintMarkDetective: { discoveredMarks: [] }
      },
      narrativeProgress: {},
      preferences: { 
        sortBy: 'added',
        groupBy: 'none',
        groupViewEnabled: false,
        theme: 'system',
        compactUI: false,
        showBottomMenu: true,
        textMode: false,
        autoRemoveBackground: true,
        purchaseMode: false,
        showPrice: true,
        quickAddMode: false,
        performanceMode: false,
        experimentalFeatures: false,
        focusMode: false,
        nightBonusEnabled: true,
        showCollectorCard: true,
        showTopSummary: true,
        showRankSystem: true,
        showProgressCard: true,
        debugMode: false,
        ambientMotionEnabled: true,
        showFolder: true,
        fixedPriceMode: false,
        customDenominations: [],
        denominationPrices: { 
          '50p': 0.5, '£1': 1.0, '£2': 2.0,
          'Farthing': 0.01, 'Half Penny': 0.02, 'Penny': 0.05,
          'Threepence': 0.10, 'Sixpence': 0.20, 'Shilling': 0.50,
          'Florin': 1.00, 'Half Crown': 1.25, 'Crown': 2.50
        },
      }
    };
  });
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const [activeTab, setActiveTab] = useState<'collection' | 'library' | 'explore' | 'stats' | 'profile'>('collection');
  const [activeGameMode, setActiveGameMode] = useState<string | null>(null);
  const [activeNarrativeStoryId, setActiveNarrativeStoryId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [unlockedFolders, setUnlockedFolders] = useState<string[]>([]);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showSpinModal, setShowSpinModal] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all');
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<Coin | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [xpGain, setXpGain] = useState<number | null>(null);
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 400);
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('coin-logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [showLogsModal, setShowLogsModal] = useState(false);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    if (!profileRef.current.preferences.debugMode) return;
    
    setLogs(prev => {
      const newLog: LogEntry = {
        id: Math.random().toString(36).substring(2, 10),
        timestamp: Date.now(),
        message,
        type
      };
      const updated = [newLog, ...prev];
      return updated.slice(0, 200);
    });
  };

  useEffect(() => {
    localStorage.setItem('coin-logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    const handleError = (event: ErrorEvent) => {
      addLog(`System Error: ${event.message}`, 'error');
    };
    window.addEventListener('error', handleError);

    // Simulate initial loading for perceived speed with skeletons
    addLog('App initializing...', 'load');
    const timer = setTimeout(() => {
      setIsAppReady(true);
      addLog('App ready - Data loaded successfully', 'load');
    }, 800);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('error', handleError);
      clearTimeout(timer);
    };
  }, []);

  // Preload images for recently viewed coins
  useEffect(() => {
    recentlyViewedIds.forEach(id => {
      const coin = coins.find(c => c.id === id);
      if (coin?.image) {
        const img = new Image();
        img.src = coin.image;
      }
    });
  }, [recentlyViewedIds, coins]);

  const isCompact = useMemo(() => {
    // Automatically use compact layout for small screens (iPhone mini threshold)
    if (windowWidth < 380) return true;
    return profile.preferences.compactUI;
  }, [windowWidth, profile.preferences.compactUI]);

  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [inputModal, setInputModal] = useState<{ title: string; placeholder: string; onConfirm: (value: string) => void } | null>(null);
  const [modalInputValue, setModalInputValue] = useState('');
  const [compareCoins, setCompareCoins] = useState<string[]>([]);
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [expandedEventIdx, setExpandedEventIdx] = useState<number | null>(null);
  const [exploreMode, setExploreMode] = useState<ExploreMode>(() => {
    const saved = localStorage.getItem('exploreMode');
    return (saved as ExploreMode) || 'timeline';
  });

  useEffect(() => {
    if (activeTab === 'explore') {
      addLog(`Screen loaded: Explore (${exploreMode})`, 'load');
    } else {
      addLog(`Screen loaded: ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`, 'load');
    }
  }, [activeTab, exploreMode]);
  const [mindMapZoom, setMindMapZoom] = useState(1);
  const [mindMapOffset, setMindMapOffset] = useState({ x: 0, y: 0 });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [selectedCoinIds, setSelectedCoinIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [activeBulkMenu, setActiveBulkMenu] = useState<'move' | 'type' | null>(null);
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem('exploreMode', exploreMode);
  }, [exploreMode]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const generateMyCoinStory = useMemo((): Timeline => {
    const events: TimelineEvent[] = [];
    
    if (coins.length === 0) {
      return {
        id: 'my-coin-story',
        title: 'My Coin Story',
        description: 'Your personal journey as a collector. Add coins to start your story.',
        category: 'Popular',
        events: [
          { year: 'Today', event: 'The Blank Page', note: 'Start your collection to begin your story!' }
        ]
      };
    }

    // 1. First coin added
    const sortedByDate = [...coins].sort((a, b) => a.dateAdded - b.dateAdded);
    const firstCoin = sortedByDate[0];
    events.push({
      year: new Date(firstCoin.dateAdded).getFullYear().toString(),
      event: `The Journey Begins: ${firstCoin.name}`,
      note: `You added your very first coin to the collection. A ${firstCoin.rarity} ${firstCoin.type} find!`
    });

    // 2. Rare coins
    const rareCoins = coins.filter(c => c.rarity === 'Rare' || c.rarity === 'Very Rare');
    rareCoins.forEach(coin => {
      events.push({
        year: new Date(coin.dateAdded).getFullYear().toString(),
        event: `Rare Find: ${coin.name}`,
        note: `A significant discovery! This ${coin.rarity} coin was added to your collection.`
      });
    });

    // 3. Most collected type
    const typeCounts = coins.reduce((acc, coin) => {
      acc[coin.type] = (acc[coin.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCollectedType = (Object.entries(typeCounts) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
    if (mostCollectedType && mostCollectedType[1] >= 5) {
      events.push({
        year: 'Milestone',
        event: `${mostCollectedType[0]} Specialist`,
        note: `You've collected ${mostCollectedType[1]} ${mostCollectedType[0]} coins. You're becoming an expert in this denomination!`
      });
    }

    // 4. Monthly milestones
    const months = coins.reduce((acc, coin) => {
      const month = new Date(coin.dateAdded).toLocaleString('default', { month: 'long', year: 'numeric' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    (Object.entries(months) as [string, number][]).forEach(([month, count]) => {
      if (count >= 5) {
        events.push({
          year: month,
          event: 'Productive Month',
          note: `You added ${count} coins in ${month}. A truly busy time for your collection!`
        });
      }
    });

    // 5. Gamification Milestones
    if (coins.length >= 10) {
      events.push({
        year: 'Achievement',
        event: 'The Decadent Collector',
        note: 'Milestone reached: 10 coins in your collection! You are now a recognized Collector.'
      });
    }
    if (coins.length >= 50) {
      events.push({
        year: 'Achievement',
        event: 'Half-Century Mark',
        note: 'Milestone reached: 50 coins in your collection! Your expertise is growing.'
      });
    }

    return {
      id: 'my-coin-story',
      title: 'My Coin Story',
      description: 'Your personal journey as a collector, generated from your collection.',
      category: 'Popular',
      events: events
    };
  }, [coins]);

  const allAvailableTimelines = useMemo(() => {
    return [generateMyCoinStory, ...TIMELINES];
  }, [generateMyCoinStory]);

  const [showCollectorCard, setShowCollectorCard] = useState(false);
  const [discoveryTip, setDiscoveryTip] = useState('');
  const [showFusionModal, setShowFusionModal] = useState(false);
  const [fusionSelection, setFusionSelection] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>(['display']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const updateTimelineProgress = (timelineId: string, eventIndex: number) => {
    const isNewUnlock = (profile.timelineProgress[timelineId] || 0) < eventIndex;
    const pointsEarned = isNewUnlock ? 10 : 0;
    
    // Streak logic
    const today = new Date().setHours(0, 0, 0, 0);
    const lastExploration = profile.lastTimelineExplorationDate || 0;
    let newStreak = profile.timelineStreak || 0;
    
    if (lastExploration !== today) {
      if (lastExploration === today - 86400000) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    setProfile(prev => {
      const newProgress = {
        ...prev.timelineProgress,
        [timelineId]: Math.max(prev.timelineProgress[timelineId] || 0, eventIndex)
      };
      
      // Check for badges
      let updatedBadges = [...prev.badges];
      const totalEventsExplored = (Object.values(newProgress) as number[]).reduce((a, b) => a + b, 0);
      const completedTimelines = allAvailableTimelines.filter(t => (newProgress[t.id] as number || 0) >= t.events.length - 1).length;

      if (totalEventsExplored >= 50 && !updatedBadges.find(b => b.id === 'mint-master')?.isUnlocked) {
        updatedBadges = updatedBadges.map(b => b.id === 'mint-master' ? { ...b, isUnlocked: true, unlockedAt: Date.now() } : b);
        setFeedback({ message: 'Badge Unlocked: Mint Master!', type: 'success' });
      }
      if (completedTimelines >= 3 && !updatedBadges.find(b => b.id === 'history-explorer')?.isUnlocked) {
        updatedBadges = updatedBadges.map(b => b.id === 'history-explorer' ? { ...b, isUnlocked: true, unlockedAt: Date.now() } : b);
        setFeedback({ message: 'Badge Unlocked: History Explorer!', type: 'success' });
      }

      return {
        ...prev,
        points: prev.points + pointsEarned,
        lastTimelineId: timelineId,
        timelineProgress: newProgress,
        timelineStreak: newStreak,
        lastTimelineExplorationDate: today,
        badges: updatedBadges
      };
    });
    
    if (pointsEarned > 0) {
      setFeedback({ message: `+${pointsEarned} XP for exploring!`, type: 'success' });
    }
  };  const renderTimelineHub = () => {
    const popularTimelines = allAvailableTimelines.filter(t => t.category === 'Popular');
    const newTimelines = allAvailableTimelines.filter(t => t.category === 'New');
    const allTimelines = allAvailableTimelines;

    const continueExploring = profile.lastTimelineId 
      ? allAvailableTimelines.find(t => t.id === profile.lastTimelineId) 
      : null;

    const isTimelineLocked = (timeline: Timeline) => {
      if (!timeline.unlockCriteria) return false;
      const { coins: reqCoins, xp: reqXp, timelineId: reqTimelineId } = timeline.unlockCriteria;
      
      if (reqCoins && coins.length < reqCoins) return true;
      if (reqXp && profile.points < reqXp) return true;
      if (reqTimelineId) {
        const targetTimeline = allAvailableTimelines.find(t => t.id === reqTimelineId);
        const progress = profile.timelineProgress[reqTimelineId] || 0;
        if (!targetTimeline || progress < targetTimeline.events.length - 1) return true;
      }
      return false;
    };

    const getUnlockMessage = (timeline: Timeline) => {
      if (!timeline.unlockCriteria) return '';
      const { coins: reqCoins, xp: reqXp, timelineId: reqTimelineId } = timeline.unlockCriteria;
      if (reqCoins && coins.length < reqCoins) return `Add ${reqCoins} coins to unlock`;
      if (reqXp && profile.points < reqXp) return `Reach ${reqXp} XP to unlock`;
      if (reqTimelineId) {
        const target = allAvailableTimelines.find(t => t.id === reqTimelineId);
        return `Complete "${target?.title}" to unlock`;
      }
      return 'Locked';
    };

    const renderTimelineCard = (timeline: Timeline) => {
      const progress = profile.timelineProgress[timeline.id] || 0;
      const total = timeline.events.length;
      const percent = total > 1 ? Math.round((progress / (total - 1)) * 100) : (progress === 0 ? 0 : 100);
      const isActive = profile.lastTimelineId === timeline.id;
      const isPersonal = timeline.id === 'my-coin-story';
      const locked = isTimelineLocked(timeline);

      return (
        <motion.button
          key={timeline.id}
          whileHover={locked ? {} : { scale: 1.02, y: -4 }}
          whileTap={locked ? {} : { scale: 0.98 }}
          onClick={() => {
            if (locked) {
              setFeedback({ message: getUnlockMessage(timeline), type: 'info' });
              return;
            }
            setSelectedTimelineId(timeline.id);
            setExpandedEventIdx(null);
          }}
          className={`flex-shrink-0 w-64 p-7 rounded-[2.75rem] text-left transition-all relative overflow-hidden ${
            locked
              ? 'bg-gray-100/40 dark:bg-gray-800/40 text-gray-400 cursor-not-allowed border-gray-200/30 dark:border-gray-700/30'
              : isActive 
                ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-2xl shadow-blue-500/40 border-blue-400/30' 
                : isPersonal
                  ? 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-xl border-indigo-400/30'
                  : 'ios-surface text-gray-900 dark:text-white'
          }`}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h4 className="font-black text-xl leading-tight line-clamp-1 tracking-tight">{timeline.title}</h4>
                {isPersonal && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
              </div>
              {locked && <Lock size={16} className="text-gray-400/60" />}
            </div>
            <p className={`text-[11px] font-bold leading-relaxed line-clamp-2 mb-6 ${locked ? 'text-gray-400/60' : isActive || isPersonal ? 'text-blue-100/80' : 'text-gray-400 dark:text-gray-500'}`}>
              {locked ? getUnlockMessage(timeline) : timeline.description}
            </p>
            <div className="flex items-center justify-between mt-auto">
              <div className="flex flex-col flex-1 mr-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${locked ? 'text-gray-400/60' : isActive || isPersonal ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'}`}>
                    {percent}%
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-tighter opacity-60 ${locked ? 'text-gray-400/60' : isActive || isPersonal ? 'text-white' : 'text-gray-400'}`}>
                    {progress}/{total}
                  </span>
                </div>
                <div className={`h-2 w-full rounded-full overflow-hidden ${locked ? 'bg-gray-200/50 dark:bg-gray-700/50' : isActive || isPersonal ? 'bg-white/20' : 'bg-gray-100/50 dark:bg-gray-800/50'}`}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                    className={`h-full rounded-full ${locked ? 'bg-gray-300' : isActive || isPersonal ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'bg-gradient-to-r from-blue-400 to-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} 
                  />
                </div>
              </div>
              {!locked && <ChevronRight size={20} className={isActive || isPersonal ? 'text-white/80' : 'text-gray-300 dark:text-gray-600'} />}
            </div>
          </div>
          {(isActive || isPersonal) && !locked && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          )}
        </motion.button>
      );
    };

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-12 pb-10 pr-2">
        <div className="flex items-center justify-between px-1 mb-4">
          <div>
            <h2 className="text-4xl font-black tracking-tighter text-gradient-blue leading-none">Timeline Hub</h2>
            <p className="text-gray-400 dark:text-gray-500 text-[11px] font-bold uppercase tracking-widest mt-2">Explore the history of numismatics</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end text-orange-500 font-black text-xl">
                <Flame size={20} className="fill-orange-500/20" />
                <span>{profile.timelineStreak}</span>
              </div>
              <p className="text-[9px] uppercase tracking-widest font-black text-gray-400/60 mt-0.5">Streak</p>
            </div>
            <div className="h-10 w-[1px] bg-gray-200/50 dark:bg-gray-800/50" />
            <div className="text-right">
              <p className="text-xl font-black text-blue-600 dark:text-blue-400 leading-none">{profile.points}</p>
              <p className="text-[9px] uppercase tracking-widest font-black text-gray-400/60 mt-1.5">Total XP</p>
            </div>
          </div>
        </div>

        <div className="ios-surface p-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
              <Zap size={22} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-widest">Collector Progress</h3>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Level {profile.level} • {profile.points} XP</p>
            </div>
          </div>
        </div>

        {continueExploring && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-5 px-1">
              <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <RefreshCw size={12} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-[11px] font-black text-gray-400/80 dark:text-gray-500 uppercase tracking-[0.2em]">Continue Exploring</h3>
            </div>
            <div className="flex gap-5 overflow-x-auto no-scrollbar pb-6 px-1 snap-x">
              <div className="snap-start">
                {renderTimelineCard(continueExploring)}
              </div>
            </div>
          </section>
        )}

        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
          <div className="flex items-center gap-2 mb-5 px-1">
            <div className="w-6 h-6 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <Star size={12} className="text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-[11px] font-black text-gray-400/80 dark:text-gray-500 uppercase tracking-[0.2em]">Popular Timelines</h3>
          </div>
          <div className="flex gap-5 overflow-x-auto no-scrollbar pb-6 px-1 snap-x">
            {popularTimelines.map(t => (
              <div key={t.id} className="snap-start">
                {renderTimelineCard(t)}
              </div>
            ))}
          </div>
        </section>

        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <div className="flex items-center gap-2 mb-5 px-1">
            <div className="w-6 h-6 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <Clock size={12} className="text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-[11px] font-black text-gray-400/80 dark:text-gray-500 uppercase tracking-[0.2em]">New Stories</h3>
          </div>
          <div className="flex gap-5 overflow-x-auto no-scrollbar pb-6 px-1 snap-x">
            {newTimelines.map(t => (
              <div key={t.id} className="snap-start">
                {renderTimelineCard(t)}
              </div>
            ))}
          </div>
        </section>

        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <div className="flex items-center gap-2 mb-5 px-1">
            <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <LayoutGrid size={12} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-[11px] font-black text-gray-400/80 dark:text-gray-500 uppercase tracking-[0.2em]">All Timelines</h3>
          </div>
          <div className="grid grid-cols-1 gap-5 px-1">
            {allTimelines.map(t => (
              <div key={t.id} className="w-full">
                {renderTimelineCard(t)}
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };
;

  const renderTimelineDetail = (timelineId: string) => {
    const timeline = allAvailableTimelines.find(t => t.id === timelineId);
    if (!timeline) return null;

    const currentProgress = profile.timelineProgress[timelineId] || 0;
    const isPersonal = timelineId === 'my-coin-story';

    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="flex items-center gap-5 mb-10">
          <motion.button 
            whileHover={{ scale: 1.1, x: -4 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setSelectedTimelineId(null);
              setExpandedEventIdx(null);
            }}
            className="w-12 h-12 ios-button rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft size={24} />
          </motion.button>
          <div>
            <h3 className="text-3xl font-black tracking-tight text-gray-800 dark:text-gray-100 leading-tight">{timeline.title}</h3>
            <p className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mt-1">
              {isPersonal ? 'Personal Journey' : 'Story Mode'}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-10 pb-10">
          {timeline.events.map((event, idx) => {
            const isUnlocked = isPersonal || idx <= currentProgress;
            const isNext = !isPersonal && idx === currentProgress + 1;
            const isExpanded = expandedEventIdx === idx;

            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative pl-12"
              >
                {idx !== timeline.events.length - 1 && (
                  <div className={`absolute left-[19px] top-10 bottom-[-40px] w-1 rounded-full ${isUnlocked ? 'bg-blue-600/30' : 'bg-gray-100 dark:bg-gray-800/50'}`} />
                )}
                <div className={`absolute left-0 top-2 w-10 h-10 rounded-full border-4 border-white dark:border-gray-900 shadow-lg flex items-center justify-center transition-all z-10 ${
                  isUnlocked ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}>
                  {isUnlocked ? <Check size={18} strokeWidth={3} /> : <span className="text-xs font-black">{idx + 1}</span>}
                </div>

                <motion.div 
                  layout
                  onClick={() => {
                    if (isNext) {
                      updateTimelineProgress(timelineId, idx);
                    } else if (isUnlocked) {
                      setExpandedEventIdx(isExpanded ? null : idx);
                    }
                  }}
                  className={`p-7 rounded-[2.5rem] border transition-all relative overflow-hidden premium-shadow inner-glow ${
                    isUnlocked 
                      ? 'ios-surface' 
                      : isNext 
                        ? 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-200/30 dark:border-blue-800/20 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        : 'bg-gray-50/30 dark:bg-gray-900/30 border-transparent opacity-40 grayscale'
                  } ${isUnlocked || isNext ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-black uppercase tracking-widest mb-1 ${isUnlocked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                        {event.year}
                      </span>
                      <h4 className={`text-lg font-black tracking-tight ${isUnlocked ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'}`}>
                        {isUnlocked || isNext ? (isPersonal ? event.title : event.event) : 'Locked Event'}
                      </h4>
                    </div>
                    {isUnlocked && !isPersonal && (
                      <span className="text-[9px] font-black text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={10} /> Discovered
                      </span>
                    )}
                    {isNext && (
                      <span className="text-[9px] font-black text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 animate-pulse">
                        <Star size={10} /> Unlock Next
                      </span>
                    )}
                  </div>

                  <AnimatePresence>
                    {(isExpanded || isNext || (!isPersonal && isUnlocked)) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className={`text-sm leading-relaxed mt-4 ${isUnlocked ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600/60 font-medium italic'}`}>
                          {isUnlocked ? (isPersonal ? event.description : event.note) : 'Tap to discover this historical milestone...'}
                        </p>
                        {isPersonal && event.note && (
                          <div className="mt-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/20">
                            <p className="text-xs italic text-blue-600 dark:text-blue-400 font-medium">
                              "{event.note}"
                            </p>
                          </div>
                        )}
                        {isNext && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full mt-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/30"
                          >
                            Mark as Discovered (+10 XP)
                          </motion.button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {!isExpanded && isUnlocked && !isNext && isPersonal && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                      <Info size={10} /> Tap to read story
                    </div>
                  )}
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- Main Render ---

  const renderPersonalNarrative = () => {
    const story = generateMyCoinStory;
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30 dark:bg-gray-900/30 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/50 inner-glow p-8">
        <div className="flex-1 overflow-y-auto no-scrollbar pr-2 space-y-12 pb-12">
          <div className="text-center max-w-xs mx-auto mb-12">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/30 mx-auto mb-4">
              <BookOpen size={32} className="text-white" />
            </div>
            <h4 className="text-2xl font-black tracking-tight text-gray-800 dark:text-gray-100 leading-tight">{story.title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{story.description}</p>
          </div>

          {story.events.map((event, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative pl-10"
            >
              {idx !== story.events.length - 1 && (
                <div className="absolute left-[15px] top-8 bottom-[-48px] w-[2px] bg-gradient-to-b from-blue-600/20 to-transparent" />
              )}
              <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-600 flex items-center justify-center shadow-sm z-10">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">{event.year}</span>
                <h5 className="text-lg font-black text-gray-800 dark:text-gray-100 leading-tight mb-2">{event.event || event.title}</h5>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed italic">
                  {event.note || event.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderExplore = () => {
    return (
      <motion.div
        key="explore"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        className="space-y-6 pb-24 h-[calc(100vh-180px)] flex flex-col"
      >
        <div className="flex items-center justify-between px-2 flex-shrink-0">
          <h2 className="text-2xl font-black text-gray-800 dark:text-gray-200">Explore</h2>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{exploreMode} Mode</span>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 ios-surface flex-shrink-0">
          {[
            { id: 'timeline', label: 'Timeline', icon: History },
            { id: 'mindmap', label: 'Mind Map', icon: Map },
            { id: 'story', label: 'Story', icon: BookOpen }
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setExploreMode(tab.id as ExploreMode)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all relative ${
                exploreMode === tab.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              }`}
            >
              {exploreMode === tab.id && (
                <motion.div
                  layoutId="activeExploreTabMain"
                  className="absolute inset-0 bg-white dark:bg-gray-900 shadow-sm rounded-[1.5rem] border border-black/[0.02] dark:border-white/[0.02]"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon size={14} />
                {tab.label}
              </span>
            </motion.button>
          ))}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={exploreMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {exploreMode === 'timeline' && (
                !selectedTimelineId ? renderTimelineHub() : renderTimelineDetail(selectedTimelineId)
              )}
              {exploreMode === 'mindmap' && (
                <MindMap 
                  coins={coins}
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
                  openCoin={openCoin}
                  addLog={addLog}
                  setActiveTab={setActiveTab}
                  setExpandedNodes={setExpandedNodes}
                />
              )}
              {exploreMode === 'story' && renderStoryHub()}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  const SettingsSection = ({ id, title, icon: Icon, children, badge }: { id: string, title: string, icon: any, children: React.ReactNode, badge?: string }) => {
    const isExpanded = expandedSections.includes(id);
    return (
      <div className="space-y-3">
        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => toggleSection(id)}
          className={`w-full flex items-center justify-between p-5 rounded-[2rem] transition-all ${
            isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30' : 'ios-surface'
          } border premium-border`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-2xl shadow-sm transition-all ${isExpanded ? 'bg-blue-600 text-white shadow-blue-200/50' : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-400'}`}>
              <Icon size={20} />
            </div>
            <div className="flex flex-col items-start">
              <span className={`font-black uppercase tracking-widest text-[11px] ${isExpanded ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>{title}</span>
              {badge && <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-0.5">{badge}</span>}
            </div>
          </div>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
            <ChevronDown size={20} className={isExpanded ? 'text-blue-600' : 'text-gray-300 dark:text-gray-600'} />
          </motion.div>
        </motion.button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="ios-surface divide-y divide-gray-50/50 dark:divide-gray-800/50 overflow-hidden">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const SettingToggle = ({ 
    label, 
    icon: Icon, 
    value, 
    onChange, 
    description,
    badge
  }: { 
    label: string, 
    icon: any, 
    value: boolean, 
    onChange: () => void, 
    description?: string,
    badge?: string
  }) => (
    <div className={`px-5 h-[88px] flex items-center justify-between transition-all ${value ? 'bg-blue-50/20 dark:bg-blue-900/5' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl transition-all ${value ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-400'}`}>
          <Icon size={18} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-black text-gray-800 dark:text-gray-200 text-sm tracking-tight">{label}</span>
            {badge && <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md">{badge}</span>}
          </div>
          {description && <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold leading-tight mt-1 tracking-tight">{description}</span>}
        </div>
      </div>
      <button 
        onClick={onChange}
        className={`w-14 h-7 rounded-full transition-all relative flex-shrink-0 p-1 ${value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
      >
        <motion.div 
          animate={{ x: value ? 28 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="w-5 h-5 bg-white rounded-full shadow-lg"
        />
      </button>
    </div>
  );

  const SettingSelect = ({ 
    label, 
    icon: Icon, 
    value, 
    onChange, 
    options 
  }: { 
    label: string, 
    icon: any, 
    value: string, 
    onChange: (val: string) => void, 
    options: { value: string, label: string }[] 
  }) => (
    <div className="px-5 h-[72px] flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 text-gray-400">
          <Icon size={18} />
        </div>
        <span className="font-black text-gray-800 dark:text-gray-200 text-sm tracking-tight">{label}</span>
      </div>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-100/50 dark:bg-gray-800/50 px-4 h-[36px] rounded-2xl text-[11px] font-black border-none focus:ring-2 focus:ring-blue-500/50 text-gray-700 dark:text-gray-300 transition-all appearance-none pr-8 relative"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  const COIN_FACTS = [
    "The 1933 double eagle is one of the world's rarest coins.",
    "The first coins were made in Lydia (modern-day Turkey) around 600 BC.",
    "A coin's 'obverse' is the heads side, and the 'reverse' is the tails side.",
    "Numismatics is the study or collection of currency.",
    "The edge of a coin is called the 'third side'.",
    "Many early coins were made of electrum, a natural alloy of gold and silver.",
    "The largest gold coin ever made weighs over 1,000 kilograms.",
    "The 50p coin was the world's first seven-sided coin.",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setDiscoveryTip(COIN_FACTS[Math.floor(Math.random() * COIN_FACTS.length)]);
    }, 30000);
    setDiscoveryTip(COIN_FACTS[Math.floor(Math.random() * COIN_FACTS.length)]);
    return () => clearInterval(interval);
  }, []);

  // Form state
  const [newName, setNewName] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newType, setNewType] = useState<CoinType>(DEFAULT_DENOMINATIONS[0]);
  const [newRarity, setNewRarity] = useState<Rarity>('Common');
  const [newSummary, setNewSummary] = useState('');
  const [newImage, setNewImage] = useState<string | undefined>();
  const [newFolderId, setNewFolderId] = useState<string>('purchased');
  const [newAmountPaid, setNewAmountPaid] = useState('0');
  const [newMint, setNewMint] = useState('');
  const [newEra, setNewEra] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---

  useEffect(() => {
    // Streak and Daily Mission Logic
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const lastLogin = new Date(profile.streak.lastLoginDate);
    const lastLoginDay = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate()).getTime();
    
    const diffDays = Math.floor((today - lastLoginDay) / (1000 * 60 * 60 * 24));
    
    let newStreak = profile.streak.current;
    let updatedMissions = [...profile.missions];
    let newPoints = profile.points;

    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    } else if (profile.streak.lastLoginDate === 0) {
      newStreak = 1;
    }

    // Reset daily missions if it's a new day
    if (diffDays >= 1) {
      updatedMissions = updatedMissions.map(m => m.type === 'daily' ? { ...m, isCompleted: false } : m);
    }

    // Complete "Daily Check-in" mission
    const checkInMission = updatedMissions.find(m => m.id === 'daily-check');
    if (checkInMission && !checkInMission.isCompleted) {
      updatedMissions = updatedMissions.map(m => m.id === 'daily-check' ? { ...m, isCompleted: true } : m);
      newPoints += checkInMission.points;
      setFeedback({ message: `Mission Completed: ${checkInMission.title} (+${checkInMission.points} XP)`, type: 'success' });
    }

    setProfile(prev => ({
      ...prev,
      points: newPoints,
      streak: { current: newStreak, lastLoginDate: Date.now() },
      missions: updatedMissions
    }));
  }, []);

  useEffect(() => {
    // Achievement Logic
    const newBadges = [...profile.badges];
    let changed = false;

    // First Coin
    if (coins.length >= 1 && !newBadges.find(b => b.id === 'first-coin')?.isUnlocked) {
      const badge = newBadges.find(b => b.id === 'first-coin')!;
      badge.isUnlocked = true;
      badge.unlockedAt = Date.now();
      changed = true;
      setFeedback({ message: `Achievement Unlocked: ${badge.name}`, type: 'success' });
    }

    // Rare Find
    if (coins.some(c => c.rarity !== 'Common') && !newBadges.find(b => b.id === 'rare-find')?.isUnlocked) {
      const badge = newBadges.find(b => b.id === 'rare-find')!;
      badge.isUnlocked = true;
      badge.unlockedAt = Date.now();
      changed = true;
      setFeedback({ message: `Achievement Unlocked: ${badge.name}`, type: 'success' });
    }

    // Collector 10
    if (coins.length >= 10 && !newBadges.find(b => b.id === 'collector-10')?.isUnlocked) {
      const badge = newBadges.find(b => b.id === 'collector-10')!;
      badge.isUnlocked = true;
      badge.unlockedAt = Date.now();
      changed = true;
      setFeedback({ message: `Achievement Unlocked: ${badge.name}`, type: 'success' });
    }

    // Expert 50
    if (coins.length >= 50 && !newBadges.find(b => b.id === 'expert-50')?.isUnlocked) {
      const badge = newBadges.find(b => b.id === 'expert-50')!;
      badge.isUnlocked = true;
      badge.unlockedAt = Date.now();
      changed = true;
      setFeedback({ message: `Achievement Unlocked: ${badge.name}`, type: 'success' });
    }

    // Master 100
    if (coins.length >= 100 && !newBadges.find(b => b.id === 'master-100')?.isUnlocked) {
      const badge = newBadges.find(b => b.id === 'master-100')!;
      badge.isUnlocked = true;
      badge.unlockedAt = Date.now();
      changed = true;
      setFeedback({ message: `Achievement Unlocked: ${badge.name}`, type: 'success' });
    }

    // Mind Map Explorer
    if (coins.length >= 20 && !newBadges.find(b => b.id === 'mind-map-explorer')?.isUnlocked) {
      const badge = newBadges.find(b => b.id === 'mind-map-explorer')!;
      badge.isUnlocked = true;
      badge.unlockedAt = Date.now();
      changed = true;
      setFeedback({ message: `Achievement Unlocked: ${badge.name}`, type: 'success' });
    }

    // Streak 7
    if (profile.streak.current >= 7 && !newBadges.find(b => b.id === 'streak-7')?.isUnlocked) {
      const badge = newBadges.find(b => b.id === 'streak-7')!;
      badge.isUnlocked = true;
      badge.unlockedAt = Date.now();
      changed = true;
      setFeedback({ message: `Achievement Unlocked: ${badge.name}`, type: 'success' });
    }

    if (changed) {
      setProfile(prev => ({ ...prev, badges: newBadges }));
    }

    // Milestone Unlock Logic
    const milestones = [
      { count: 20, id: 'milestone-20', name: 'Advanced Stats' },
      { count: 50, id: 'milestone-50', name: 'Secret Themes' },
    ];

    milestones.forEach(m => {
      if (coins.length >= m.count && !profile.unlockedMilestones.includes(m.id)) {
        setProfile(prev => ({
          ...prev,
          unlockedMilestones: [...prev.unlockedMilestones, m.id]
        }));
        setFeedback({ message: `🔓 Milestone Reached: ${m.name} Unlocked!`, type: 'success' });
      }
    });
  }, [coins.length, profile.streak.current]);

  useEffect(() => {
    let changed = false;
    const newNarrativeProgress = { ...profile.narrativeProgress };

    NARRATIVE_STORIES.forEach(story => {
      const progress = newNarrativeProgress[story.id] || { unlockedChapters: [], completed: false, chapterStories: {} };
      let storyChanged = false;

      story.chapters.forEach((chapter) => {
        if (progress.unlockedChapters.includes(chapter.id)) return;

        const req = chapter.requirement;
        let meetsReq = true;

        if (req.coins && coins.length < req.coins) meetsReq = false;
        if (req.rarity && !coins.some(c => c.rarity === req.rarity)) meetsReq = false;
        if (req.yearRange) {
          const hasYear = coins.some(c => {
            const y = parseInt(c.year);
            return !isNaN(y) && y >= req.yearRange![0] && y <= req.yearRange![1];
          });
          if (!hasYear) meetsReq = false;
        }

        if (meetsReq) {
          progress.unlockedChapters.push(chapter.id);
          storyChanged = true;
          changed = true;
        }
      });

      if (storyChanged) {
        newNarrativeProgress[story.id] = progress;
      }
    });

    if (changed) {
      setProfile(prev => ({ ...prev, narrativeProgress: newNarrativeProgress }));
    }
  }, [coins.length]);

  useEffect(() => {
    // Mission: Data Analyst
    if (activeTab === 'stats') {
      const mission = profile.missions.find(m => m.id === 'view-stats');
      if (mission && !mission.isCompleted) {
        setProfile(prev => ({
          ...prev,
          points: prev.points + mission.points,
          missions: prev.missions.map(m => m.id === 'view-stats' ? { ...m, isCompleted: true } : m)
        }));
        setFeedback({ message: `Mission Completed: ${mission.title} (+${mission.points} XP)`, type: 'success' });
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (isSafeMode) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const lastBackup = localStorage.getItem('coin-last-backup-date');
    
    if (!lastBackup || parseInt(lastBackup) < today) {
      storage.save('coin-backup-collection', coins);
      storage.save('coin-backup-folders', folders);
      storage.save('coin-backup-profile', profile);
      localStorage.setItem('coin-last-backup-date', today.toString());
    }
  }, [coins, folders, profile, isSafeMode]);

  useEffect(() => {
    if (!isSafeMode) {
      storage.save('coin-collection', coins);
    }
  }, [coins, isSafeMode]);

  useEffect(() => {
    if (!isSafeMode) {
      storage.save('coin-folders', folders);
    }
  }, [folders, isSafeMode]);

  useEffect(() => {
    if (!isSafeMode) {
      storage.save('coin-profile', profile);
    }
  }, [profile, isSafeMode]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    if (xpGain) {
      const oldPoints = profile.points - xpGain;
      const oldLevel = [...LEVELS].reverse().find(l => oldPoints >= l.minPoints);
      const newLevel = [...LEVELS].reverse().find(l => profile.points >= l.minPoints);
      
      if (oldLevel && newLevel && oldLevel.name !== newLevel.name) {
        setFeedback({ message: `Level Up! You are now a ${newLevel.name}!`, type: 'success' });
      }
    }
  }, [profile.points, xpGain]);

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    const theme = profile.preferences.theme;
    
    // Remove all theme classes
    const themeClasses = ['theme-paper', 'theme-glass', 'theme-wood', 'theme-metal', 'theme-fabric'];
    body.classList.remove(...themeClasses);
    
    const applyTheme = (isDark: boolean) => {
      root.classList.toggle('dark', isDark);
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);
      
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else if (theme === 'light' || theme === 'dark') {
      applyTheme(theme === 'dark');
    } else {
      // Texture themes
      body.classList.add(`theme-${theme}`);
      // Texture themes are designed as light themes for readability
      applyTheme(false);
    }
  }, [profile.preferences.theme]);

  // --- Actions ---

  const handleLuckySpin = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    if (profile.lastSpinDate >= today) {
      setFeedback({ message: 'You already used your daily spin!', type: 'info' });
      return;
    }

    setShowSpinModal(true);
    setSpinResult(null);
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (profile.preferences.autoRemoveBackground) {
        setIsProcessingImage(true);
        try {
          // Process background removal
          const blob = await removeBackground(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setNewImage(reader.result as string);
            setIsProcessingImage(false);
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('Background removal failed:', error);
          // Fallback to original image if processing fails
          const reader = new FileReader();
          reader.onloadend = () => {
            setNewImage(reader.result as string);
            setIsProcessingImage(false);
            setFeedback({ message: 'Background removal failed, used original', type: 'info' });
          };
          reader.readAsDataURL(file);
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const addCoin = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const coinData = {
      name: newName.trim(),
      year: newYear,
      type: newType,
      rarity: newRarity,
      summary: newSummary,
      image: newImage,
      folderId: newFolderId,
      amountPaid: parseFloat(newAmountPaid) || 0,
      tags: newTags,
      mint: newMint,
      era: newEra,
    };

    if (isEditing) {
      addLog(`User action: Update coin (${coinData.name})`, 'action');
      setCoins(coins.map(c => c.id === isEditing.id ? { ...c, ...coinData } : c));
      setFeedback({ message: 'Coin updated successfully!', type: 'success' });
    } else {
      addLog(`User action: Add coin (${coinData.name})`, 'action');
      let points = RARITY_POINTS[newRarity];
      
      // Night Bonus Mode
      const isNight = isNightTime();
      if (isNight && profile.preferences.nightBonusEnabled) {
        points = Math.round(points * 1.5);
        setFeedback({ message: `🌙 Night Bonus Active! (+50% XP)`, type: 'success' });
      } else {
        setFeedback({ message: 'Coin added to collection!', type: 'success' });
      }

      const newCoin: Coin = {
        id: crypto.randomUUID(),
        ...coinData,
        dateAdded: Date.now(),
        lastOpened: Date.now(),
      };
      setCoins([newCoin, ...coins]);
      
      // Mission: New Addition
      let updatedMissions = [...profile.missions];
      let bonusPoints = 0;
      const addMission = updatedMissions.find(m => m.id === 'add-coin');
      if (addMission && !addMission.isCompleted) {
        updatedMissions = updatedMissions.map(m => m.id === 'add-coin' ? { ...m, isCompleted: true } : m);
        bonusPoints = addMission.points;
        setFeedback({ message: `Mission Completed: ${addMission.title} (+${addMission.points} XP)`, type: 'success' });
      }

      setProfile(prev => ({ 
        ...prev, 
        points: prev.points + points + bonusPoints,
        missions: updatedMissions,
        unlockedMilestones: prev.unlockedMilestones ?? []
      }));
      setXpGain(points + bonusPoints);
      setTimeout(() => setXpGain(null), 2000);
      setFeedback({ message: `Coin added!`, type: 'success' });
    }

    resetForm();
  };

  const handleFusion = (ids: string[]) => {
    if (ids.length !== 3) return;
    
    const selected = coins.filter(c => ids.includes(c.id));
    const first = selected[0];
    
    const allSame = selected.every(c => 
      c.name === first.name && 
      c.year === first.year && 
      c.type === first.type && 
      c.rarity === first.rarity
    );
    
    if (!allSame) {
      setFeedback({ message: 'Coins must be identical to fuse!', type: 'info' });
      return;
    }
    
    if (first.rarity === 'Very Rare') {
      setFeedback({ message: 'Cannot fuse Very Rare coins further!', type: 'info' });
      return;
    }
    
    const nextRarity: Rarity = first.rarity === 'Common' ? 'Rare' : 'Very Rare';
    
    const fusedCoin: Coin = {
      ...first,
      id: crypto.randomUUID(),
      rarity: nextRarity,
      dateAdded: Date.now(),
      lastOpened: Date.now(),
      summary: `Fused from 3 ${first.rarity} duplicates. ${first.summary}`,
    };
    
    setCoins(prev => [...prev.filter(c => !ids.includes(c.id)), fusedCoin]);
    setFusionSelection([]);
    setShowFusionModal(false);
    setFeedback({ message: `Fusion Success! Created a ${nextRarity} ${first.name}!`, type: 'success' });
    
    const bonus = nextRarity === 'Rare' ? 150 : 300;
    setProfile(prev => ({ ...prev, points: prev.points + bonus }));
    setXpGain(bonus);
    setTimeout(() => setXpGain(null), 2000);
  };

  const resetForm = () => {
    const defaultDenom = [...DEFAULT_DENOMINATIONS, ...profile.preferences.customDenominations][0] || '50p';
    setNewName('');
    setNewYear(new Date().getFullYear().toString());
    setNewType(defaultDenom as CoinType);
    setNewRarity('Common');
    setNewSummary('');
    setNewImage(undefined);
    setNewFolderId('purchased');
    
    // Auto-fill price if fixed price mode is enabled
    if (profile.preferences.fixedPriceMode) {
      const fixedPrice = profile.preferences.denominationPrices[defaultDenom];
      setNewAmountPaid(fixedPrice !== undefined ? fixedPrice.toString() : '0');
    } else {
      setNewAmountPaid('0');
    }
    
    setNewMint('');
    setNewEra('');
    setIsAdding(false);
    setIsEditing(null);
  };

  const startEdit = (coin: Coin) => {
    setNewName(coin.name);
    setNewYear(coin.year);
    setNewType(coin.type);
    setNewRarity(coin.rarity);
    setNewSummary(coin.summary);
    setNewImage(coin.image);
    setNewFolderId(coin.folderId);
    setNewAmountPaid(coin.amountPaid?.toString() || '0');
    setNewMint(coin.mint || '');
    setNewEra(coin.era || '');
    setIsEditing(coin);
    setIsAdding(true);
    setSelectedCoin(null);
  };

  const deleteCoin = (id: string) => {
    setCoins(coins.filter(c => c.id !== id));
    setFeedback({ message: 'Coin removed', type: 'info' });
    setSelectedCoin(null);
  };

  const openCoin = (coin: Coin) => {
    // Instant navigation
    setSelectedCoin(coin);
    
    // Update recently viewed
    setRecentlyViewedIds(prev => {
      const filtered = prev.filter(id => id !== coin.id);
      return [coin.id, ...filtered].slice(0, 5);
    });
    
    // Update lastOpened in background
    setTimeout(() => {
      setCoins(prev => prev.map(c => c.id === coin.id ? { ...c, lastOpened: Date.now() } : c));
    }, 0);
  };

  const exportData = () => {
    const data = {
      coins,
      folders,
      profile,
      version: '1.2'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const timestamp = now.getFullYear() + 
      String(now.getMonth() + 1).padStart(2, '0') + 
      String(now.getDate()).padStart(2, '0') + '_' + 
      String(now.getHours()).padStart(2, '0') + 
      String(now.getMinutes()).padStart(2, '0');
    a.href = url;
    a.download = `coin-collection-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({ message: 'Data exported successfully', type: 'success' });
  };

  const exitSafeMode = () => {
    localStorage.removeItem('coin-safe-mode');
    window.location.reload();
  };

  const importData = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    setImportProgress(0);

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        setImportProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        let data;
        try {
          data = JSON.parse(raw);
        } catch (e) {
          const decompressed = LZString.decompressFromUTF16(raw);
          if (decompressed) {
            data = JSON.parse(decompressed);
          } else {
            throw new Error('Invalid file format');
          }
        }
        
        if (!data || typeof data !== 'object') throw new Error('Invalid data format');
        
        let importedCount = 0;
        if (Array.isArray(data.coins)) {
          const importedDenoms = new Set<string>();
          setCoins(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newCoins = data.coins
              .filter((c: any) => c && c.id && !existingIds.has(c.id))
              .map((c: any) => {
                if (c.type) importedDenoms.add(c.type);
                return {
                  id: c.id,
                  name: String(c.name || 'Unknown Coin'),
                  year: String(c.year || ''),
                  type: (c.type || '50p') as CoinType,
                  rarity: (['Common', 'Rare', 'Very Rare'].includes(c.rarity) ? c.rarity : 'Common') as Rarity,
                  image: c.image || null,
                  amountPaid: Number(c.amountPaid) || 0,
                  summary: String(c.summary ?? '').substring(0, 100),
                  folderId: String(c.folderId ?? 'purchased'),
                  dateAdded: Number(c.dateAdded) || Date.now(),
                  lastOpened: Number(c.lastOpened) || Date.now(),
                };
              });
            importedCount = newCoins.length;
            return [...prev, ...newCoins];
          });

          // Add new denominations to custom list
          if (importedDenoms.size > 0) {
            setProfile(prev => {
              const currentDenoms = new Set([...DEFAULT_DENOMINATIONS, ...prev.preferences.customDenominations]);
              const newCustom = [...prev.preferences.customDenominations];
              importedDenoms.forEach(d => {
                if (!currentDenoms.has(d)) {
                  newCustom.push(d);
                }
              });
              return {
                ...prev,
                preferences: {
                  ...prev.preferences,
                  customDenominations: newCustom
                }
              };
            });
          }
        }
        
        if (Array.isArray(data.folders)) {
          setFolders(prev => {
            const existingIds = new Set(prev.map(f => f.id));
            const newFolders = data.folders.filter((f: any) => f && f.id && !existingIds.has(f.id));
            return [...prev, ...newFolders];
          });
        }

        if (importedCount > 0) {
          setFeedback({ message: `Imported ${importedCount} new coins!`, type: 'success' });
        } else {
          setFeedback({ message: 'No new coins found in file', type: 'info' });
        }
      } catch (err) {
        console.error('Import error:', err);
        setFeedback({ message: `Import failed: ${err instanceof Error ? err.message : 'Invalid format'}`, type: 'info' });
      } finally {
        setImportProgress(null);
        if (importInputRef.current) importInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const loadRecentData = () => {
    const backupCoins = storage.load('coin-backup-collection');
    const backupFolders = storage.load('coin-backup-folders');
    const backupProfile = storage.load('coin-backup-profile');

    if (backupCoins || backupFolders || backupProfile) {
      setConfirmModal({
        title: 'Restore Backup',
        message: 'This will replace your current data with the last working backup. Continue?',
        onConfirm: () => {
          if (backupCoins) setCoins(backupCoins);
          if (backupFolders) setFolders(backupFolders);
          if (backupProfile) setProfile(backupProfile);
          setFeedback({ message: 'Backup restored successfully!', type: 'success' });
        }
      });
    } else {
      setFeedback({ message: 'No backup found', type: 'info' });
    }
  };

  // --- Memos ---

  const sortedCoins = useMemo(() => {
    let filtered = coins;
    
    // Filter out coins in locked folders unless unlocked
    const lockedFolderIds = folders.filter(f => f.isLocked && !unlockedFolders.includes(f.id)).map(f => f.id);
    filtered = filtered.filter(c => !lockedFolderIds.includes(c.folderId));

    if (selectedFolderId !== 'all') {
      filtered = filtered.filter(c => c.folderId === selectedFolderId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.year.includes(query) || 
        c.type.toLowerCase().includes(query) ||
        c.summary.toLowerCase().includes(query) ||
        (c.tags && c.tags.some(t => t.toLowerCase().includes(query)))
      );
    }

    return [...filtered].sort((a, b) => {
      const sortBy = profile.preferences.sortBy;
      if (sortBy === 'opened') return b.lastOpened - a.lastOpened;
      if (sortBy === 'year') {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        if (yearA !== yearB) return yearB - yearA;
        return b.dateAdded - a.dateAdded;
      }
      if (sortBy === 'denomination') {
        const typeCompare = a.type.localeCompare(b.type);
        if (typeCompare !== 0) return typeCompare;
        return b.dateAdded - a.dateAdded;
      }
      if (sortBy === 'name') {
        const nameCompare = a.name.localeCompare(b.name);
        if (nameCompare !== 0) return nameCompare;
        return b.dateAdded - a.dateAdded;
      }
      if (sortBy === 'date' || sortBy === 'month' || sortBy === 'added') return b.dateAdded - a.dateAdded;
      return b.dateAdded - a.dateAdded;
    });
  }, [coins, selectedFolderId, profile.preferences.sortBy, searchQuery, folders, unlockedFolders]);

  const groupedCoins = useMemo<Record<string, Coin[]> | null>(() => {
    if (!profile.preferences.groupViewEnabled || profile.preferences.groupBy === 'none') {
      return null;
    }

    const groups: Record<string, Coin[]> = {};
    const groupBy = profile.preferences.groupBy;

    sortedCoins.forEach(coin => {
      let key = 'Other';
      if (groupBy === 'year') {
        key = coin.year || 'Unknown Year';
      } else if (groupBy === 'denomination') {
        key = coin.type;
      } else if (groupBy === 'date') {
        key = new Date(coin.dateAdded).toLocaleDateString(undefined, { dateStyle: 'medium' });
      } else if (groupBy === 'month') {
        key = new Date(coin.dateAdded).toLocaleString('default', { month: 'long', year: 'numeric' });
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(coin);
    });

    return groups;
  }, [sortedCoins, profile.preferences.groupViewEnabled, profile.preferences.groupBy]);

  const stats = useMemo(() => {
    const allDenoms = [...DEFAULT_DENOMINATIONS, ...profile.preferences.customDenominations];
    const counts: { [key: string]: number } = {};
    allDenoms.forEach(denom => {
      counts[denom] = coins.filter(c => c.type === denom).length;
    });
    
    const total = coins.length;
    const targetTotal = TARGET_PER_TYPE * allDenoms.length;
    const completion = Math.min(Math.round((total / targetTotal) * 100), 100);

    const totalSpend = coins.reduce((sum, c) => sum + (c.amountPaid || 0), 0);
    
    // Monthly totals (Coins and Spend)
    const monthlyTotals: { [key: string]: { count: number; spend: number } } = {};
    coins.forEach(c => {
      const date = new Date(c.dateAdded);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyTotals[key]) monthlyTotals[key] = { count: 0, spend: 0 };
      monthlyTotals[key].count += 1;
      monthlyTotals[key].spend += (c.amountPaid || 0);
    });

    // Duplicate tracking with dates
    const duplicates: { [key: string]: { count: number; coin: Coin; dates: number[] } } = {};
    coins.forEach(c => {
      const key = `${c.name}-${c.year}-${c.type}`.toLowerCase();
      if (duplicates[key]) {
        duplicates[key].count += 1;
        duplicates[key].dates.push(c.dateAdded);
      } else {
        duplicates[key] = { count: 1, coin: c, dates: [c.dateAdded] };
      }
    });
    const duplicateList = Object.values(duplicates)
      .filter(d => d.count > 1)
      .sort((a, b) => b.count - a.count);

    // Pattern Insights
    const mostCollectedType = Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0] as CoinType;
    const rarestCoin = [...coins].sort((a, b) => {
      const rarityMap = { 'Very Rare': 3, 'Rare': 2, 'Common': 1 };
      return rarityMap[b.rarity] - rarityMap[a.rarity];
    })[0] || null;
    
    const yearCounts: { [key: string]: number } = {};
    coins.forEach(c => yearCounts[c.year] = (yearCounts[c.year] || 0) + 1);
    const mostCollectedYear = Object.entries(yearCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0])[0];

    const insights = {
      mostCollectedType,
      rarestCoin,
      mostCollectedYear,
      averagePaid: total > 0 ? totalSpend / total : 0,
    };

    // Smart Goals
    const firstDenom = allDenoms[0] || '50p';
    const goals: Goal[] = [
      {
        id: 'goal-count-10',
        title: 'Reach 10 Coins',
        target: 10,
        current: total,
        type: 'count',
        isCompleted: total >= 10
      },
      {
        id: 'goal-value-100',
        title: 'Collection Value £100',
        target: 100,
        current: totalSpend,
        type: 'value',
        isCompleted: totalSpend >= 100
      },
      {
        id: 'goal-rare-5',
        title: 'Collect 5 Rare Coins',
        target: 5,
        current: coins.filter(c => c.rarity !== 'Common').length,
        type: 'rarity',
        isCompleted: coins.filter(c => c.rarity !== 'Common').length >= 5
      },
      {
        id: `goal-type-${firstDenom}-10`,
        title: `Collect 10 ${firstDenom} Coins`,
        target: 10,
        current: counts[firstDenom] || 0,
        type: 'type',
        isCompleted: (counts[firstDenom] || 0) >= 10
      }
    ];

    return { counts, total, completion, totalSpend, monthlyTotals, duplicateList, insights, goals };
  }, [coins]);

  const currentLevel = useMemo(() => {
    return [...LEVELS].reverse().find(l => profile.points >= l.minPoints) || LEVELS[0];
  }, [profile.points]);

  const nextLevel = useMemo(() => {
    const currentIndex = LEVELS.findIndex(l => l.name === currentLevel.name);
    return LEVELS[currentIndex + 1] || null;
  }, [currentLevel]);

  const progressToNextLevel = useMemo(() => {
    if (!nextLevel) return 100;
    const range = nextLevel.minPoints - currentLevel.minPoints;
    const progress = profile.points - currentLevel.minPoints;
    return Math.min(Math.round((progress / range) * 100), 100);
  }, [profile.points, currentLevel, nextLevel]);

  const suggestion = useMemo(() => {
    if (coins.length === 0) return "Start your collection today!";
    if (coins.length < 5) return "You're on your way! Add more coins.";
    if (coins.length < 15) return "Great collection! Keep going.";
    return "Impressive! You're a true collector.";
  }, [coins.length]);

  // --- Render Helpers ---

  const renderSummaryBar = () => (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`bg-white/80 dark:bg-black/80 backdrop-blur-md text-gray-900 dark:text-white ${isCompact ? 'h-[36px]' : 'h-[44px]'} px-5 relative z-[60] border-b border-gray-200/50 dark:border-white/5 flex items-center justify-between ${isCompact ? 'text-[9px]' : 'text-[10px]'} font-black uppercase tracking-[0.25em] shadow-sm inner-glow`}
    >
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2.5 group cursor-default">
          <Coins size={isCompact ? 10 : 13} className="text-blue-500 transition-transform group-hover:scale-110" />
          <span className="flex items-center gap-1.5">{stats.total} <span className="text-gray-400 dark:text-gray-500 font-bold">Coins</span></span>
        </div>
        <div className="flex items-center gap-2.5 group cursor-default">
          <Zap size={isCompact ? 10 : 13} className="text-amber-500 transition-transform group-hover:scale-110" />
          <span className="flex items-center gap-1.5">{profile.points} <span className="text-gray-400 dark:text-gray-500 font-bold">XP</span></span>
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div className={`${isCompact ? 'w-12' : 'w-24'} h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner`}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressToNextLevel}%` }}
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.4)]"
            />
          </div>
          <span className="text-blue-600 dark:text-blue-400 font-black">{progressToNextLevel}%</span>
        </div>
        <div className="w-px h-3 bg-gray-200 dark:bg-white/10" />
        <span className="text-gray-500 dark:text-gray-400 font-bold">{currentLevel.name}</span>
      </div>
    </motion.div>
  );

  const renderHeader = () => (
    <>
      {profile.preferences.showTopSummary && renderSummaryBar()}
      <header className={`px-4 ${isCompact ? 'pt-6 pb-4' : 'pt-10 pb-8'} relative z-10 transition-colors overflow-hidden`}>
        {/* Mesh background effect - subtle and blended */}
        <div className="absolute inset-0 mesh-gradient opacity-20 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
        
        <div className="max-w-md mx-auto relative z-10">
          <div className={`flex items-center justify-between ${isCompact ? 'mb-4' : 'mb-8'}`}>
            <div className="flex items-center gap-5">
              <motion.div 
                whileHover={{ rotate: 5, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`${isCompact ? 'w-12 h-12' : 'w-16 h-16'} bg-gradient-to-br from-blue-500 to-blue-600 rounded-[1.75rem] flex items-center justify-center text-white shadow-lg shadow-blue-500/20 transition-transform premium-border border border-blue-400/20 inner-glow`}
              >
                <Star size={isCompact ? 24 : 32} className="fill-white" />
              </motion.div>
              <div>
                <h1 className={`${isCompact ? 'text-2xl' : 'text-4xl'} font-black tracking-tighter leading-none text-gradient-blue`}>Coinly</h1>
                {!profile.preferences.focusMode && (
                  <div className="flex items-center gap-4 mt-3">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 ios-glass px-3 py-1 rounded-full border border-white/20 dark:border-white/5 shadow-sm cursor-default inner-glow"
                    >
                      <Flame size={14} className="text-orange-500 fill-orange-500/20" />
                      <span className="text-xs font-black text-orange-600 dark:text-orange-400 tracking-tight">{profile.streak.current}</span>
                    </motion.div>
                    <div className="w-1 h-1 bg-gray-200 dark:bg-gray-800 rounded-full" />
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.25em]">{currentLevel.name}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!profile.preferences.focusMode && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLuckySpin}
                  disabled={isSpinning}
                  className={`${isCompact ? 'p-2.5' : 'p-3.5'} rounded-[1.25rem] transition-all relative overflow-hidden ios-button ${
                    isSpinning 
                      ? 'bg-gray-50 dark:bg-gray-800 text-gray-300 animate-spin' 
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                  title="Daily Lucky Spin"
                >
                  <Gift size={22} />
                </motion.button>
              )}
              <div className="flex gap-1">
                {!profile.preferences.focusMode && (
                  <>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }} 
                      id="refresh-app-btn" 
                      onClick={() => window.location.reload()} 
                      className="p-3.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-[1.25rem] ios-button" 
                      title="Refresh App"
                    >
                      <Clock size={22} />
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }} 
                      id="export-data-btn" 
                      onClick={exportData} 
                      className="p-3.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-[1.25rem] ios-button" 
                      title="Export Data"
                    >
                      <Download size={22} />
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </div>

          {!profile.preferences.focusMode && (
            <div className={`transition-all duration-300 ${discoveryTip ? 'h-[84px] mb-8' : 'h-0 mb-0'} overflow-hidden`}>
              {discoveryTip && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="ios-surface p-5 flex items-center gap-4 relative overflow-hidden h-full"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-600/30" />
                  <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex-shrink-0 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                    <Lightbulb size={22} />
                  </div>
                  <p className="text-[12px] font-bold text-gray-700 dark:text-gray-300 italic leading-relaxed tracking-tight line-clamp-2">
                    "{discoveryTip}"
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {/* Hero Stats Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[3rem] p-9 text-white relative overflow-hidden shadow-2xl premium-shadow premium-border border inner-glow ${
              profile.preferences.textMode 
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 shadow-none' 
                : 'bg-gray-900 dark:bg-gray-950 border-white/10 shadow-blue-500/10 dark:shadow-none'
            }`}
          >
            {!profile.preferences.textMode && (
              <>
                <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/20 rounded-full -mr-36 -mt-36 blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-purple-600/10 rounded-full -ml-28 -mb-28 blur-3xl" />
                <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
              </>
            )}
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-3 ${profile.preferences.textMode ? 'text-gray-400' : 'text-blue-400/80'}`}>Current Rank</p>
                  <h2 className={`text-4xl font-black tracking-tighter ${profile.preferences.textMode ? '' : 'italic'}`}>{currentLevel.name}</h2>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-3 ${profile.preferences.textMode ? 'text-gray-400' : 'text-blue-400/80'}`}>Total Coins</p>
                  <p className="text-4xl font-black tracking-tighter">{stats.total}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${profile.preferences.textMode ? 'text-gray-400' : 'text-blue-200/80'}`}>Level Progress</p>
                  <p className="text-xs font-black tracking-tight">{progressToNextLevel}%</p>
                </div>
                <div className={`h-3.5 rounded-full overflow-hidden ${profile.preferences.textMode ? 'bg-gray-200 dark:bg-gray-700' : 'bg-white/10 shadow-inner'}`}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressToNextLevel}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className={`h-full rounded-full ${profile.preferences.textMode ? 'bg-blue-600' : 'bg-gradient-to-r from-blue-400 to-blue-600 shadow-[0_0_20px_rgba(96,165,250,0.6)]'}`}
                  />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${profile.preferences.textMode ? 'text-gray-400' : 'text-blue-300/60'}`}>
                    {profile.points} XP Total
                  </p>
                  {nextLevel && (
                    <p className={`text-[10px] font-black uppercase tracking-widest ${profile.preferences.textMode ? 'text-gray-400' : 'text-blue-300/60'}`}>
                      Next: {nextLevel.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </header>
    </>
  );

  const renderSkeletonCard = () => (
    <div className={`ios-surface flex items-center justify-between animate-pulse overflow-hidden ${isCompact ? 'h-[88px] p-4' : 'h-[128px] p-6'}`}>
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {!profile.preferences.textMode && (
          <div className={`${isCompact ? 'w-14 h-14' : 'w-20 h-20'} rounded-2xl bg-gray-100 dark:bg-gray-800 flex-shrink-0`} />
        )}
        <div className="space-y-2 min-w-0 flex-1">
          <div className={`bg-gray-100 dark:bg-gray-800 rounded-full ${isCompact ? 'h-4 w-24' : 'h-5 w-32'}`} />
          <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-full ${isCompact ? 'h-3 w-16' : 'h-3 w-20'}`} />
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 ml-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          {!profile.preferences.focusMode && (
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
          )}
          {profile.preferences.showPrice && (
            <div className={`bg-gray-100 dark:bg-gray-800 rounded-full ${isCompact ? 'h-4 w-12' : 'h-5 w-16'}`} />
          )}
        </div>
        <div className="w-[18px] h-[18px] rounded-full bg-gray-50 dark:bg-gray-800/50" />
      </div>
    </div>
  );

  const renderLogsModal = () => {
    if (!showLogsModal) return null;
    
    const exportLogs = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `coin_logs_${new Date().toISOString()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      addLog('User action: Export logs', 'action');
    };

    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLogsModal(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="ios-surface w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600">
                  <Activity size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Debug Logs</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">System Activity</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLogsModal(false)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[10px]">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
                  <Activity size={48} className="mb-4 opacity-20" />
                  <p className="font-bold">No logs recorded yet.</p>
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 flex gap-3">
                    <span className="text-gray-400 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`font-bold flex-shrink-0 ${
                      log.type === 'error' ? 'text-red-500' : 
                      log.type === 'action' ? 'text-blue-500' : 
                      log.type === 'load' ? 'text-green-500' : 'text-gray-500'
                    }`}>[{log.type.toUpperCase()}]</span>
                    <span className="text-gray-700 dark:text-gray-300 break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  setLogs([]);
                  addLog('User action: Clear logs', 'action');
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold active:scale-95 transition-all"
              >
                <Trash2 size={18} /> Clear
              </button>
              <button 
                onClick={exportLogs}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-600 text-white font-bold active:scale-95 transition-all shadow-lg shadow-blue-500/20"
              >
                <Download size={18} /> Export
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderCoinCard = (coin: Coin) => {
    const isSelected = selectedCoinIds.has(coin.id);

    const handleSelect = () => {
      setSelectedCoinIds(prev => {
        const next = new Set(prev);
        if (next.has(coin.id)) {
          next.delete(coin.id);
          if (next.size === 0) setIsMultiSelectMode(false);
        } else {
          next.add(coin.id);
        }
        return next;
      });
    };

    const startLongPress = () => {
      longPressTimer.current = setTimeout(() => {
        setIsMultiSelectMode(true);
        setSelectedCoinIds(new Set([coin.id]));
        if (navigator.vibrate) navigator.vibrate(50);
      }, 600);
    };

    const clearLongPress = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };

    return (
      <motion.div
        layout
        key={coin.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={isMultiSelectMode ? {} : { scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onPointerDown={isMultiSelectMode ? undefined : startLongPress}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
        onClick={() => {
          if (isMultiSelectMode) {
            handleSelect();
          } else {
            openCoin(coin);
          }
        }}
        className={`ios-surface transition-all flex items-center justify-between group cursor-pointer relative overflow-hidden active:bg-white/80 dark:active:bg-black/60 ${
          isCompact ? 'h-[88px] p-4' : 'h-[128px] p-6'
        } ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20' :
          coin.rarity === 'Very Rare' ? 'ring-1 ring-amber-400/30 bg-amber-50/30 dark:bg-amber-900/10' : 
          coin.rarity === 'Rare' ? 'ring-1 ring-blue-400/30 bg-blue-50/30 dark:bg-blue-900/10' : ''
        }`}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {isMultiSelectMode && (
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
              isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-700'
            }`}>
              {isSelected && <Check size={14} strokeWidth={4} />}
            </div>
          )}
          {!profile.preferences.textMode && (
            <div className={`${isCompact ? 'w-14 h-14' : 'w-20 h-20'} rounded-2xl bg-gray-50 dark:bg-gray-800 flex-shrink-0 overflow-hidden flex items-center justify-center shadow-inner border border-gray-100/50 dark:border-gray-800/50`}>
              {coin.image ? (
                <img 
                  src={coin.image} 
                  alt={coin.name} 
                  width={isCompact ? 56 : 80}
                  height={isCompact ? 56 : 80}
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <span className={`${isCompact ? 'text-lg' : 'text-2xl'} font-black ${
                  coin.rarity === 'Very Rare' ? 'text-amber-500' :
                  coin.rarity === 'Rare' ? 'text-blue-500' : 'text-gray-300'
                }`}>
                  {coin.type}
                </span>
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 h-[20px]">
              <h4 className={`font-bold text-gray-900 dark:text-gray-100 leading-tight truncate ${isCompact ? 'text-sm' : 'text-base'}`}>
                {coin.name}
              </h4>
              {!profile.preferences.textMode && coin.rarity !== 'Common' && (
                <div className={`p-1 rounded-full flex-shrink-0 ${coin.rarity === 'Very Rare' ? 'bg-amber-100/50 dark:bg-amber-900/30' : 'bg-blue-100/50 dark:bg-blue-900/30'}`}>
                  <Star size={10} className={`fill-current ${coin.rarity === 'Very Rare' ? 'text-amber-600' : 'text-blue-600'}`} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2.5 h-[16px]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">{coin.year}</span>
              <div className="w-1 h-1 bg-gray-200 dark:bg-gray-800 rounded-full flex-shrink-0" />
              <span className={`text-[10px] font-bold uppercase tracking-[0.15em] truncate ${
                coin.rarity === 'Very Rare' ? 'text-amber-600' :
                coin.rarity === 'Rare' ? 'text-blue-600' : 'text-gray-400'
              }`}>{coin.rarity}</span>
            </div>
            {profile.preferences.showFolder && (
              <div className="flex items-center gap-1 mt-1.5 h-[14px]">
                <FolderIcon size={10} className="text-gray-400" />
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[100px]">
                  {folders.find(f => f.id === coin.folderId)?.name || 'Unknown'}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 ml-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {!profile.preferences.focusMode && !isMultiSelectMode && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (compareCoins.includes(coin.id)) {
                    setCompareCoins(compareCoins.filter(id => id !== coin.id));
                  } else if (compareCoins.length < 2) {
                    setCompareCoins([...compareCoins, coin.id]);
                  } else {
                    setCompareCoins([compareCoins[1], coin.id]);
                  }
                }}
                className={`p-2 rounded-xl transition-all active:bg-gray-100 dark:active:bg-gray-800 ${
                  compareCoins.includes(coin.id) 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' 
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-blue-600'
                }`}
              >
                <Columns size={16} />
              </motion.button>
            )}
            {profile.preferences.showPrice && (
              <span className={`font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap ${isCompact ? 'text-sm' : 'text-base'}`}>£{coin.amountPaid?.toFixed(2)}</span>
            )}
          </div>
          {!isMultiSelectMode && <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />}
        </div>
      </motion.div>
    );
  };

  const renderMultiSelectBar = () => {
    if (!isMultiSelectMode || selectedCoinIds.size === 0) return null;

    const handleBulkFolderChange = async (folderId: string) => {
      setIsApplyingBulkAction(true);
      setActiveBulkMenu(null);
      
      // Artificial delay for feedback
      await new Promise(resolve => setTimeout(resolve, 600));

      setCoins(prev => prev.map(coin => 
        selectedCoinIds.has(coin.id) ? { ...coin, folderId } : coin
      ));
      
      setIsMultiSelectMode(false);
      setSelectedCoinIds(new Set());
      setIsApplyingBulkAction(false);
      setFeedback({ message: `Moved ${selectedCoinIds.size} coins to new folder`, type: 'success' });
      addLog(`Bulk move: ${selectedCoinIds.size} coins to folder ${folderId}`, 'action');
    };

    const handleBulkDenominationChange = async (type: CoinType) => {
      setIsApplyingBulkAction(true);
      setActiveBulkMenu(null);

      // Artificial delay for feedback
      await new Promise(resolve => setTimeout(resolve, 600));

      setCoins(prev => prev.map(coin => 
        selectedCoinIds.has(coin.id) ? { ...coin, type } : coin
      ));
      
      setIsMultiSelectMode(false);
      setSelectedCoinIds(new Set());
      setIsApplyingBulkAction(false);
      setFeedback({ message: `Updated ${selectedCoinIds.size} coins to ${type}`, type: 'success' });
      addLog(`Bulk update: ${selectedCoinIds.size} coins to type ${type}`, 'action');
    };

    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 left-4 right-4 z-[100]"
      >
        <div className="ios-surface p-4 flex items-center justify-between shadow-2xl border-blue-500/20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl relative">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setIsMultiSelectMode(false);
                setSelectedCoinIds(new Set());
                setActiveBulkMenu(null);
              }}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"
            >
              <X size={20} />
            </button>
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-white">{selectedCoinIds.size} Selected</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bulk Actions</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isApplyingBulkAction ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-xs font-black uppercase tracking-widest">Applying...</span>
              </div>
            ) : (
              <>
                <div className="relative">
                  <button 
                    onClick={() => setActiveBulkMenu(activeBulkMenu === 'move' ? null : 'move')}
                    className={`p-3 rounded-2xl flex items-center gap-2 transition-all ${
                      activeBulkMenu === 'move' ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    }`}
                  >
                    <FolderIcon size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Move</span>
                  </button>
                  
                  <AnimatePresence>
                    {activeBulkMenu === 'move' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full right-0 mb-4 w-56 ios-surface p-2 shadow-2xl z-[110] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
                      >
                        <div className="flex items-center justify-between p-2 border-b border-gray-50 dark:border-gray-800 mb-1">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Select Folder</p>
                          <button onClick={() => setActiveBulkMenu(null)} className="text-gray-400"><X size={12} /></button>
                        </div>
                        <div className="max-h-48 overflow-y-auto no-scrollbar">
                          {folders.map(f => (
                            <button 
                              key={f.id}
                              onClick={() => handleBulkFolderChange(f.id)}
                              className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-3"
                            >
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              {f.name}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setActiveBulkMenu(activeBulkMenu === 'type' ? null : 'type')}
                    className={`p-3 rounded-2xl flex items-center gap-2 transition-all ${
                      activeBulkMenu === 'type' ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    }`}
                  >
                    <Coins size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Type</span>
                  </button>

                  <AnimatePresence>
                    {activeBulkMenu === 'type' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full right-0 mb-4 w-48 ios-surface p-2 shadow-2xl z-[110] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
                      >
                        <div className="flex items-center justify-between p-2 border-b border-gray-50 dark:border-gray-800 mb-1">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Select Type</p>
                          <button onClick={() => setActiveBulkMenu(null)} className="text-gray-400"><X size={12} /></button>
                        </div>
                        {[...DEFAULT_DENOMINATIONS, ...profile.preferences.customDenominations].map(t => (
                          <button 
                            key={t}
                            onClick={() => handleBulkDenominationChange(t as CoinType)}
                            className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-3"
                          >
                            <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[8px] text-amber-600">
                              {t}
                            </div>
                            {t}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderTabs = () => {
    if (profile.preferences.showBottomMenu) return null;
    const tabs = [
      { id: 'collection', label: 'Collection', icon: LayoutGrid },
      { id: 'story', label: 'Story', icon: BookOpen },
      { id: 'library', label: 'Library', icon: ImageIcon },
      { id: 'stats', label: 'Stats', icon: PieChart },
      { id: 'profile', label: 'Profile', icon: User },
    ];

    return (
      <div className="max-w-md mx-auto mb-10 px-4">
        <div className="flex ios-surface p-1.5 rounded-[2.25rem] relative overflow-hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 relative flex items-center justify-center gap-2.5 py-3.5 px-2 rounded-[1.75rem] text-[10px] font-black uppercase tracking-[0.15em] transition-colors z-10 ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-white dark:bg-gray-900 rounded-[1.75rem] shadow-sm border border-black/[0.02] dark:border-white/[0.02] z-[-1]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon size={16} className={isActive ? 'fill-blue-600/10' : ''} />
                <span className="hidden xs:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderBottomMenu = () => {
    if (!profile.preferences.showBottomMenu) return null;
    const menuItems = [
      { id: 'collection', label: 'Home', icon: LayoutGrid },
      { id: 'explore', label: 'Explore', icon: Map },
      { id: 'library', label: 'Library', icon: ImageIcon },
      { id: 'stats', label: 'Stats', icon: PieChart },
      { id: 'profile', label: 'Profile', icon: User },
    ];

    return (
      <div className="fixed bottom-6 left-0 right-0 z-40 px-6 pointer-events-none">
        <nav className="max-w-md mx-auto ios-overlay px-6 py-3 flex items-center justify-around pointer-events-auto relative overflow-hidden">
          {/* Subtle background glow for active item */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent pointer-events-none" />
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex flex-col items-center gap-1.5 transition-all relative py-1 ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <div className="relative">
                  {isActive && (
                    <motion.div
                      layoutId="activeBottomIndicator"
                      className="absolute -inset-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-md"
                    />
                  )}
                  <Icon size={isActive ? 24 : 22} className={`transition-all ${isActive ? 'fill-blue-600/10' : ''}`} />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="activeBottomDot"
                    className="w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full absolute -bottom-1"
                  />
                )}
              </motion.button>
            );
          })}
        </nav>
      </div>
    );
  };

  if (isSafeMode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 p-6 rounded-[2.5rem] flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-2xl flex items-center justify-center text-amber-600">
              <Zap size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-amber-900 dark:text-amber-100">Safe Mode Active</h1>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Loading from last working backup. Core features only.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100">Your Collection</h2>
              <button 
                onClick={exportData}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-100 dark:shadow-none active:scale-95 transition-all"
              >
                <Download size={20} /> Export Data
              </button>
            </div>

            <div className="space-y-3">
              {coins.length === 0 ? (
                <p className="text-center py-10 text-gray-400 font-bold">No coins found in backup</p>
              ) : (
                coins.map(coin => (
                  <div key={coin.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="font-black text-gray-800 dark:text-gray-100">{coin.name}</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{coin.type} • {coin.year}</p>
                    </div>
                    <span className="text-sm font-black text-gray-900 dark:text-gray-100">£{coin.amountPaid.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button 
            onClick={exitSafeMode}
            className="w-full py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all"
          >
            Exit Safe Mode & Restart
          </button>
        </div>
      </div>
    );
  }

  const getEraProgress = (era: Era) => {
    const eraCoins = coins.filter(c => {
      const year = parseInt(c.year);
      return year >= era.years[0] && year <= era.years[1];
    });
    
    const completedChallenges = era.challenges.filter(challenge => {
      if (challenge.type === 'count') {
        return eraCoins.length >= challenge.target;
      }
      if (challenge.type === 'rarity') {
        return eraCoins.filter(c => c.rarity === challenge.rarity).length >= challenge.target;
      }
      return false;
    });

    return {
      percent: Math.round((completedChallenges.length / era.challenges.length) * 100),
      completedCount: completedChallenges.length,
      totalCount: era.challenges.length,
      eraCoins
    };
  };

  const renderEraConquest = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="max-w-md mx-auto px-4 pb-24"
      >
        <div className="flex items-center gap-4 mb-10">
          <motion.button 
            whileHover={{ scale: 1.1, x: -4 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveGameMode(null)}
            className="w-12 h-12 ios-button rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft size={24} />
          </motion.button>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-gradient-blue leading-tight">Era Conquest</h2>
            <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-1">Conquer the timeline</p>
          </div>
        </div>

        <div className="space-y-8">
          {ERAS.map((era) => {
            const { percent, completedCount, totalCount } = getEraProgress(era);
            return (
              <motion.div
                key={era.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="ios-surface p-8 relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">{era.name}</h3>
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mt-1">{era.years[0]} - {era.years[1]}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{percent}%</span>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{completedCount}/{totalCount} Challenges</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {era.challenges.map((challenge) => {
                    const eraCoins = coins.filter(c => {
                      const year = parseInt(c.year);
                      return year >= era.years[0] && year <= era.years[1];
                    });
                    let isDone = false;
                    if (challenge.type === 'count') isDone = eraCoins.length >= challenge.target;
                    if (challenge.type === 'rarity') isDone = eraCoins.filter(c => c.rarity === challenge.rarity).length >= challenge.target;

                    return (
                      <div key={challenge.id} className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-300'}`}>
                          {isDone ? <Check size={14} strokeWidth={4} /> : <div className="w-2 h-2 bg-current rounded-full" />}
                        </div>
                        <p className={`text-xs font-bold ${isDone ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>{challenge.description}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner mb-8">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                  />
                </div>

                {percent === 100 && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-6 rounded-[2rem] bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Award className="text-blue-600 dark:text-blue-400" size={20} />
                      <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Era Lore Unlocked</h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic">"{era.loreCard}"</p>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  const renderTimelinePuzzle = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="max-w-md mx-auto px-4 pb-24"
      >
        <div className="flex items-center gap-4 mb-10">
          <motion.button 
            whileHover={{ scale: 1.1, x: -4 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveGameMode(null)}
            className="w-12 h-12 ios-button rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft size={24} />
          </motion.button>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-gradient-blue leading-tight">Timeline Puzzle</h2>
            <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-1">Reconstruct History</p>
          </div>
        </div>

        <div className="ios-surface p-10 relative overflow-hidden text-center">
          <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-8 shadow-inner">
            <Puzzle size={48} />
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Broken Timelines</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-10">
            The historical record has been fragmented. Drag and drop events into their correct chronological order to restore the timeline and earn massive XP.
          </p>
          
          <div className="space-y-4 mb-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-300 font-bold text-xs uppercase tracking-widest">
                Slot {i}
              </div>
            ))}
          </div>

          <button 
            onClick={() => setFeedback({ message: 'Puzzle Mode coming in next update!', type: 'info' })}
            className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-blue-500/30 active:scale-95 transition-all"
          >
            Start Solving
          </button>
        </div>
      </motion.div>
    );
  };

  const renderNarrativeStory = () => {
    const story = NARRATIVE_STORIES.find(s => s.id === activeNarrativeStoryId);
    if (!story) return null;

    const progress = profile.narrativeProgress[story.id] || { unlockedChapters: [], completed: false, chapterStories: {} };

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="max-w-md mx-auto px-4 pb-24"
      >
        <div className="flex items-center gap-4 mb-10">
          <motion.button 
            whileHover={{ scale: 1.1, x: -4 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setActiveNarrativeStoryId(null);
              setSelectedChapterId(null);
            }}
            className="w-12 h-12 ios-button rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft size={24} />
          </motion.button>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-gradient-blue leading-tight">{story.title}</h2>
            <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-1">Narrative Adventure</p>
          </div>
        </div>

        <div className="space-y-6">
          {story.chapters.map((chapter, index) => {
            const isUnlocked = progress.unlockedChapters.includes(chapter.id) || (index === 0 && coins.length > 0);
            const isSelected = selectedChapterId === chapter.id;
            const hasStory = !!progress.chapterStories[chapter.id];

            return (
              <motion.div
                key={chapter.id}
                layout
                className={`ios-surface overflow-hidden transition-all ${
                  isUnlocked ? 'opacity-100' : 'opacity-50 grayscale'
                } ${isSelected ? 'ring-2 ring-blue-500 shadow-2xl shadow-blue-500/20' : ''}`}
              >
                <button
                  onClick={() => {
                    if (!isUnlocked) {
                      setFeedback({ message: 'Chapter Locked! Add more coins to unlock.', type: 'info' });
                      return;
                    }
                    setSelectedChapterId(isSelected ? null : chapter.id);
                    if (!hasStory && isUnlocked) {
                      generateChapterStory(story.id, chapter.id);
                    }
                  }}
                  className="w-full p-8 text-left flex items-center justify-between"
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${
                      isUnlocked ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-gray-900 dark:text-white leading-tight">{chapter.title}</h4>
                      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                        {isUnlocked ? 'Chapter Unlocked' : 'Locked'}
                      </p>
                    </div>
                  </div>
                  {isUnlocked ? (
                    <ChevronDown size={20} className={`text-gray-300 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                  ) : (
                    <Lock size={18} className="text-gray-300" />
                  )}
                </button>

                <AnimatePresence>
                  {isSelected && isUnlocked && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-8 pb-8"
                    >
                      <div className="h-[1px] w-full bg-gray-100 dark:bg-gray-800 mb-6" />
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6 italic">
                        {chapter.description}
                      </p>
                      
                      <div className="p-6 rounded-3xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/20">
                        {hasStory ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen size={14} className="text-blue-600 dark:text-blue-400" />
                              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">The Story So Far</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                              {progress.chapterStories[chapter.id]}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center py-4 space-y-3">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Generating Narrative...</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  const generateChapterStory = async (storyId: string, chapterId: string) => {
    const story = NARRATIVE_STORIES.find(s => s.id === storyId);
    const chapter = story?.chapters.find(c => c.id === chapterId);
    if (!story || !chapter) return;

    // Find a relevant coin
    const relevantCoin = coins.find(c => {
      const req = chapter.requirement;
      if (req.rarity && c.rarity !== req.rarity) return false;
      if (req.yearRange) {
        const y = parseInt(c.year);
        if (isNaN(y) || y < req.yearRange[0] || y > req.yearRange[1]) return false;
      }
      return true;
    }) || coins[0];

    if (!relevantCoin) return;

    const prompt = `Generate a short, engaging historical narrative (max 80 words) for a coin collection app. 
    Story Theme: ${story.title}
    Chapter: ${chapter.title} - ${chapter.description}
    Featured Coin: ${relevantCoin.name} (${relevantCoin.year}, ${relevantCoin.type})
    The story should feel like a personal discovery or a historical snippet. Use a professional yet adventurous tone.`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const text = response.text || "History is still being written for this coin...";
      
      setProfile(prev => {
        const storyProgress = prev.narrativeProgress[storyId] || { unlockedChapters: [], completed: false, chapterStories: {} };
        const newUnlocked = [...new Set([...storyProgress.unlockedChapters, chapterId])];
        const isCompleted = newUnlocked.length === story.chapters.length;
        
        if (isCompleted && !storyProgress.completed && story.badgeId) {
          // Award badge if not already completed
          const badge = DEFAULT_BADGES.find(b => b.id === story.badgeId);
          if (badge && !prev.badges.some(b => b.id === badge.id)) {
            setTimeout(() => setFeedback({ message: `Story Completed! Earned ${story.title} Badge`, type: 'success' }), 1000);
          }
        }

        return {
          ...prev,
          narrativeProgress: {
            ...prev.narrativeProgress,
            [storyId]: {
              ...storyProgress,
              unlockedChapters: newUnlocked,
              completed: isCompleted,
              chapterStories: {
                ...storyProgress.chapterStories,
                [chapterId]: text
              }
            }
          },
          badges: isCompleted && story.badgeId && !prev.badges.some(b => b.id === story.badgeId)
            ? [...prev.badges, DEFAULT_BADGES.find(b => b.id === story.badgeId)!]
            : prev.badges
        };
      });
    } catch (error) {
      console.error("Failed to generate story:", error);
    }
  };

  const renderStoryHub = () => {
    if (activeNarrativeStoryId) return renderNarrativeStory();
    if (activeGameMode === 'era-conquest') return renderEraConquest();
    if (activeGameMode === 'timeline-puzzle') return renderTimelinePuzzle();
    
    const popularTimelines = allAvailableTimelines.filter(t => t.category === 'Popular');
    const newTimelines = allAvailableTimelines.filter(t => t.category === 'New');
    const allTimelines = allAvailableTimelines;

    const isTimelineLocked = (timeline: Timeline) => {
      if (!timeline.unlockCriteria) return false;
      const { coins: reqCoins, xp: reqXp, timelineId: reqTimelineId } = timeline.unlockCriteria;
      if (reqCoins && coins.length < reqCoins) return true;
      if (reqXp && profile.points < reqXp) return true;
      if (reqTimelineId) {
        const targetTimeline = allAvailableTimelines.find(t => t.id === reqTimelineId);
        const progress = profile.timelineProgress[reqTimelineId] || 0;
        if (!targetTimeline || progress < targetTimeline.events.length - 1) return true;
      }
      return false;
    };

    const getUnlockMessage = (timeline: Timeline) => {
      if (!timeline.unlockCriteria) return '';
      const { coins: reqCoins, xp: reqXp, timelineId: reqTimelineId } = timeline.unlockCriteria;
      if (reqCoins && coins.length < reqCoins) return `Add ${reqCoins} coins to unlock`;
      if (reqXp && profile.points < reqXp) return `Reach ${reqXp} XP to unlock`;
      if (reqTimelineId) {
        const target = allAvailableTimelines.find(t => t.id === reqTimelineId);
        return `Complete "${target?.title}" to unlock`;
      }
      return 'Locked';
    };

    const renderStoryCard = (item: Timeline | GameMode | NarrativeStory, type: 'timeline' | 'mode' | 'narrative') => {
      const isTimeline = type === 'timeline';
      const isMode = type === 'mode';
      const isNarrative = type === 'narrative';

      const timeline = isTimeline ? item as Timeline : null;
      const mode = isMode ? item as GameMode : null;
      const narrative = isNarrative ? item as NarrativeStory : null;
      
      const id = item.id;
      const title = item.title;
      const description = item.description;
      const Icon = isNarrative ? (item as NarrativeStory).icon : isMode ? (item as GameMode).icon : Clock;

      let progress = 0;
      let total = 1;
      let percent = 0;
      let locked = false;
      let unlockMsg = '';

      if (isTimeline && timeline) {
        progress = profile.timelineProgress[id] || 0;
        total = timeline.events.length;
        percent = total > 1 ? Math.round((progress / (total - 1)) * 100) : (progress === 0 ? 0 : 100);
        locked = isTimelineLocked(timeline);
        unlockMsg = getUnlockMessage(timeline);
      } else if (isMode && mode) {
        if (mode.id === 'era-conquest') {
          const erasProgress = ERAS.map(era => getEraProgress(era));
          const totalChallenges = erasProgress.reduce((acc, curr) => acc + curr.totalCount, 0);
          const completedChallenges = erasProgress.reduce((acc, curr) => acc + curr.completedCount, 0);
          progress = completedChallenges;
          total = totalChallenges;
          percent = Math.round((progress / total) * 100);
        }
        locked = mode.isLocked || false;
        unlockMsg = mode.unlockCriteria || 'Locked';
      } else if (isNarrative && narrative) {
        const narrProgress = profile.narrativeProgress[id] || { unlockedChapters: [], completed: false, chapterStories: {} };
        progress = narrProgress.unlockedChapters.length;
        total = narrative.chapters.length;
        percent = Math.round((progress / total) * 100);
        locked = false; // Narrative stories are generally unlocked if you have coins
      }

      const isActive = profile.lastStoryItemId === id || profile.lastTimelineId === id;

      return (
        <motion.button
          key={id}
          whileHover={locked ? {} : { scale: 1.02, y: -4 }}
          whileTap={locked ? {} : { scale: 0.98 }}
          onClick={() => {
            if (locked) {
              setFeedback({ message: unlockMsg, type: 'info' });
              return;
            }
            setProfile(prev => ({ ...prev, lastStoryItemId: id }));
            if (isTimeline) {
              setSelectedTimelineId(id);
              setActiveTab('explore');
              setExploreMode('timeline');
            } else if (isMode && mode) {
              if (mode.id === 'timeline-explorer') {
                setActiveTab('explore');
                setExploreMode('timeline');
                setSelectedTimelineId(null);
              } else if (mode.id === 'my-coin-story') {
                setActiveTab('explore');
                setExploreMode('timeline');
                setSelectedTimelineId('my-coin-story');
              } else {
                setActiveGameMode(mode.id);
              }
            } else if (isNarrative) {
              setActiveNarrativeStoryId(id);
            }
          }}
          className={`flex-shrink-0 w-64 p-7 rounded-[2.75rem] text-left transition-all relative overflow-hidden ${
            locked
              ? 'bg-gray-100/40 dark:bg-gray-800/40 text-gray-400 cursor-not-allowed border-gray-200/30 dark:border-gray-700/30'
              : isActive 
                ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-2xl shadow-blue-500/40 border-blue-400/30' 
                : 'ios-surface text-gray-900 dark:text-white'
          }`}
        >
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                  <Icon size={20} />
                </div>
                <h4 className="font-black text-lg leading-tight line-clamp-1 tracking-tight">{title}</h4>
              </div>
              {locked && <Lock size={16} className="text-gray-400/60" />}
            </div>
            <p className={`text-[11px] font-bold leading-relaxed line-clamp-2 mb-6 ${locked ? 'text-gray-400/60' : isActive ? 'text-blue-100/80' : 'text-gray-400 dark:text-gray-500'}`}>
              {locked ? unlockMsg : description}
            </p>
            <div className="flex items-center justify-between mt-auto">
              <div className="flex flex-col flex-1 mr-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${locked ? 'text-gray-400/60' : isActive ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'}`}>
                    {percent}%
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-tighter opacity-60 ${locked ? 'text-gray-400/60' : isActive ? 'text-white' : 'text-gray-400'}`}>
                    {progress}/{total}
                  </span>
                </div>
                <div className={`h-2 w-full rounded-full overflow-hidden ${locked ? 'bg-gray-200/50 dark:bg-gray-700/50' : isActive ? 'bg-white/20' : 'bg-gray-100/50 dark:bg-gray-800/50'}`}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                    className={`h-full rounded-full ${locked ? 'bg-gray-300' : isActive ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'bg-gradient-to-r from-blue-400 to-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} 
                  />
                </div>
              </div>
              {!locked && <ChevronRight size={20} className={isActive ? 'text-white/80' : 'text-gray-300 dark:text-gray-600'} />}
            </div>
          </div>
          {isActive && !locked && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          )}
        </motion.button>
      );
    };

    const lastItem = profile.lastStoryItemId 
      ? (GAME_MODES.find(m => m.id === profile.lastStoryItemId) || 
         allAvailableTimelines.find(t => t.id === profile.lastStoryItemId) ||
         NARRATIVE_STORIES.find(s => s.id === profile.lastStoryItemId))
      : (profile.lastTimelineId ? allAvailableTimelines.find(t => t.id === profile.lastTimelineId) : null);

    const lastItemType = profile.lastStoryItemId 
      ? (GAME_MODES.some(m => m.id === profile.lastStoryItemId) ? 'mode' : 
         NARRATIVE_STORIES.some(s => s.id === profile.lastStoryItemId) ? 'narrative' : 'timeline')
      : 'timeline';

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        className="max-w-md mx-auto px-4 pb-24 space-y-12"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-black tracking-tighter text-gradient-blue leading-none">Story Mode</h2>
            <p className="text-gray-400 dark:text-gray-500 text-[11px] font-bold uppercase tracking-widest mt-2">Your journey through history</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end text-orange-500 font-black text-lg">
                <Flame size={18} className="fill-orange-500/20" />
                <span>{profile.timelineStreak}</span>
              </div>
              <p className="text-[8px] uppercase tracking-widest font-black text-gray-400/60 mt-0.5">Streak</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-blue-600 dark:text-blue-400 leading-none">{profile.points}</p>
              <p className="text-[8px] uppercase tracking-widest font-black text-gray-400/60 mt-1">Total XP</p>
            </div>
          </div>
        </div>

        {lastItem && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <PlayCircle size={12} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-[11px] font-black text-gray-400/80 dark:text-gray-500 uppercase tracking-[0.2em]">Continue Exploring</h3>
            </div>
            <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2 px-1 snap-x">
              <div className="snap-start">
                {renderStoryCard(lastItem as any, lastItemType as any)}
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <BookOpen size={12} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-[11px] font-black text-gray-400/80 dark:text-gray-500 uppercase tracking-[0.2em]">Narrative Stories</h3>
          </div>
          <div className="flex gap-5 overflow-x-auto no-scrollbar pb-6 px-1 snap-x">
            {NARRATIVE_STORIES.map(story => (
              <div key={story.id} className="snap-start">
                {renderStoryCard(story, 'narrative')}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-6 h-6 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <History size={12} className="text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-[11px] font-black text-gray-400/80 dark:text-gray-500 uppercase tracking-[0.2em]">Timelines</h3>
          </div>
          <div className="flex gap-5 overflow-x-auto no-scrollbar pb-6 px-1 snap-x">
            {allAvailableTimelines.map(t => (
              <div key={t.id} className="snap-start">
                {renderStoryCard(t, 'timeline')}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <Trophy size={12} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-[11px] font-black text-gray-400/80 dark:text-gray-500 uppercase tracking-[0.2em]">Game Modes</h3>
          </div>
          <div className="flex gap-5 overflow-x-auto no-scrollbar pb-6 px-1 snap-x">
            {GAME_MODES.map(m => (
              <div key={m.id} className="snap-start">
                {renderStoryCard(m, 'mode')}
              </div>
            ))}
          </div>
        </section>
      </motion.div>
    );
  };

  const SettingAction = ({ icon: Icon, title, description, onClick, color = "text-blue-600" }: { icon: any, title: string, description: string, onClick: () => void, color?: string }) => (
    <button 
      onClick={onClick}
      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
          <Icon size={20} />
        </div>
        <div className="flex flex-col items-start">
          <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{title}</span>
          <span className="text-[10px] text-gray-400 font-medium">{description}</span>
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
    </button>
  );

  return (
    <ErrorBoundary onExport={exportData}>
      <AmbientBackground enabled={profile.preferences.ambientMotionEnabled} />
      <div className={`min-h-screen ios-base text-gray-900 dark:text-gray-100 font-sans transition-colors relative ${profile.preferences.showBottomMenu ? 'pb-24' : 'pb-12'}`}>
        {/* Global Texture Overlay - Extremely subtle as per request */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.01] dark:opacity-[0.02] z-50 bg-[url('https://www.transparenttextures.com/patterns/p6.png')]" />
        
        <input 
          type="file" 
          ref={importInputRef} 
          onChange={importData} 
          accept=".json" 
          className="hidden" 
        />

        {renderHeader()}

        <main className="max-w-md mx-auto px-[var(--spacing-fluid)] pt-4">
          {renderTabs()}
          {renderBottomMenu()}

          <AnimatePresence mode="wait">
            {activeTab === 'explore' && renderExplore()}
            
            {activeTab === 'collection' && (
              <motion.div
                key="collection"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={isCompact ? 'space-y-3' : 'space-y-4'}
              >
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search collection..."
                    className={`w-full pl-11 pr-4 ${isCompact ? 'py-3' : 'py-4'} ios-surface border-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-400 font-medium`}
                  />
                  {searchQuery && (
                    <motion.button 
                      whileTap={{ scale: 0.8 }}
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      <X size={16} />
                    </motion.button>
                  )}
                </div>

                {/* Folder Selector */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    onClick={() => setSelectedFolderId('all')}
                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                      selectedFolderId === 'all' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    All Coins
                  </button>
                  {folders.map(folder => (
                    <div key={folder.id} className="relative flex-shrink-0">
                      <button
                        onClick={() => {
                          if (folder.isLocked && !unlockedFolders.includes(folder.id)) {
                            const code = prompt('Enter Vault Passcode (Default: 1234):');
                            if (code === '1234') {
                              setUnlockedFolders([...unlockedFolders, folder.id]);
                              setSelectedFolderId(folder.id);
                            } else {
                              setFeedback({ message: 'Incorrect passcode', type: 'error' });
                            }
                          } else {
                            setSelectedFolderId(folder.id);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setConfirmModal({
                            title: folder.isLocked ? 'Unlock Folder Permanently?' : 'Lock this Folder?',
                            message: folder.isLocked ? 'This will remove the passcode protection.' : 'This will hide coins in this folder until unlocked with a passcode.',
                            onConfirm: () => {
                              setFolders(folders.map(f => f.id === folder.id ? { ...f, isLocked: !f.isLocked } : f));
                              setFeedback({ message: `Folder ${folder.isLocked ? 'unlocked' : 'locked'}!`, type: 'success' });
                            }
                          });
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                          selectedFolderId === folder.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'
                        }`}
                      >
                        {folder.isLocked && (
                          unlockedFolders.includes(folder.id) ? <Unlock size={12} /> : <Lock size={12} />
                        )}
                        {folder.name}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Sorting & Grouping Controls */}
                <div className="flex flex-col gap-3 bg-white dark:bg-gray-900 p-4 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">View Options</span>
                    <button 
                      onClick={() => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, groupViewEnabled: !prev.preferences.groupViewEnabled } }))}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                        profile.preferences.groupViewEnabled 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20' 
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'
                      }`}
                    >
                      <Layers size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {profile.preferences.groupViewEnabled ? 'Grouping On' : 'Grouping Off'}
                      </span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                      <Layout size={14} className="text-gray-400" />
                      <div className="flex flex-col flex-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Sort By</span>
                        <select 
                          value={profile.preferences.sortBy}
                          onChange={(e) => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, sortBy: e.target.value as SortOption } }))}
                          className="text-[11px] font-black uppercase tracking-tight bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-gray-700 dark:text-gray-200 w-full"
                        >
                          <option value="added">Date Added</option>
                          <option value="month">Month Added</option>
                          <option value="year">Coin Year</option>
                          <option value="denomination">Denomination</option>
                          <option value="name">Coin Name</option>
                          <option value="opened">Recently Opened</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                      <Grid size={14} className="text-gray-400" />
                      <div className="flex flex-col flex-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Group By</span>
                        <select 
                          value={profile.preferences.groupBy}
                          onChange={(e) => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, groupBy: e.target.value as GroupOption } }))}
                          className="text-[11px] font-black uppercase tracking-tight bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-gray-700 dark:text-gray-200 w-full"
                          disabled={!profile.preferences.groupViewEnabled}
                        >
                          <option value="none">No Grouping</option>
                          <option value="year">Year</option>
                          <option value="denomination">Denom</option>
                          <option value="date">Exact Date</option>
                          <option value="month">Month</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add Button / Form */}
                {!isAdding ? (
                      <motion.button
                        id="add-coin-btn"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          resetForm();
                          if (selectedFolderId !== 'all') {
                            setNewFolderId(selectedFolderId);
                          }
                          setIsAdding(true);
                        }}
                        className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:bg-blue-700 transition-colors"
                      >
                        <Plus size={22} /> {profile.preferences.quickAddMode ? 'Quick Add' : 'Add New Coin'}
                      </motion.button>
                ) : (
                  <motion.form
                    id="add-coin-form"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onSubmit={addCoin}
                    className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg">{isEditing ? 'Edit Coin' : (profile.preferences.quickAddMode ? 'Quick Add' : 'New Coin')}</h3>
                      <button type="button" onClick={resetForm} className="text-gray-400"><X size={20} /></button>
                    </div>

                    {/* Image Upload - Hidden in Quick Add unless editing */}
                    {(!profile.preferences.quickAddMode || isEditing) && (
                      <div 
                        onClick={() => !isProcessingImage && fileInputRef.current?.click()}
                        className="w-full aspect-video bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
                      >
                        {isProcessingImage ? (
                          <div className="flex flex-col items-center gap-2 p-4 text-center">
                            <Loader2 size={32} className="text-blue-600 animate-spin" />
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Removing Background...</span>
                          </div>
                        ) : newImage ? (
                          <img src={newImage} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <ImageIcon className="text-gray-300 mb-2" size={32} />
                            <span className="text-xs font-bold text-gray-400">Add Coin Image</span>
                          </>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Coin Name</label>
                      <input
                        autoFocus
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Kew Gardens"
                        className="w-full h-[48px] px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Year</label>
                        <input
                          type="number"
                          value={newYear}
                          onChange={(e) => setNewYear(e.target.value)}
                          className="w-full h-[48px] px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Type</label>
                        <select
                          value={newType}
                          onChange={(e) => {
                            const type = e.target.value as CoinType;
                            setNewType(type);
                            if (profile.preferences.fixedPriceMode && !isEditing) {
                              const fixedPrice = profile.preferences.denominationPrices[type];
                              if (fixedPrice !== undefined) {
                                setNewAmountPaid(fixedPrice.toString());
                              }
                            }
                          }}
                          className="w-full h-[48px] px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                        >
                          {[...DEFAULT_DENOMINATIONS, ...profile.preferences.customDenominations].map(denom => (
                            <option key={denom} value={denom}>{denom}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {(!profile.preferences.quickAddMode || isEditing) && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Amount Paid (£)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={newAmountPaid}
                              onChange={(e) => setNewAmountPaid(e.target.value)}
                              className="w-full h-[48px] px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Rarity</label>
                            <select
                              value={newRarity}
                              onChange={(e) => setNewRarity(e.target.value as Rarity)}
                              className="w-full h-[48px] px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                            >
                              <option value="Common">Common</option>
                              <option value="Rare">Rare</option>
                              <option value="Very Rare">Very Rare</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Mint</label>
                            <input
                              type="text"
                              value={newMint}
                              onChange={(e) => setNewMint(e.target.value)}
                              placeholder="e.g. Royal Mint"
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Era</label>
                            <input
                              type="text"
                              value={newEra}
                              onChange={(e) => setNewEra(e.target.value)}
                              placeholder="e.g. Elizabethan"
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tags (comma separated)</label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {newTags.map(tag => (
                              <span key={tag} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                                {tag}
                                <button type="button" onClick={() => setNewTags(newTags.filter(t => t !== tag))}><X size={10} /></button>
                              </span>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                const tag = tagInput.trim().replace(',', '');
                                if (tag && !newTags.includes(tag)) {
                                  setNewTags([...newTags, tag]);
                                  setTagInput('');
                                }
                              }
                            }}
                            placeholder="Add tags..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Summary (Max 100 chars)</label>
                          <textarea
                            rows={2}
                            maxLength={100}
                            value={newSummary}
                            onChange={(e) => setNewSummary(e.target.value)}
                            placeholder="Brief description..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm font-medium"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Folder</label>
                      <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
                        {[...DEFAULT_DENOMINATIONS, ...profile.preferences.customDenominations].map(denom => {
                          const exists = folders.find(f => f.name === denom);
                          return (
                            <button
                              key={denom}
                              type="button"
                              onClick={() => {
                                if (exists) {
                                  setNewFolderId(exists.id);
                                } else {
                                  const id = crypto.randomUUID();
                                  setFolders(prev => [...prev, { id, name: denom, isDefault: false }]);
                                  setNewFolderId(id);
                                  setFeedback({ message: `Created ${denom} folder`, type: 'success' });
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                folders.find(f => f.id === newFolderId)?.name === denom
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                              }`}
                            >
                              {denom}
                            </button>
                          );
                        })}
                      </div>
                      <select
                        value={newFolderId}
                        onChange={(e) => {
                          if (e.target.value === 'new') {
                            setInputModal({
                              title: 'New Folder',
                              placeholder: 'Folder name...',
                              onConfirm: (name) => {
                                const trimmedName = name.trim();
                                if (trimmedName) {
                                  const existing = folders.find(f => f.name.toLowerCase() === trimmedName.toLowerCase());
                                  if (existing) {
                                    setNewFolderId(existing.id);
                                    setFeedback({ message: 'Using existing folder', type: 'info' });
                                  } else {
                                    const id = crypto.randomUUID();
                                    setFolders(prev => [...prev, { id, name: trimmedName, isDefault: false }]);
                                    setNewFolderId(id);
                                    setFeedback({ message: 'New folder created', type: 'success' });
                                  }
                                }
                              }
                            });
                          } else {
                            setNewFolderId(e.target.value);
                          }
                        }}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                      >
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        <option value="new">+ Create New Folder</option>
                      </select>
                    </div>

                    <motion.button
                      type="submit"
                      whileTap={{ scale: 0.95 }}
                      className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold mt-2 shadow-lg shadow-blue-100 dark:shadow-none"
                    >
                      {isEditing ? 'Update Coin' : 'Save Coin'}
                    </motion.button>
                  </motion.form>
                )}

                {/* List */}
                {!isAppReady ? (
                  <div className={isCompact ? 'space-y-2' : 'space-y-4'}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <React.Fragment key={i}>
                        {renderSkeletonCard()}
                      </React.Fragment>
                    ))}
                  </div>
                ) : sortedCoins.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-24 text-center bg-gray-50/50 dark:bg-gray-800/20 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-700"
                  >
                    <div className="w-20 h-20 bg-white dark:bg-gray-900 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gray-100 dark:shadow-none">
                      {searchQuery ? <Search size={32} className="text-blue-500" /> : <Coins size={32} className="text-blue-500" />}
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                      {searchQuery ? 'No Match Found' : 'Your Collection is Empty'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 font-medium max-w-[200px] mx-auto leading-relaxed">
                      {searchQuery ? `We couldn't find anything for "${searchQuery}"` : 'Start your journey by adding your first coin!'}
                    </p>
                    {searchQuery ? (
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSearchQuery('')}
                        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none"
                      >
                        Clear Search
                      </motion.button>
                    ) : (
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          resetForm();
                          setIsAdding(true);
                        }}
                        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none"
                      >
                        Add First Coin
                      </motion.button>
                    )}
                  </motion.div>
                ) : (
                  profile.preferences.purchaseMode ? (
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
                            <th className="p-6 text-lg font-black text-gray-900 dark:text-white uppercase tracking-widest">Coin</th>
                            <th className="p-6 text-lg font-black text-gray-900 dark:text-white uppercase tracking-widest">Year</th>
                            <th className="p-6 text-lg font-black text-gray-900 dark:text-white uppercase tracking-widest text-right">View</th>
                          </tr>
                        </thead>
                        {profile.preferences.groupViewEnabled && groupedCoins ? (
                          Object.entries(groupedCoins as Record<string, Coin[]>).map(([groupName, groupCoins]) => (
                            <React.Fragment key={groupName}>
                              <tbody className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                  <td colSpan={3} className="px-6 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-y border-gray-100 dark:border-gray-800">
                                    {groupName} ({groupCoins.length})
                                  </td>
                                </tr>
                              </tbody>
                              <tbody className="divide-y-2 divide-gray-100 dark:divide-gray-800">
                                {groupCoins.map((coin) => (
                                  <tr 
                                    key={coin.id} 
                                    onClick={() => openCoin(coin)}
                                    className="active:bg-blue-50 dark:active:bg-blue-900/20 transition-colors cursor-pointer"
                                  >
                                    <td className="p-6">
                                      <div className="flex flex-col">
                                        <span className="text-3xl font-black text-gray-900 dark:text-white">{coin.type}</span>
                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{coin.name}</span>
                                      </div>
                                    </td>
                                    <td className="p-6">
                                      <span className="text-3xl font-black text-gray-900 dark:text-white">{coin.year}</span>
                                    </td>
                                    <td className="p-6 text-right">
                                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800">
                                        <ChevronRight size={32} className="text-gray-900 dark:text-white" />
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </React.Fragment>
                          ))
                        ) : (
                          <tbody className="divide-y-2 divide-gray-100 dark:divide-gray-800">
                            {sortedCoins.map((coin) => (
                              <tr 
                                key={coin.id} 
                                onClick={() => openCoin(coin)}
                                className="active:bg-blue-50 dark:active:bg-blue-900/20 transition-colors cursor-pointer"
                              >
                                <td className="p-6">
                                  <div className="flex flex-col">
                                    <span className="text-3xl font-black text-gray-900 dark:text-white">{coin.type}</span>
                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{coin.name}</span>
                                  </div>
                                </td>
                                <td className="p-6">
                                  <span className="text-3xl font-black text-gray-900 dark:text-white">{coin.year}</span>
                                </td>
                                <td className="p-6 text-right">
                                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800">
                                    <ChevronRight size={32} className="text-gray-900 dark:text-white" />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        )}
                      </table>
                    </div>
                  ) : (
                    profile.preferences.groupViewEnabled && groupedCoins ? (
                      <div className="space-y-8">
                        {Object.entries(groupedCoins as Record<string, Coin[]>).map(([groupName, groupCoins]) => (
                          <div key={groupName} className="space-y-3">
                            <div className="flex items-center gap-3 px-2">
                              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{groupName}</h3>
                              <div className="h-[1px] flex-1 bg-gray-100 dark:bg-gray-800" />
                              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{groupCoins.length}</span>
                            </div>
                            <div className={isCompact ? 'space-y-2' : 'space-y-4'}>
                              {groupCoins.map(coin => renderCoinCard(coin))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={isCompact ? 'space-y-2' : 'space-y-4'}>
                        {sortedCoins.map((coin) => renderCoinCard(coin))}
                      </div>
                    )
                  )
                )}
              </motion.div>
            )}

            {activeTab === 'library' && (
              <motion.div
                key="library"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6 pb-24"
              >
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-2xl font-black text-gray-800 dark:text-gray-200">Image Library</h2>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{coins.filter(c => c.image).length} Images</span>
                </div>

                {coins.filter(c => c.image).length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-24 text-center bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm"
                  >
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <ImageIcon size={32} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Visual Gallery Empty</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-sm max-w-[220px] mx-auto leading-relaxed">
                      Add photos to your coins to build your visual library.
                    </p>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {coins.filter(c => c.image).map(coin => (
                      <motion.button
                        key={coin.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openCoin(coin)}
                        className="aspect-square bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-2 shadow-sm overflow-hidden"
                      >
                        <img 
                          src={coin.image!} 
                          alt={coin.name} 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                {/* Suggestion */}
                <div className="bg-blue-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-blue-100 dark:shadow-none relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="relative z-10">
                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Daily Suggestion</p>
                    <h3 className="text-2xl font-black leading-tight italic">"{suggestion}"</h3>
                  </div>
                </div>

                {/* Pattern Insights */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-black text-gray-800 dark:text-gray-200">Pattern Insights</h3>
                    <TrendingUp size={18} className="text-blue-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="ios-surface p-5 h-[86px] flex flex-col justify-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Most Collected</p>
                      <p className="text-xl font-black text-gray-800 dark:text-gray-200 truncate">{stats.insights.mostCollectedType}</p>
                    </div>
                    <div className="ios-surface p-5 h-[86px] flex flex-col justify-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Peak Year</p>
                      <p className="text-xl font-black text-gray-800 dark:text-gray-200 truncate">{stats.insights.mostCollectedYear || 'N/A'}</p>
                    </div>
                    <div className="ios-surface p-5 col-span-2 h-[86px] flex flex-col justify-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg. Paid per Coin</p>
                      <p className="text-xl font-black text-green-600 dark:text-green-400 truncate">£{stats.insights.averagePaid.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Smart Goals */}
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-gray-800 dark:text-gray-200 px-2">Collection Goals</h3>
                  <div className="grid gap-4">
                    {stats.goals.map(goal => (
                      <div key={goal.id} className="bg-white dark:bg-gray-900 p-5 h-[84px] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
                        {goal.isCompleted && (
                          <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 rounded-bl-xl text-[8px] font-black uppercase tracking-widest">Completed</div>
                        )}
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-gray-800 dark:text-gray-200 truncate pr-4">{goal.title}</span>
                          <span className="text-xs font-black text-gray-400 flex-shrink-0">{Math.round(goal.current)} / {goal.target}</span>
                        </div>
                        <div className="h-2 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                            className={`h-full rounded-full ${goal.isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-black text-gray-800 dark:text-gray-200">Progress by Type</h3>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{stats.completion}% Total</span>
                  </div>
                  <div className="grid gap-4">
                    {[...DEFAULT_DENOMINATIONS, ...profile.preferences.customDenominations].map((type) => {
                      const count = stats.counts[type] || 0;
                      const percent = Math.min((count / TARGET_PER_TYPE) * 100, 100);
                      return (
                        <div key={type} className="bg-white dark:bg-gray-900 p-5 h-[108px] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 flex flex-col justify-center">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                                type === '50p' ? 'bg-blue-50 text-blue-600' :
                                type === '£1' ? 'bg-indigo-50 text-indigo-600' : 
                                type === '£2' ? 'bg-purple-50 text-purple-600' : 
                                ['Farthing', 'Half Penny', 'Penny'].includes(type) ? 'bg-amber-50 text-amber-600' :
                                ['Threepence', 'Sixpence', 'Shilling'].includes(type) ? 'bg-emerald-50 text-emerald-600' :
                                ['Florin', 'Half Crown', 'Crown'].includes(type) ? 'bg-rose-50 text-rose-600' :
                                'bg-gray-50 text-gray-600'
                              }`}>
                                {type}
                              </div>
                              <span className="font-black text-gray-800 dark:text-gray-200 truncate">{type} Coins</span>
                            </div>
                            <span className="text-sm font-black text-gray-400 flex-shrink-0">{count} / {TARGET_PER_TYPE}</span>
                          </div>
                          <div className="h-3 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percent}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                type === '50p' ? 'bg-blue-500' :
                                type === '£1' ? 'bg-indigo-500' :
                                type === '£2' ? 'bg-purple-500' :
                                ['Farthing', 'Half Penny', 'Penny'].includes(type) ? 'bg-amber-500' :
                                ['Threepence', 'Sixpence', 'Shilling'].includes(type) ? 'bg-emerald-500' :
                                ['Florin', 'Half Crown', 'Crown'].includes(type) ? 'bg-rose-500' :
                                'bg-gray-400'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Monthly Totals */}
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-gray-800 dark:text-gray-200 px-2">Collection History</h3>
                  <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800 overflow-hidden shadow-sm">
                    {Object.entries(stats.monthlyTotals).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6).map(([month, data]) => {
                      const { count, spend } = data as { count: number; spend: number };
                      const [year, m] = month.split('-');
                      const date = new Date(parseInt(year), parseInt(m) - 1);
                      const monthName = date.toLocaleString('default', { month: 'long' });
                      return (
                        <div key={month} className="p-5 flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-600 dark:text-gray-400">{monthName} {year}</span>
                            <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">£{spend.toFixed(2)} Spent</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-blue-600 dark:text-blue-400">+{count}</span>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Coins</span>
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(stats.monthlyTotals).length === 0 && (
                      <div className="p-10 text-center text-gray-400 italic font-medium">No history yet. Start adding coins!</div>
                    )}
                  </div>
                </div>

                {/* Duplicates */}
                {stats.duplicateList.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-gray-800 dark:text-gray-200 px-2">Duplicates Tracked</h3>
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800 overflow-hidden shadow-sm">
                      {stats.duplicateList.map(({ count, coin, dates }) => (
                        <div key={coin.id} className="p-5 flex flex-col gap-3 group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-400 shadow-inner">
                                {coin.type}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800 dark:text-gray-200">{coin.name}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{coin.year}</p>
                              </div>
                            </div>
                            <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                              {count} Owned
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {dates.sort((a, b) => b - a).map((date, idx) => (
                              <span key={idx} className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                                {new Date(date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* Profile Card */}
                {profile.preferences.showProgressCard && (
                  <div className="ios-surface p-6 flex items-center gap-6 mb-2">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[1.75rem] flex items-center justify-center text-white shadow-xl shadow-blue-200/50 dark:shadow-none">
                      <User size={40} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black tracking-tight text-gray-800 dark:text-gray-100">{profile.name}</h3>
                      {profile.preferences.showRankSystem && (
                        <>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">{currentLevel.name} Collector</p>
                            {nextLevel && (
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 leading-none">Level {LEVELS.indexOf(currentLevel) + 1}</span>
                            )}
                          </div>
                          {nextLevel && (
                            <div className="mt-3">
                              <div className="flex justify-between text-[10px] font-black text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-widest">
                                <span>Next: {nextLevel.name}</span>
                                <span>{Math.round(progressToNextLevel)}%</span>
                              </div>
                              <div className="h-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progressToNextLevel}%` }}
                                  transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                                  className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Collector Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="ios-surface p-5">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Value</p>
                    <p className="text-2xl font-black text-green-600 dark:text-green-400 tracking-tight">£{stats.totalSpend.toFixed(2)}</p>
                  </div>
                  <div className="ios-surface p-5">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Points</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{profile.points}</p>
                  </div>
                </div>

                {/* Collector Identity & Timeline Section */}
                <div className="grid grid-cols-2 gap-4">
                  {profile.preferences.showCollectorCard && (
                    <motion.button 
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowCollectorCard(true)}
                      className="p-6 bg-blue-600 text-white rounded-[2rem] font-black text-sm flex flex-col items-center justify-center gap-3 shadow-xl shadow-blue-200/50 dark:shadow-none active:scale-95 transition-all"
                    >
                      <User size={28} />
                      <span className="tracking-tight">Identity Card</span>
                    </motion.button>
                  )}
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActiveTab('explore');
                      setExploreMode('timeline');
                    }}
                    className={`p-6 rounded-[2rem] font-black text-sm flex flex-col items-center justify-center gap-3 shadow-xl active:scale-95 transition-all ${
                      profile.preferences.showCollectorCard ? 'ios-surface text-gray-800 dark:text-gray-100' : 'col-span-2 ios-surface text-gray-800 dark:text-gray-100'
                    }`}
                  >
                    <History size={28} className="text-blue-600" />
                    <span className="tracking-tight">Timeline Hub</span>
                  </motion.button>
                </div>

                {/* Hidden Settings (Unlocked via Milestones) */}
                {/* Settings Categories */}
                <div className="space-y-4">
                  <SettingsSection id="display" title="Display" icon={Layout}>
                    <SettingSelect 
                      label="Theme Mode" 
                      icon={Palette} 
                      value={profile.preferences.theme}
                      onChange={(val) => setProfile({ ...profile, preferences: { ...profile.preferences, theme: val as any } })}
                      options={[
                        { value: 'system', label: 'System' },
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'paper', label: 'Paper' },
                        { value: 'glass', label: 'Glass' },
                        { value: 'wood', label: 'Wood' },
                        { value: 'metal', label: 'Metal' },
                        { value: 'fabric', label: 'Fabric' }
                      ]}
                    />
                    <SettingToggle 
                      label="Compact UI" 
                      icon={Smartphone} 
                      value={isCompact}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, compactUI: !profile.preferences.compactUI } })}
                      badge={windowWidth < 380 ? "Auto-Active" : undefined}
                      description="Denser layout for more content"
                    />
                    <SettingToggle 
                      label="Text Mode UI" 
                      icon={ListIcon} 
                      value={profile.preferences.textMode}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, textMode: !profile.preferences.textMode } })}
                      description="Minimal text-only interface"
                    />
                    <SettingToggle 
                      label="Show Coin Price" 
                      icon={Coins} 
                      value={profile.preferences.showPrice}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showPrice: !profile.preferences.showPrice } })}
                      description="Display estimated value on coins"
                    />
                    <SettingToggle 
                      label="Purchase Mode" 
                      icon={TrendingUp} 
                      value={profile.preferences.purchaseMode}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, purchaseMode: !profile.preferences.purchaseMode } })}
                      description="Enable price tracking for additions"
                    />
                    <SettingToggle 
                      label="Focus Mode" 
                      icon={Target} 
                      value={profile.preferences.focusMode}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, focusMode: !profile.preferences.focusMode } })}
                      description="Hide non-essential UI elements"
                    />
                    <SettingToggle 
                      label="Show Top Summary" 
                      icon={Layout} 
                      value={profile.preferences.showTopSummary}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showTopSummary: !profile.preferences.showTopSummary } })}
                      description="Quick stats at the top of the screen"
                    />
                    <SettingToggle 
                      label="Bottom Menu" 
                      icon={Columns} 
                      value={profile.preferences.showBottomMenu}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showBottomMenu: !profile.preferences.showBottomMenu } })}
                      description="Toggle main navigation visibility"
                    />
                    <SettingToggle 
                      label="Performance Mode" 
                      icon={Gauge} 
                      value={profile.preferences.performanceMode}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, performanceMode: !profile.preferences.performanceMode } })}
                      description="Reduce animations for speed"
                    />
                    <SettingToggle 
                      label="Progress Card" 
                      icon={User} 
                      value={profile.preferences.showProgressCard}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showProgressCard: !profile.preferences.showProgressCard } })}
                      description="Show/Hide top profile header"
                    />
                    <SettingToggle 
                      label="Rank System" 
                      icon={Award} 
                      value={profile.preferences.showRankSystem}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showRankSystem: !profile.preferences.showRankSystem } })}
                      description="Show/Hide collector level & XP"
                    />
                    <SettingToggle 
                      label="Ambient Motion" 
                      icon={Activity} 
                      value={profile.preferences.ambientMotionEnabled}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, ambientMotionEnabled: !profile.preferences.ambientMotionEnabled } })}
                      description="Subtle background movement"
                    />
                    <SettingToggle 
                      label="Show Folder" 
                      icon={FolderIcon} 
                      value={profile.preferences.showFolder}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showFolder: !profile.preferences.showFolder } })}
                      description="Display folder name on coin cards"
                    />
                  </SettingsSection>

                  <SettingsSection id="coins" title="Coin Management" icon={Database}>
                    <SettingToggle 
                      label="Show Collector Card" 
                      icon={User} 
                      value={profile.preferences.showCollectorCard}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showCollectorCard: !profile.preferences.showCollectorCard } })}
                      description="Quick access to identity card"
                    />
                    <SettingToggle 
                      label="Quick Add Mode" 
                      icon={Zap} 
                      value={profile.preferences.quickAddMode}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, quickAddMode: !profile.preferences.quickAddMode } })}
                      description="Skip details when adding coins"
                    />
                    <SettingToggle 
                      label="Background Removal" 
                      icon={Layers} 
                      value={profile.preferences.autoRemoveBackground}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, autoRemoveBackground: !profile.preferences.autoRemoveBackground } })}
                      description="Auto-clean coin photos (AI)"
                    />
                    <SettingToggle 
                      label="Experimental Features" 
                      icon={Lightbulb} 
                      value={profile.preferences.experimentalFeatures}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, experimentalFeatures: !profile.preferences.experimentalFeatures } })}
                      description="Try out new unreleased tools"
                    />
                    <SettingToggle 
                      label="Fixed Price Mode" 
                      icon={Tag} 
                      value={profile.preferences.fixedPriceMode}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, fixedPriceMode: !profile.preferences.fixedPriceMode } })}
                      description="Auto-fill price based on denomination"
                    />
                    {profile.preferences.fixedPriceMode && (
                      <div className="px-5 pb-5 space-y-3 bg-blue-50/10 dark:bg-blue-900/5">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Set Fixed Prices</p>
                        <div className="max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                          <div className="grid grid-cols-3 gap-2">
                            {[...DEFAULT_DENOMINATIONS, ...profile.preferences.customDenominations].map(type => (
                              <div key={type} className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase ml-1 truncate block" title={type}>{type}</label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">£</span>
                                  <input 
                                    type="number"
                                    step="0.01"
                                    value={profile.preferences.denominationPrices[type] || 0}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setProfile({
                                        ...profile,
                                        preferences: {
                                          ...profile.preferences,
                                          denominationPrices: {
                                            ...profile.preferences.denominationPrices,
                                            [type]: val
                                          }
                                        }
                                      });
                                    }}
                                    className="w-full h-[36px] pl-6 pr-2 py-2.5 bg-white dark:bg-gray-800 rounded-xl text-xs font-bold border border-gray-100 dark:border-gray-800 focus:ring-2 focus:ring-blue-500/50 transition-all"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <SettingSelect 
                      label="Sort By" 
                      icon={Clock} 
                      value={profile.preferences.sortBy}
                      onChange={(val) => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, sortBy: val as any } }))}
                      options={[
                        { value: 'added', label: 'Date Added' },
                        { value: 'month', label: 'Month Added' },
                        { value: 'year', label: 'Coin Year' },
                        { value: 'denomination', label: 'Denomination' },
                        { value: 'name', label: 'Coin Name' },
                        { value: 'opened', label: 'Recently Opened' }
                      ]}
                    />
                    <SettingSelect 
                      label="Group By" 
                      icon={Grid} 
                      value={profile.preferences.groupBy}
                      onChange={(val) => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, groupBy: val as any } }))}
                      options={[
                        { value: 'none', label: 'No Grouping' },
                        { value: 'year', label: 'Year' },
                        { value: 'denomination', label: 'Denomination' },
                        { value: 'date', label: 'Exact Date' },
                        { value: 'month', label: 'Month' }
                      ]}
                    />
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-700 dark:text-gray-300 block">Custom Denominations</span>
                        <button 
                          onClick={() => {
                            setModalInputValue('');
                            setInputModal({
                              title: 'New Denomination',
                              placeholder: 'e.g. 5p, 10p, Custom',
                              onConfirm: (name) => {
                                if (DEFAULT_DENOMINATIONS.includes(name) || profile.preferences.customDenominations.includes(name)) {
                                  setFeedback({ message: 'Denomination already exists!', type: 'error' });
                                  return;
                                }
                                setProfile({
                                  ...profile,
                                  preferences: {
                                    ...profile.preferences,
                                    customDenominations: [...profile.preferences.customDenominations, name]
                                  }
                                });
                              }
                            });
                          }}
                          className="text-blue-600 dark:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {profile.preferences.customDenominations.map(denom => (
                          <div key={denom} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <Tag size={16} className="text-gray-400" />
                              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{denom}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => {
                                  setModalInputValue(denom);
                                  setInputModal({
                                    title: 'Edit Denomination',
                                    placeholder: 'Denomination Name',
                                    onConfirm: (newName) => {
                                      if (newName === denom) return;
                                      if (DEFAULT_DENOMINATIONS.includes(newName) || profile.preferences.customDenominations.includes(newName)) {
                                        setFeedback({ message: 'Denomination already exists!', type: 'error' });
                                        return;
                                      }
                                      const newDenoms = profile.preferences.customDenominations.map(d => d === denom ? newName : d);
                                      const newPrices = { ...profile.preferences.denominationPrices };
                                      if (newPrices[denom] !== undefined) {
                                        newPrices[newName] = newPrices[denom];
                                        delete newPrices[denom];
                                      }
                                      setProfile({
                                        ...profile,
                                        preferences: {
                                          ...profile.preferences,
                                          customDenominations: newDenoms,
                                          denominationPrices: newPrices
                                        }
                                      });
                                    }
                                  });
                                }}
                                className="text-gray-400 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                              >
                                <Settings size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  setConfirmModal({
                                    title: 'Delete Denomination',
                                    message: `Are you sure you want to delete "${denom}"?`,
                                    onConfirm: () => {
                                      const newDenoms = profile.preferences.customDenominations.filter(d => d !== denom);
                                      const newPrices = { ...profile.preferences.denominationPrices };
                                      delete newPrices[denom];
                                      setProfile({
                                        ...profile,
                                        preferences: {
                                          ...profile.preferences,
                                          customDenominations: newDenoms,
                                          denominationPrices: newPrices
                                        }
                                      });
                                    }
                                  });
                                }}
                                className="text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <span className="font-bold text-gray-700 dark:text-gray-300 block">Folders</span>
                      <div className="space-y-2">
                        {folders.map(folder => (
                          <div key={folder.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <FolderIcon size={16} className="text-gray-400" />
                              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{folder.name}</span>
                            </div>
                            {!folder.isDefault && (
                              <button 
                                onClick={() => setFolders(folders.filter(f => f.id !== folder.id))}
                                className="text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            setModalInputValue('');
                            setInputModal({
                              title: 'New Folder',
                              placeholder: 'Folder Name',
                              onConfirm: (name) => setFolders([...folders, { id: crypto.randomUUID(), name }])
                            });
                          }}
                          className="w-full p-3 text-blue-600 dark:text-blue-400 font-black text-xs flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors rounded-2xl border border-dashed border-blue-200 dark:border-blue-900/30"
                        >
                          <Plus size={14} /> Add New Folder
                        </button>
                      </div>
                    </div>
                  </SettingsSection>

                  <SettingsSection id="game" title="Gamification" icon={Award}>
                    {profile.unlockedMilestones?.includes('milestone-20') && (
                      <SettingToggle 
                        icon={Moon}
                        label="Night Bonus Mode"
                        description="Earn +50% XP during night hours (8PM-6AM)"
                        value={profile.preferences.nightBonusEnabled}
                        onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, nightBonusEnabled: !profile.preferences.nightBonusEnabled } })}
                      />
                    )}
                    
                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Target size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Daily Missions</span>
                      </div>
                      <div className="space-y-2">
                        {profile.missions.map(mission => (
                          <div key={mission.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 transition-colors">
                            <div className="flex-1">
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{mission.name}</p>
                              <p className="text-[10px] text-gray-400">{mission.description}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">+{mission.points} XP</span>
                              {mission.isCompleted ? (
                                <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center">
                                  <Check size={14} />
                                </div>
                              ) : (
                                <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Award size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Achievements</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {profile.badges.map(badge => (
                          <div 
                            key={badge.id} 
                            className={`p-3 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all ${
                              badge.isUnlocked 
                                ? 'bg-white dark:bg-gray-900 border-blue-100 dark:border-blue-900/30 shadow-sm' 
                                : 'bg-gray-50 dark:bg-gray-800/50 border-transparent grayscale opacity-50'
                            }`}
                          >
                            <div className={`p-2 rounded-xl ${badge.isUnlocked ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                              {badge.icon === 'Trophy' && <Trophy size={16} />}
                              {badge.icon === 'Star' && <Star size={16} />}
                              {badge.icon === 'FolderIcon' && <FolderIcon size={16} />}
                              {badge.icon === 'Zap' && <Zap size={16} />}
                              {badge.icon === 'Flame' && <Flame size={16} />}
                            </div>
                            <p className="text-[8px] font-black uppercase tracking-tighter leading-tight text-gray-700 dark:text-gray-300">{badge.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SettingsSection>

                  <SettingsSection id="data" title="Import/Export" icon={RefreshCcw}>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                      <SettingAction 
                        icon={Download}
                        title="Export Data"
                        description="Download your collection as a JSON file"
                        onClick={exportData}
                      />
                      <SettingAction 
                        icon={Upload}
                        title="Import Data"
                        description="Upload a previously exported JSON file"
                        onClick={() => importInputRef.current?.click()}
                      />
                      <SettingAction 
                        icon={Clock}
                        title="Restore Backup"
                        description="Load the most recent local backup"
                        onClick={loadRecentData}
                      />
                      <SettingAction 
                        icon={RefreshCcw}
                        title="Convert Format"
                        description="Ensure data is in the latest app format"
                        onClick={() => setFeedback({ message: 'Auto-conversion is active on import.', type: 'info' })}
                      />
                    </div>
                  </SettingsSection>

                  <SettingsSection id="backup" title="Backup" icon={Shield}>
                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-2 text-amber-600">
                        <Info size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Recovery Code</span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed">Save this code to recover your data if you lose access to this device.</p>
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-3xl text-center font-mono text-xl font-black tracking-[0.2em] border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 shadow-inner">
                        {profile.recoveryCode}
                      </div>
                    </div>

                    <SettingToggle 
                      icon={Zap}
                      label="Safe Mode"
                      description="Load last working backup on crash"
                      value={true}
                      onChange={() => {}}
                    />

                    <div className="p-4">
                      <button 
                        onClick={() => {
                          setConfirmModal({
                            title: 'Clear All Data',
                            message: 'Are you sure? This will delete all your coins and settings permanently!',
                            onConfirm: () => {
                              localStorage.clear();
                              window.location.reload();
                            }
                          });
                        }}
                        className="w-full p-4 flex items-center justify-between text-red-600 bg-red-50/50 dark:bg-red-900/10 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Trash2 size={20} />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-sm">Clear All Data</span>
                            <span className="text-[10px] text-red-400 font-medium">Permanently delete everything</span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-red-300 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </SettingsSection>

                  <SettingsSection id="version" title="App Version History" icon={History}>
                    <div className="p-5 space-y-6">
                      {APP_VERSION_HISTORY.map((item, idx) => (
                        <div key={item.version} className="relative pl-6">
                          {idx !== APP_VERSION_HISTORY.length - 1 && (
                            <div className="absolute left-[7px] top-4 bottom-[-24px] w-0.5 bg-gray-100 dark:bg-gray-800" />
                          )}
                          <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 bg-blue-600 shadow-sm" />
                          <div className="flex flex-col">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-black text-gray-900 dark:text-white">v{item.version}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.date}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                              {item.notes}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SettingsSection>

                  <SettingsSection id="developer" title="Developer" icon={Zap}>
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600">
                            <Activity size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 dark:text-gray-100">Debug Mode</p>
                            <p className="text-xs text-gray-400 font-medium">Record system activity</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const newValue = !profile.preferences.debugMode;
                            setProfile(prev => ({
                              ...prev,
                              preferences: { ...prev.preferences, debugMode: newValue }
                            }));
                            if (newValue) {
                              addLog('Debug Mode enabled', 'info');
                            }
                          }}
                          className={`w-12 h-6 rounded-full transition-all relative ${
                            profile.preferences.debugMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <motion.div 
                            animate={{ x: profile.preferences.debugMode ? 24 : 4 }}
                            className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                          />
                        </button>
                      </div>
                      
                      {profile.preferences.debugMode && (
                        <button 
                          onClick={() => setShowLogsModal(true)}
                          className="w-full flex items-center justify-between p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 text-blue-600 font-bold active:scale-95 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <Activity size={20} />
                            <span>View System Logs</span>
                          </div>
                          <ChevronRight size={18} />
                        </button>
                      )}
                    </div>
                  </SettingsSection>
                </div>

                {profile.unlockedMilestones && profile.unlockedMilestones.includes('milestone-50') && (
                  <button 
                    onClick={() => setShowFusionModal(true)}
                    className="w-full p-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-3xl font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-transform"
                  >
                    <Zap size={20} />
                    <span>Open Coin Fusion Lab</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Coin Detail View */}
        <AnimatePresence>
          {selectedCoin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="ios-modal-backdrop"
              onClick={() => setSelectedCoin(null)}
            >
              <motion.div
                initial={{ y: '20%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '20%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="ios-overlay w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className={`relative h-80 flex-shrink-0 flex items-center justify-center overflow-hidden ${
                  selectedCoin.rarity === 'Very Rare' ? 'bg-amber-50/50 dark:bg-amber-900/10' :
                  selectedCoin.rarity === 'Rare' ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-gray-100/50 dark:bg-gray-800/50'
                }`}>
                  {/* Subtle Glow for Rare Coins */}
                  {(selectedCoin.rarity === 'Rare' || selectedCoin.rarity === 'Very Rare') && (
                    <div className={`absolute inset-0 blur-[100px] opacity-40 ${
                      selectedCoin.rarity === 'Very Rare' ? 'bg-amber-400' : 'bg-blue-400'
                    }`} />
                  )}

                  {selectedCoin.image ? (
                    <motion.img 
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      src={selectedCoin.image} 
                      alt={selectedCoin.name} 
                      className="w-full h-full object-cover relative z-10" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`w-full h-full flex items-center justify-center text-8xl font-black relative z-10 ${
                        selectedCoin.rarity === 'Very Rare' ? 'text-amber-600/20' :
                        selectedCoin.rarity === 'Rare' ? 'text-blue-600/20' : 'text-gray-200 dark:text-gray-700'
                      }`}
                    >
                      {selectedCoin.type}
                    </motion.div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white dark:from-gray-900 to-transparent z-20" />
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedCoin(null)}
                    className="absolute top-6 right-6 w-12 h-12 bg-black/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-all z-30 border border-white/20"
                  >
                    <X size={24} />
                  </motion.button>
                </div>

                <div className="px-8 pb-10 overflow-y-auto relative z-30 custom-scrollbar">
                  <div className="flex items-center justify-between mb-4 mt-2">
                    <div className="flex gap-2">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 premium-border ${
                        selectedCoin.rarity === 'Very Rare' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        selectedCoin.rarity === 'Rare' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {selectedCoin.rarity !== 'Common' && <Star size={10} className="fill-current" />}
                        {selectedCoin.rarity}
                      </span>
                      <span className="px-4 py-1.5 rounded-full bg-gray-100/50 dark:bg-gray-800/50 text-[10px] font-black uppercase tracking-widest text-gray-500 premium-border">
                        {selectedCoin.year}
                      </span>
                    </div>
                  </div>
                  
                  <h2 className="text-4xl font-black mb-6 leading-tight tracking-tight text-gray-900 dark:text-white">{selectedCoin.name}</h2>
                  
                  {CLUE_MAP[selectedCoin.name] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-50/50 dark:bg-amber-900/20 p-6 rounded-[2.5rem] mb-8 border border-amber-100 dark:border-amber-800/50 relative group soft-shadow"
                    >
                      <div className="absolute -top-2 -left-2 w-8 h-8 bg-amber-600 rounded-xl flex items-center justify-center text-white shadow-lg rotate-[-10deg] group-hover:rotate-0 transition-transform">
                        <Lightbulb size={16} />
                      </div>
                      <p className="text-amber-800 dark:text-amber-400 leading-relaxed font-bold italic text-sm">
                        "Clue: {CLUE_MAP[selectedCoin.name]}"
                      </p>
                    </motion.div>
                  )}

                  {selectedCoin.tags && selectedCoin.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {selectedCoin.tags.map(tag => (
                        <span key={tag} className="bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-blue-100 dark:border-blue-800/50">
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                      <div className="bg-gray-50/50 dark:bg-gray-800/30 p-6 rounded-[2.5rem] mb-8 border border-gray-100 dark:border-gray-800/50 relative group soft-shadow min-h-[120px] flex flex-col justify-center">
                        <div className="absolute -top-2 -left-2 w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg rotate-[-10deg] group-hover:rotate-0 transition-transform">
                          <Info size={16} />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-bold italic text-lg line-clamp-4">
                          "{selectedCoin.summary || 'No summary provided.'}"
                        </p>
                      </div>

                  <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="ios-surface p-5">
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Denomination</p>
                      <p className="font-black text-2xl text-gray-800 dark:text-gray-100 tracking-tight">{selectedCoin.type}</p>
                    </div>
                    <div className="ios-surface p-5">
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Investment</p>
                      <p className="font-black text-2xl text-green-600 dark:text-green-400 tracking-tight">£{selectedCoin.amountPaid?.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <motion.button 
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => startEdit(selectedCoin)}
                      className="flex-1 py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-[2rem] font-black text-lg shadow-2xl active:scale-95 transition-all"
                    >
                      Edit Details
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setConfirmModal({
                          title: 'Delete Coin',
                          message: 'Are you sure you want to delete this coin permanently?',
                          onConfirm: () => deleteCoin(selectedCoin.id)
                        });
                      }}
                      className="w-20 py-5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-[2rem] font-black flex items-center justify-center active:scale-95 transition-all border border-red-100 dark:border-red-900/30"
                    >
                      <Trash2 size={24} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lucky Spin Modal */}
        <AnimatePresence>
          {showSpinModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
              onClick={() => !isSpinning && setShowSpinModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, rotate: -5 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.9, opacity: 0, rotate: 5 }}
                className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 text-center relative overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                
                <button 
                  onClick={() => setShowSpinModal(false)}
                  disabled={isSpinning}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-0"
                >
                  <X size={24} />
                </button>

                <div className="mb-8 relative">
                  <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/30 rounded-[2rem] flex items-center justify-center text-blue-600 mx-auto mb-4 relative z-10">
                    <Gift size={48} className={isSpinning ? 'animate-bounce' : ''} />
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
                </div>

                <h2 className="text-3xl font-black mb-2 tracking-tight">Lucky Spin</h2>
                <p className="text-gray-500 dark:text-gray-400 font-bold text-sm mb-8 px-4">
                  Spin the wheel to win bonus XP! You can spin once every 24 hours.
                </p>

                {spinResult !== null ? (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="text-5xl font-black text-blue-600 dark:text-blue-400">
                      +{spinResult} XP
                    </div>
                    <p className="text-green-600 dark:text-green-400 font-black uppercase tracking-widest text-xs">Reward Claimed!</p>
                    <button 
                      onClick={() => setShowSpinModal(false)}
                      className="w-full py-4 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all"
                    >
                      Awesome!
                    </button>
                  </motion.div>
                ) : (
                  <button 
                    disabled={isSpinning}
                    onClick={() => {
                      setIsSpinning(true);
                      setTimeout(() => {
                        const win = Math.floor(Math.random() * 50) + 10;
                        setSpinResult(win);
                        setIsSpinning(false);
                        setProfile(prev => ({ 
                          ...prev, 
                          points: prev.points + win,
                          lastSpinDate: Date.now()
                        }));
                        setFeedback({ message: `You won ${win} XP!`, type: 'success' });
                      }, 2000);
                    }}
                    className={`w-full py-5 rounded-2xl font-black text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 ${
                      isSpinning 
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 dark:shadow-none'
                    }`}
                  >
                    {isSpinning ? (
                      <>
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        >
                          <RefreshCw size={24} />
                        </motion.div>
                        Spinning...
                      </>
                    ) : (
                      <>
                        <Zap size={24} className="fill-current" />
                        Spin Now
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Import Progress Overlay */}
        <AnimatePresence>
          {importProgress !== null && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-12 text-center">
              <div className="w-full max-w-xs space-y-4">
                <h3 className="text-white text-xl font-bold">Importing Data...</h3>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${importProgress}%` }}
                    className="h-full bg-blue-500"
                  />
                </div>
                <p className="text-white/60 text-sm font-medium">{importProgress}% Complete</p>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Feedback Toast */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100]"
            >
              <div className={`px-8 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center gap-4 font-black text-sm tracking-tight text-white border border-white/10 backdrop-blur-md ${
                feedback.type === 'success' ? 'bg-green-600/90' : 
                feedback.type === 'error' ? 'bg-red-600/90' : 'bg-gray-900/90'
              }`}>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
                </div>
                {feedback.message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Confirmation Modal */}
        <AnimatePresence>
          {confirmModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
              onClick={() => setConfirmModal(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-xl font-black mb-2">{confirmModal.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 font-bold text-sm mb-6">{confirmModal.message}</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-black text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(null);
                    }}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-sm shadow-lg shadow-red-200 dark:shadow-none"
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Input Modal */}
        <AnimatePresence>
          {inputModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
              onClick={() => setInputModal(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-xl font-black mb-4">{inputModal.title}</h3>
                <input 
                  autoFocus
                  type="text"
                  value={modalInputValue}
                  onChange={(e) => setModalInputValue(e.target.value)}
                  placeholder={inputModal.placeholder}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 mb-6 font-bold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && modalInputValue.trim()) {
                      inputModal.onConfirm(modalInputValue.trim());
                      setInputModal(null);
                    }
                  }}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setInputModal(null)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-black text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={!modalInputValue.trim()}
                    onClick={() => {
                      inputModal.onConfirm(modalInputValue.trim());
                      setInputModal(null);
                    }}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collector Identity Card Modal */}
        <AnimatePresence>
          {showCollectorCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
              onClick={() => setShowCollectorCard(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-gradient-to-br from-blue-600 to-indigo-700 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-white relative overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/20 rounded-full -ml-16 -mb-16 blur-2xl" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30">
                      <Star size={32} className="fill-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">Collector ID</p>
                      <p className="text-xl font-black tracking-tighter">#{profile.recoveryCode}</p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-3xl font-black tracking-tight mb-1">{profile.name}</h3>
                    <p className="text-blue-200 font-bold uppercase tracking-widest text-xs">{currentLevel.name} Rank</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Collection</p>
                      <p className="text-2xl font-black">{stats.total} Coins</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">XP Points</p>
                      <p className="text-2xl font-black">{profile.points}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Est. Value</p>
                      <p className="text-2xl font-black">£{stats.totalSpend.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Streak</p>
                      <p className="text-2xl font-black">{profile.streak.current} Days</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setFeedback({ message: 'Card saved to library!', type: 'success' });
                        setShowCollectorCard(false);
                      }}
                      className="flex-1 py-4 bg-white text-blue-600 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2"
                    >
                      <Download size={18} />
                      Save Card
                    </button>
                    <button 
                      onClick={() => setShowCollectorCard(false)}
                      className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compare Mode Modal */}
        <AnimatePresence>
          {compareCoins.length === 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[110] flex items-center justify-center p-4"
            >
              <div className="w-full max-w-2xl">
                <div className="flex justify-between items-center mb-8 px-4">
                  <h3 className="text-white text-2xl font-black tracking-tight">Quick Compare</h3>
                  <button 
                    onClick={() => setCompareCoins([])}
                    className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {compareCoins.map(id => {
                    const coin = coins.find(c => c.id === id);
                    if (!coin) return null;
                    return (
                      <motion.div 
                        key={id}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 flex flex-col items-center text-center"
                      >
                        <div className="w-32 h-32 bg-gray-50 dark:bg-gray-800 rounded-3xl mb-6 flex items-center justify-center overflow-hidden shadow-inner">
                          {coin.image ? (
                            <img src={coin.image} alt={coin.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl font-black text-gray-300">{coin.type}</span>
                          )}
                        </div>
                        <h4 className="text-xl font-black mb-1">{coin.name}</h4>
                        <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-6">{coin.rarity}</p>
                        
                        <div className="w-full space-y-4">
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Year</p>
                            <p className="font-black">{coin.year}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Type</p>
                            <p className="font-black">{coin.type}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Paid</p>
                            <p className="font-black">£{coin.amountPaid?.toFixed(2)}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                
                <p className="text-center text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-8">
                  Side-by-side comparison
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coin Fusion Modal */}
        <AnimatePresence>
          {showFusionModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-6"
              onClick={() => setShowFusionModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Fusion Lab</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Combine 3 identical coins</p>
                  </div>
                  <button onClick={() => setShowFusionModal(false)} className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-6">
                  {Object.entries(
                    coins.reduce((acc, coin) => {
                      const key = `${coin.name}-${coin.year}-${coin.type}-${coin.rarity}`;
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(coin);
                      return acc;
                    }, {} as Record<string, Coin[]>)
                  )
                  .filter(([_, group]) => (group as Coin[]).length >= 3 && (group as Coin[])[0].rarity !== 'Very Rare')
                  .map(([key, group]) => {
                    const coinGroup = group as Coin[];
                    return (
                      <div key={key} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center text-xs font-black text-gray-400 border border-gray-100 dark:border-gray-800 shadow-sm">
                              {coinGroup[0].type}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 dark:text-gray-200">{coinGroup[0].name}</p>
                              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{coinGroup[0].rarity} × {coinGroup.length}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const ids = coinGroup.slice(0, 3).map(c => c.id);
                              handleFusion(ids);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-transform"
                          >
                            Fuse 3
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium italic">Result: 1 {coinGroup[0].rarity === 'Common' ? 'Rare' : 'Very Rare'} Coin</p>
                      </div>
                    );
                  })}
                  
                  {coins.length === 0 && (
                    <div className="text-center py-20">
                      <p className="text-gray-400 font-bold italic">No duplicates found...</p>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-400 font-bold mb-1">
                    <Info size={16} />
                    <span className="text-xs uppercase tracking-widest">Fusion Rules</span>
                  </div>
                  <p className="text-[10px] text-blue-700 dark:text-blue-500 leading-relaxed">
                    Fusing 3 identical coins consumes them and creates 1 coin of the next rarity level. You also gain a massive XP bonus!
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compare Selection Floating Bar */}
        <AnimatePresence>
          {compareCoins.length === 1 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs px-4"
            >
              <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                    <Columns size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Compare Mode</p>
                    <p className="text-[10px] font-bold opacity-60">Select 1 more coin</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCompareCoins([])}
                  className="p-2 hover:bg-white/10 dark:hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {renderMultiSelectBar()}
        {renderLogsModal()}
      </div>
    </ErrorBoundary>
  );
}
