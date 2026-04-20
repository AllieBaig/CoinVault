/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, FormEvent, useRef, ErrorInfo, ReactNode, ChangeEvent } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionTemplate, useReducedMotion } from 'motion/react';
import { 
  Plus, Trash2, PieChart, LayoutGrid, Info, CheckCircle2, Star, 
  Folder as FolderIcon, Image as ImageIcon, Download, Upload, 
  Settings, User, ChevronRight, ChevronLeft, ChevronDown, X, ArrowLeft, Search, Clock,
  Loader2, AlertCircle, Grid, List as ListIcon, Trophy, Flame,
  Zap, Target, Gift, RefreshCw, RefreshCcw, Eye, EyeOff, Check, Lock, Unlock, Tag, TrendingUp,
  Share2, Columns, History, Lightbulb, Coins, Shield, Database, Layout,
  Monitor, Smartphone, Activity, Award, Palette, Gauge, Layers, Moon, Map, Flag,
  BookOpen, Puzzle, PlayCircle, BarChart2, Calendar, Maximize2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  Tooltip as ReTooltip, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
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

const EUROPEAN_COUNTRIES = [
  'Austria', 'Belgium', 'France', 'Germany', 'Ireland', 'Italy', 'Netherlands', 'Spain', 'United Kingdom', 'Other'
];

const PRE_EURO_CURRENCIES: { [key: string]: string[] } = {
  'Ireland': ['1p', '2p', '5p', '10p', '20p', '50p', '£1', '£2', 'Farthing', 'Half Penny', 'Penny', 'Threepence', 'Sixpence', 'Shilling', 'Florin', 'Half Crown', 'Crown'],
  'France': ['Franc', 'Centime'],
  'Germany': ['Deutsche Mark', 'Pfennig'],
  'Italy': ['Lira', 'Centesimo'],
  'Spain': ['Peseta', 'Centimo'],
  'Netherlands': ['Guilder', 'Cent'],
  'Belgium': ['Franc', 'Centime'],
  'Austria': ['Schilling', 'Groschen'],
  'United Kingdom': ['Farthing', 'Half Penny', 'Penny', 'Threepence', 'Sixpence', 'Shilling', 'Florin', 'Half Crown', 'Crown']
};

const EURO_MODERN_CURRENCIES = ['1c', '2c', '5c', '10c', '20c', '50c', '€1', '€2'];
const UK_MODERN_CURRENCIES = ['1p', '2p', '5p', '10p', '20p', '50p', '£1', '£2'];

const MODERN_CURRENCIES_BY_COUNTRY: { [key: string]: string[] } = {
  'United Kingdom': UK_MODERN_CURRENCIES,
  'Austria': EURO_MODERN_CURRENCIES,
  'Belgium': EURO_MODERN_CURRENCIES,
  'France': EURO_MODERN_CURRENCIES,
  'Germany': EURO_MODERN_CURRENCIES,
  'Ireland': EURO_MODERN_CURRENCIES,
  'Italy': EURO_MODERN_CURRENCIES,
  'Netherlands': EURO_MODERN_CURRENCIES,
  'Spain': EURO_MODERN_CURRENCIES,
};

const UK_REGIONS = ['Mainland', 'Jersey', 'Guernsey', 'Isle of Man'];

type Rarity = 'Common' | 'Rare' | 'Very Rare';
type SortOption = 'year' | 'denomination' | 'date' | 'month' | 'added' | 'opened' | 'name';
type GroupOption = 'year' | 'denomination' | 'date' | 'month' | 'country' | 'none';
type ExploreMode = 'timeline' | 'mindmap' | 'story';
type LayoutType = 'grid' | 'list' | 'carousel' | 'masonry' | 'board' | 'timeline' | 'gallery' | 'spotlight' | 'compact' | 'split' | 'hexagon' | 'card' | 'table';

interface Coin {
  id: string;
  name: string;
  year: string;
  type: CoinType;
  rarity: Rarity;
  summary: string;
  image?: string;
  imageId?: string;
  folderId: string;
  dateAdded: number;
  lastOpened: number;
  amountPaid: number;
  tags?: string[];
  mint?: string;
  era?: string;
  country?: string;
  region?: string;
  currencyType?: 'Modern' | 'Old';
  denomValue?: number;
  denomUnit?: string;
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
  added?: string[];
  improved?: string[];
  fixed?: string[];
  notes?: string;
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
  type: 'info' | 'error' | 'action' | 'load' | 'system';
}

interface FeatureFlags {
  timelineModes: boolean;
  imageLibrary: boolean;
  bulkActions: boolean;
  themes: boolean;
  experimental: boolean;
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
    theme: string;
    themeCategory: string;
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
    showCoinName: boolean;
    showYear: boolean;
    showType: boolean;
    showRarity: boolean;
    debugMode: boolean;
    ambientMotionEnabled: boolean;
    showFolder: boolean;
    fixedPriceMode: boolean;
    enableDeleteMode: boolean;
    customDenominations: string[];
    denominationPrices: { [key: string]: number };
    layoutType: LayoutType;
    showLayoutSwitcher: boolean;
    showHorizontalLayoutPicker: boolean;
    enabledLayouts: LayoutType[];
    showOldCoins: boolean;
    currencyFilter: 'modern' | 'old' | 'both';
    visibleCountries: string[];
    featureFlags: FeatureFlags;
    appearanceMode: 'light' | 'dark' | 'system';
    darkModeStyle: 'purple' | 'blue';
    fontFamily: string;
    customFont?: string;
  };
}

const TARGET_PER_TYPE = 20;

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  timelineModes: true,
  imageLibrary: true,
  bulkActions: true,
  themes: true,
  experimental: false,
};

const LEVELS = [
  { name: 'Beginner', minPoints: 0 },
  { name: 'Collector', minPoints: 100 },
  { name: 'Expert', minPoints: 500 },
  { name: 'Master', minPoints: 2000 },
];

const THEME_CATEGORIES = [
  {
    id: 'system',
    name: 'System',
    themes: [
      { id: 'light', name: 'Light Mode' },
      { id: 'dark', name: 'Dark Mode' },
      { id: 'system', name: 'Follow System' },
    ]
  },
  {
    id: 'texture',
    name: 'Texture Themes',
    themes: [
      { id: 'paper', name: 'Paper' },
      { id: 'glass', name: 'Glass' },
      { id: 'wood', name: 'Wood' },
      { id: 'metal', name: 'Metal' },
      { id: 'fabric', name: 'Fabric' },
    ]
  },
  {
    id: 'os',
    name: 'OS Themes',
    themes: [
      { id: 'win98', name: 'Windows 98' },
      { id: 'winxp', name: 'Windows XP' },
      { id: 'redhat', name: 'Red Hat' },
      { id: 'playstation', name: 'PlayStation' },
      { id: 'xbox', name: 'Xbox' },
    ]
  },
  {
    id: 'cartoon',
    name: 'Fun/Cartoon Themes',
    themes: [
      { id: 'scooby', name: 'Scooby-Doo' },
      { id: 'jetsons', name: 'Jetsons' },
      { id: 'ben10', name: 'Ben 10' },
      { id: 'flintstones', name: 'Flintstones' },
    ]
  },
  {
    id: 'movie',
    name: 'Movie Palettes',
    themes: [
      { id: 'noir', name: 'Noir' },
      { id: 'cyberpunk', name: 'Cyberpunk' },
      { id: 'wes', name: 'Wes Anderson' },
      { id: 'matrix', name: 'Matrix' },
    ]
  }
];

const FONTS = [
  { id: 'default', name: 'App Default', family: '"Inter", ui-sans-serif, system-ui, sans-serif' },
  { id: 'serif', name: 'Editorial Serif', family: '"Playfair Display", serif' },
  { id: 'mono', name: 'Technical Mono', family: '"JetBrains Mono", monospace' },
  { id: 'rounded', name: 'Soft Rounded', family: '"Outfit", sans-serif' },
  { id: 'system', name: 'System Sans', family: 'system-ui, -apple-system, sans-serif' },
];

// --- Animation Configs ---
const SPRING_CONFIG = { type: 'spring', stiffness: 400, damping: 30, mass: 1 };
const SOFT_SPRING = { type: 'spring', stiffness: 300, damping: 35, mass: 1 };
const BUTTON_TAP = { scale: 0.96 };
const CARD_HOVER = { y: -4, scale: 1.01 };
const MODAL_TRANSITION = { type: 'spring', stiffness: 300, damping: 32, mass: 1 };

const RARITY_POINTS = {
  'Common': 10,
  'Rare': 50,
  'Very Rare': 100,
};

// APP VERSION HISTORY
// IMPORTANT: Update this array whenever a new feature, UI update, or bug fix is applied.
// Follow Semantic Versioning: Major (big features), Minor (small features), Patch (fixes).
const APP_VERSION_HISTORY: AppVersion[] = [
  {
    version: '2.5.0',
    date: '2026-04-13',
    added: [
      'Apple-native spring physics engine',
      '120fps ProMotion optimized animations',
      'GPU-accelerated transforms for all interactions',
      'System-level "Reduce Motion" support'
    ],
    improved: [
      'Modal transitions with soft spring physics',
      'Button haptics and spring-back scaling',
      'Card hover lift effects',
      'Smooth toggle switch movement'
    ],
    fixed: [
      'Layout shifts during UI transitions',
      'Animation consistency across all themes'
    ]
  },
  {
    version: '2.4.0',
    date: '2026-04-12',
    added: [
      'Appearance Mode: Light, Dark, and System Auto-Switching',
      'Custom Font Selector with reset capability',
      'Manual Compact UI control'
    ],
    improved: [
      'Soft Dark Mode for all themes (no pure black)',
      'Settings reactivity and instant application',
      'Apple-native toggle switch behavior'
    ],
    fixed: [
      'Auto-compact UI on small screens (now manual only)',
      'Theme consistency across system mode changes'
    ]
  },
  {
    version: '2.3.0',
    date: '2026-04-12',
    added: [
      'Global Feature Flag system for dynamic control',
      'Developer / Experimental settings section',
      'Remote-ready configuration architecture'
    ],
    improved: [
      'Settings organization with new Flag section',
      'Navigation tab filtering based on active features',
      'Bulk action accessibility control'
    ],
    fixed: [
      'UI clutter by hiding unreleased or disabled features',
      'Layout stability when features are toggled'
    ]
  },
  {
    version: '2.2.0',
    date: '2026-04-12',
    added: [
      'Dynamic Version History system',
      'Apple-native header scroll behavior',
      'Show Collector Card visibility toggle'
    ],
    improved: [
      'Header collapse and blur effects on scroll',
      'Profile screen layout responsiveness',
      'Safe area inset handling for all screen sizes'
    ],
    fixed: [
      'Sticky header behavior on profile tab',
      'Empty layout gaps when header is disabled',
      'Duplicate header instances in certain navigation states'
    ]
  },
  { 
    version: '2.1.0', 
    date: '2026-04-01', 
    added: ['Timeline Hub with 6 historical stories'],
    improved: ['App Version History in settings'],
    notes: 'Introduced the Timeline Hub with 6 historical and fictional coin stories.' 
  },
  { 
    version: '2.0.5', 
    date: '2026-03-25', 
    improved: ['Background removal AI', 'Support for custom folder icons'],
    notes: 'Improved background removal AI and added support for custom folder icons.' 
  },
  { 
    version: '2.0.0', 
    date: '2026-03-10', 
    added: ['Rank System', 'XP rewards'],
    improved: ['Glass and Metal themes redesign'],
    notes: 'Major redesign with new Glass and Metal themes. Introduced the Rank System and XP rewards.' 
  },
  { 
    version: '1.5.0', 
    date: '2026-02-15', 
    added: ['Data import/export functionality', 'Local backup system'],
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

const parseDenomination = (type: string) => {
  // Matches things like 50p, £1, 20c, €2, 1.50
  const match = type.match(/^([£€])?(\d+(?:\.\d+)?)([pc])?$/i);
  if (match) {
    const prefix = match[1];
    const value = parseFloat(match[2]);
    const suffix = match[3];
    return {
      value,
      unit: prefix || suffix || ''
    };
  }
  return { value: 0, unit: type };
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

const imageStorage = {
  dbName: 'coin-images-db',
  storeName: 'images',
  
  init: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(imageStorage.dbName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(imageStorage.storeName)) {
          request.result.createObjectStore(imageStorage.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  save: async (id: string, blob: Blob | string) => {
    try {
      const db = await imageStorage.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(imageStorage.storeName, 'readwrite');
        transaction.objectStore(imageStorage.storeName).put(blob, id);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('Failed to save image to IndexedDB:', e);
      return false;
    }
  },

  delete: async (id: string) => {
    try {
      const db = await imageStorage.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(imageStorage.storeName, 'readwrite');
        transaction.objectStore(imageStorage.storeName).delete(id);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('Failed to delete image from IndexedDB:', e);
      return false;
    }
  },

  list: async (): Promise<{id: string, url: string}[]> => {
    try {
      const db = await imageStorage.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(imageStorage.storeName, 'readonly');
        const store = transaction.objectStore(imageStorage.storeName);
        const request = store.openCursor();
        const results: {id: string, url: string}[] = [];

        request.onsuccess = (event: any) => {
          const cursor = event.target.result;
          if (cursor) {
            results.push({ id: cursor.key, url: cursor.value });
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to list images from IndexedDB:', e);
      return [];
    }
  },

  load: async (id: string): Promise<string | null> => {
    try {
      const db = await imageStorage.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(imageStorage.storeName, 'readonly');
        const request = transaction.objectStore(imageStorage.storeName).get(id);
        request.onsuccess = () => {
          const result = request.result;
          if (!result) return resolve(null);
          if (result instanceof Blob) {
            resolve(URL.createObjectURL(result));
          } else {
            resolve(result);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to load image from IndexedDB:', e);
      return null;
    }
  }
};

const storage = {
  save: (key: string, data: any) => {
    try {
      if (data === undefined || data === null) return;
      const json = JSON.stringify(data);
      const compressed = LZString.compressToUTF16(json);
      localStorage.setItem(key, compressed);
    } catch (e) {
      console.error('Failed to save data:', e);
    }
  },
  load: (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      
      let parsed;
      try {
        const decompressed = LZString.decompressFromUTF16(raw);
        parsed = decompressed ? JSON.parse(decompressed) : JSON.parse(raw);
      } catch (e) {
        parsed = JSON.parse(raw);
      }
      
      // Basic validation
      if (key.includes('collection') && !Array.isArray(parsed)) return null;
      if (key.includes('profile') && typeof parsed !== 'object') return null;
      
      return parsed;
    } catch (e) {
      console.error('Failed to load data:', e);
      return null;
    }
  }
};

// --- Main App ---

// --- Components ---

const ImageLibraryPicker = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  images 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelect: (id: string, url: string) => void;
  images: {id: string, url: string}[];
}) => {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-system-background w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tight text-system-label">Select from Library</h3>
          <button onClick={onClose} className="p-2 hover:bg-secondary-system-background rounded-full transition-colors text-system-secondary-label">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 max-h-[60vh] overflow-y-auto grid grid-cols-3 gap-3 no-scrollbar">
          {images.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-system-tertiary-label font-bold">
              No images in library yet.
            </div>
          ) : (
            images.map(img => (
              <button
                key={img.id}
                type="button"
                onClick={() => onSelect(img.id, img.url)}
                className="aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all bg-secondary-system-background group"
              >
                <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
              </button>
            ))
          )}
        </div>
        
        <div className="p-6 bg-secondary-system-background">
          <button 
            type="button"
            onClick={onClose}
            className="w-full py-4 bg-system-background text-system-label rounded-2xl font-black text-sm uppercase tracking-widest border border-gray-100 dark:border-gray-800 shadow-sm"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CoinImage = React.memo(({ coin, className, motionProps }: { coin: Coin; className?: string; motionProps?: any }) => {
  const [src, setSrc] = useState<string | undefined>(coin.image);

  useEffect(() => {
    let isMounted = true;
    if (coin.imageId) {
      imageStorage.load(coin.imageId).then(url => {
        if (isMounted) {
          if (url) {
            setSrc(url);
          } else {
            // If imageId exists but not in storage, and image is a reference path, show placeholder
            if (coin.image && coin.image.startsWith('image_library/')) {
              setSrc(undefined);
            } else {
              setSrc(coin.image);
            }
          }
        }
      });
    } else {
      // If no imageId, check if image is a reference path
      if (coin.image && coin.image.startsWith('image_library/')) {
        setSrc(undefined);
      } else {
        setSrc(coin.image);
      }
    }
    return () => { isMounted = false; };
  }, [coin.imageId, coin.image]);

  if (motionProps) {
    return (
      <motion.img 
        src={src || 'https://picsum.photos/seed/coin/200/200'} 
        alt={coin.name}
        className={className}
        referrerPolicy="no-referrer"
        {...motionProps}
      />
    );
  }

  return (
    <img 
      src={src || 'https://picsum.photos/seed/coin/200/200'} 
      alt={coin.name}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
});

interface MindMapProps {
  coins: Coin[];
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  openCoin: (coin: Coin) => void;
  addLog: (msg: string, type: string) => void;
  setActiveTab: (tab: any) => void;
  setExpandedNodes: (nodes: Set<string>) => void;
}

const MindMap = React.memo(({ coins, expandedNodes, toggleNode, openCoin, addLog, setActiveTab, setExpandedNodes }: MindMapProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const shouldReduceMotion = useReducedMotion();
  const springConfig = shouldReduceMotion ? { type: 'tween', duration: 0.2 } : SPRING_CONFIG;
  const softSpring = shouldReduceMotion ? { type: 'tween', duration: 0.3 } : SOFT_SPRING;

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
        <motion.button 
          whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
          transition={springConfig}
          onClick={() => setActiveTab('collection')}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20"
        >
          Add Coins
        </motion.button>
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
          whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
          whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
          transition={springConfig}
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
});

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

const SAMPLE_COINS: Coin[] = [
  {
    id: 'sample-1',
    name: 'Victorian Penny',
    year: '1890',
    type: 'Penny',
    rarity: 'Rare',
    summary: 'A beautiful bronze penny from the Victorian era.',
    folderId: 'purchased',
    dateAdded: Date.now() - 1000000,
    lastOpened: Date.now(),
    amountPaid: 15.50,
    country: 'Ireland',
    currencyType: 'Old',
    tags: ['Victorian', 'Bronze']
  },
  {
    id: 'sample-2',
    name: 'French Franc',
    year: '1960',
    type: 'Franc',
    rarity: 'Common',
    summary: 'Standard circulation franc from mid-century France.',
    folderId: 'purchased',
    dateAdded: Date.now() - 2000000,
    lastOpened: Date.now(),
    amountPaid: 2.00,
    country: 'France',
    currencyType: 'Old',
    tags: ['Franc', 'Steel']
  },
  {
    id: 'sample-3',
    name: 'German Mark',
    year: '1975',
    type: 'Deutsche Mark',
    rarity: 'Common',
    summary: 'A classic Deutsche Mark from West Germany.',
    folderId: 'purchased',
    dateAdded: Date.now() - 3000000,
    lastOpened: Date.now(),
    amountPaid: 5.00,
    country: 'Germany',
    currencyType: 'Old',
    tags: ['Mark', 'West Germany']
  }
];

export default function App() {
  // --- State ---
  
  const [isSafeMode, setIsSafeMode] = useState(() => {
    return localStorage.getItem('coin-safe-mode') === 'true';
  });

  const [systemIsDark, setSystemIsDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemIsDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const [isAppReady, setIsAppReady] = useState(false);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);

  const [coins, setCoins] = useState<Coin[]>(() => {
    const key = isSafeMode ? 'coin-backup-collection' : 'coin-collection';
    const saved = storage.load(key);
    if (saved && saved.length > 0) return saved;
    return SAMPLE_COINS;
  });

  const migrateImages = async (currentCoins: Coin[]) => {
    let changed = false;
    const updatedCoins = await Promise.all(currentCoins.map(async (coin) => {
      if (coin.image && coin.image.startsWith('data:image')) {
        const imageId = coin.imageId || crypto.randomUUID();
        await imageStorage.save(imageId, coin.image);
        changed = true;
        return { 
          ...coin, 
          image: `image_library/${imageId}.jpg`, 
          imageId 
        };
      }
      return coin;
    }));

    if (changed) {
      setCoins(updatedCoins);
      addLog('System: Optimized image storage (moved base64 to library)', 'system');
    }
  };

  // --- Migration: Base64 to IndexedDB ---
  useEffect(() => {
    if (coins.length > 0) {
      migrateImages(coins);
    }
  }, []);

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
          theme: parsed.preferences?.theme ?? 'win98',
          themeCategory: parsed.preferences?.themeCategory ?? 'os',
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
          showCoinName: parsed.preferences?.showCoinName ?? true,
          showYear: parsed.preferences?.showYear ?? true,
          showType: parsed.preferences?.showType ?? true,
          showRarity: parsed.preferences?.showRarity ?? true,
          debugMode: parsed.preferences?.debugMode ?? false,
          ambientMotionEnabled: parsed.preferences?.ambientMotionEnabled ?? true,
          showFolder: parsed.preferences?.showFolder ?? true,
          fixedPriceMode: parsed.preferences?.fixedPriceMode ?? false,
          enableDeleteMode: parsed.preferences?.enableDeleteMode ?? false,
          customDenominations: parsed.preferences?.customDenominations ?? [],
          denominationPrices: parsed.preferences?.denominationPrices ?? { 
            '50p': 0.5, '£1': 1.0, '£2': 2.0,
            'Farthing': 0.01, 'Half Penny': 0.02, 'Penny': 0.05,
            'Threepence': 0.10, 'Sixpence': 0.20, 'Shilling': 0.50,
            'Florin': 1.00, 'Half Crown': 1.25, 'Crown': 2.50
          },
          layoutType: parsed.preferences?.layoutType ?? 'grid',
          showLayoutSwitcher: parsed.preferences?.showLayoutSwitcher ?? true,
          showHorizontalLayoutPicker: parsed.preferences?.showHorizontalLayoutPicker ?? true,
          enabledLayouts: parsed.preferences?.enabledLayouts ?? ['grid', 'list', 'carousel', 'masonry', 'board', 'timeline', 'gallery', 'spotlight', 'compact', 'split', 'hexagon', 'card', 'table'],
          showOldCoins: parsed.preferences?.showOldCoins ?? true,
          currencyFilter: parsed.preferences?.currencyFilter ?? 'both',
          visibleCountries: parsed.preferences?.visibleCountries ?? [],
          featureFlags: parsed.preferences?.featureFlags ?? DEFAULT_FEATURE_FLAGS,
          appearanceMode: parsed.preferences?.appearanceMode ?? 'system',
          fontFamily: parsed.preferences?.fontFamily ?? 'default',
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
        theme: 'win98',
        themeCategory: 'os',
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
        layoutType: 'grid',
        showLayoutSwitcher: true,
        showHorizontalLayoutPicker: true,
        enabledLayouts: ['grid', 'list', 'carousel', 'masonry', 'board', 'timeline', 'gallery', 'spotlight', 'compact', 'split', 'hexagon', 'card', 'table'],
        showOldCoins: true,
        currencyFilter: 'both',
        visibleCountries: EUROPEAN_COUNTRIES,
        featureFlags: DEFAULT_FEATURE_FLAGS,
        appearanceMode: 'system',
        darkModeStyle: 'blue',
        fontFamily: 'default',
      }
    };
  });
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Track Service Worker Status
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const updateStatus = () => {
      if (!navigator.serviceWorker.controller) {
        setSwStatus('None');
        return;
      }
      
      const state = navigator.serviceWorker.controller.state;
      if (state === 'activated') setSwStatus('Active');
      else if (state === 'installed') setSwStatus('Waiting');
      else if (state === 'installing') setSwStatus('Installing');
      else setSwStatus('None');
    };

    updateStatus();
    
    // Listen for changes
    navigator.serviceWorker.ready.then(reg => {
      const sw = reg.active || reg.waiting || reg.installing;
      if (sw) {
        sw.addEventListener('statechange', updateStatus);
      }
    });

    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const [activeTab, setActiveTab] = useState<'collection' | 'library' | 'explore' | 'stats' | 'profile'>('collection');
  const [activeGameMode, setActiveGameMode] = useState<string | null>(null);
  const [activeNarrativeStoryId, setActiveNarrativeStoryId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [unlockedFolders, setUnlockedFolders] = useState<string[]>([]);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [fullLibrary, setFullLibrary] = useState<{id: string, url: string}[]>([]);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  
  useEffect(() => {
    if (activeTab === 'library' || showLibraryPicker) {
      imageStorage.list().then(setFullLibrary);
    }
  }, [activeTab, showLibraryPicker]);

  const cleanupLibrary = async () => {
    const allImages = await imageStorage.list();
    const usedImageIds = new Set(coins.map(c => c.imageId).filter(Boolean));
    
    let removedCount = 0;
    for (const img of allImages) {
      if (!usedImageIds.has(img.id)) {
        await imageStorage.delete(img.id);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      imageStorage.list().then(setFullLibrary);
      setFeedback({ message: `Cleaned up ${removedCount} unused images`, type: 'success' });
      addLog(`System: Cleaned up ${removedCount} unused images from library`, 'system');
    } else {
      setFeedback({ message: 'Library is already clean', type: 'info' });
    }
  };

  const deleteFromLibrary = async (id: string) => {
    const img = fullLibrary.find(i => i.id === id);
    if (!img) return;

    // Save for undo
    const affectedCoins = coins.filter(c => c.imageId === id).map(c => c.id);
    setLastDeletedImage({ ...img, affectedCoins });

    await imageStorage.delete(id);
    setCoins(prev => prev.map(c => c.imageId === id ? { ...c, image: undefined, imageId: undefined } : c));
    imageStorage.list().then(setFullLibrary);
    
    setFeedback({ 
      message: 'Image removed from library', 
      type: 'info',
      action: {
        label: 'Undo',
        onAction: () => {
          if (img) {
            imageStorage.save(img.id, img.url).then(() => {
              setCoins(prev => prev.map(c => affectedCoins.includes(c.id) ? { ...c, image: `image_library/${img.id}.jpg`, imageId: img.id } : c));
              imageStorage.list().then(setFullLibrary);
              setFeedback({ message: 'Deletion undone', type: 'success' });
            });
          }
        }
      }
    });
  };
  const [isSpinning, setIsSpinning] = useState(false);
  const [showSpinModal, setShowSpinModal] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all');
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<Coin | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ 
    message: string; 
    type: 'success' | 'info' | 'error' | 'load';
    action?: { label: string; onAction: () => void };
  } | null>(null);
  const [lastDeletedImage, setLastDeletedImage] = useState<{ id: string; url: string; affectedCoins: string[] } | null>(null);
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

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    const theme = profile.preferences.theme;
    const appearance = profile.preferences.appearanceMode;
    const darkModeStyle = profile.preferences.darkModeStyle;
    const fontId = profile.preferences.fontFamily;
    const customFont = profile.preferences.customFont;
    
    // Remove all theme classes
    const themeClasses = THEME_CATEGORIES.flatMap(c => c.themes.map(t => `theme-${t.id}`));
    body.classList.remove(...themeClasses);
    body.classList.remove('dark-purple', 'dark-blue');
    
    const isDark = appearance === 'system' ? systemIsDark : appearance === 'dark';
    root.classList.toggle('dark', isDark);
    
    if (isDark) {
      body.classList.add(`dark-${darkModeStyle}`);
    }
    
    // Apply Theme Class
    body.classList.add(`theme-${theme}`);
    
    // Apply Font
    if (customFont) {
      root.style.setProperty('--font-sans', customFont);
    } else {
      const selectedFont = FONTS.find(f => f.id === fontId) || FONTS[0];
      root.style.setProperty('--font-sans', selectedFont.family);
    }
  }, [profile.preferences.theme, profile.preferences.appearanceMode, profile.preferences.darkModeStyle, profile.preferences.fontFamily, profile.preferences.customFont, systemIsDark]);

  const shouldReduceMotion = useReducedMotion();
  const springConfig = shouldReduceMotion ? { type: 'tween', duration: 0.2 } : SPRING_CONFIG;
  const softSpring = shouldReduceMotion ? { type: 'tween', duration: 0.3 } : SOFT_SPRING;
  const modalTransition = shouldReduceMotion ? { type: 'tween', duration: 0.4 } : MODAL_TRANSITION;

  const isCompact = useMemo(() => {
    return profile.preferences.compactUI;
  }, [profile.preferences.compactUI]);

  const isMini = useMemo(() => windowWidth < 370, [windowWidth]);
  const isLarge = useMemo(() => windowWidth > 420, [windowWidth]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });
  
  const headerScale = useTransform(scrollY, [0, 150], [1, 0.96]);
  const headerOpacity = useTransform(scrollY, [0, 150], [1, 0.98]);
  const headerY = useTransform(scrollY, [0, 150], [0, -8]);
  const headerBlur = useTransform(scrollY, [0, 150], [0, 4]);
  const blurTemplate = useMotionTemplate`blur(${headerBlur}px)`;

  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [inputModal, setInputModal] = useState<{ title: string; placeholder: string; onConfirm: (value: string) => void } | null>(null);
  const [modalInputValue, setModalInputValue] = useState('');
  const [compareCoins, setCompareCoins] = useState<string[]>([]);
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [expandedEventIdx, setExpandedEventIdx] = useState<number | null>(null);
  const [swStatus, setSwStatus] = useState<'Active' | 'Waiting' | 'Installing' | 'None'>('None');
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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedCoinIds, setSelectedCoinIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);
  const [activeBulkMenu, setActiveBulkMenu] = useState<'move' | 'type' | 'price' | null>(null);
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
          className={`flex-shrink-0 w-64 p-7 rounded-[2.75rem] text-left transition-all relative overflow-hidden fixed-card-lg ${
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
                <h4 className="font-black text-xl leading-tight text-locked-1 tracking-tight">{timeline.title}</h4>
                {isPersonal && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
              </div>
              {locked && <Lock size={16} className="text-gray-400/60" />}
            </div>
            <p className={`text-[11px] font-bold leading-relaxed text-locked-2 mb-6 ${locked ? 'text-gray-400/60' : isActive || isPersonal ? 'text-blue-100/80' : 'text-gray-400 dark:text-gray-500'}`}>
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
        className="space-y-6 pb-24 flex-1 flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-2 flex-shrink-0 h-[40px]">
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
              whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
              transition={springConfig}
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
          whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
          whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
          transition={springConfig}
          onClick={() => toggleSection(id)}
          className={`w-full flex items-center justify-between p-4 rounded-[2rem] transition-all ${
            isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30' : 'bg-system-background'
          } border premium-border`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-2xl shadow-sm transition-all ${isExpanded ? 'bg-blue-600 text-white shadow-blue-200/50' : 'bg-secondary-system-background text-system-tertiary-label'}`}>
              <Icon size={20} />
            </div>
            <div className="flex flex-col items-start">
              <span className={`font-black uppercase tracking-widest text-[11px] ${isExpanded ? 'text-blue-600 dark:text-blue-400' : 'text-system-tertiary-label'}`}>{title}</span>
              {badge && <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-0.5">{badge}</span>}
            </div>
          </div>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
            <ChevronDown size={20} className={isExpanded ? 'text-blue-600' : 'text-system-quaternary-label'} />
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
              <div className="bg-system-background divide-y divide-gray-50/50 dark:divide-gray-800/50 overflow-hidden rounded-[2rem] border border-gray-100 dark:border-gray-800/50 mt-1">
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
    <div className={`px-4 h-[88px] flex items-center justify-between transition-all ${value ? 'bg-blue-50/20 dark:bg-blue-900/5' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl transition-all ${value ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'bg-secondary-system-background text-system-tertiary-label'}`}>
          <Icon size={18} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-black text-system-label text-sm tracking-tight">{label}</span>
            {badge && <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md">{badge}</span>}
          </div>
          {description && <span className="text-[10px] text-system-secondary-label font-bold leading-tight mt-1 tracking-tight">{description}</span>}
        </div>
      </div>
      <button 
        onClick={onChange}
        className={`w-14 h-7 rounded-full transition-all relative flex-shrink-0 p-1 ${value ? 'bg-blue-600' : 'bg-secondary-system-background border border-gray-100 dark:border-gray-800'}`}
      >
        <motion.div 
          animate={{ x: value ? 28 : 0 }}
          transition={springConfig}
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
    <div className="px-4 h-[72px] flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-secondary-system-background text-system-tertiary-label">
          <Icon size={18} />
        </div>
        <span className="font-black text-system-label text-sm tracking-tight">{label}</span>
      </div>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-secondary-system-background px-4 h-[36px] rounded-2xl text-[11px] font-black border-none focus:ring-2 focus:ring-blue-500/50 text-system-label transition-all appearance-none pr-8 relative"
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
  const [newImageId, setNewImageId] = useState<string | undefined>(undefined);
  const [newFolderId, setNewFolderId] = useState<string>('purchased');
  const [newAmountPaid, setNewAmountPaid] = useState('0');
  const [newMint, setNewMint] = useState('');
  const [newEra, setNewEra] = useState('');
  const [newCountry, setNewCountry] = useState('United Kingdom');
  const [newRegion, setNewRegion] = useState('Mainland');
  const [newCurrencyType, setNewCurrencyType] = useState<'Modern' | 'Old'>('Modern');

  const availableDenominations = useMemo(() => {
    if (newCurrencyType === 'Modern') {
      return MODERN_CURRENCIES_BY_COUNTRY[newCountry] || EURO_MODERN_CURRENCIES;
    }
    if (newCurrencyType === 'Old' && PRE_EURO_CURRENCIES[newCountry]) {
      return PRE_EURO_CURRENCIES[newCountry];
    }
    return DEFAULT_DENOMINATIONS;
  }, [newCountry, newCurrencyType]);

  const allPossibleDenominations = useMemo(() => {
    const denoms = new Set([...DEFAULT_DENOMINATIONS, ...EURO_MODERN_CURRENCIES, ...UK_MODERN_CURRENCIES]);
    Object.values(PRE_EURO_CURRENCIES).forEach(list => list.forEach(d => denoms.add(d)));
    profile.preferences.customDenominations.forEach(d => denoms.add(d));
    return Array.from(denoms).sort();
  }, [profile.preferences.customDenominations]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);

  const refreshApp = () => {
    const savedCoins = storage.load('coin-collection');
    const savedFolders = storage.load('coin-folders');
    const savedProfile = storage.load('coin-profile');
    
    if (savedCoins) setCoins(savedCoins);
    if (savedFolders) setFolders(savedFolders);
    if (savedProfile) setProfile(savedProfile);
    
    setFeedback({ message: 'App state refreshed from storage', type: 'load' });
    addLog('User action: Refresh App', 'action');
  };

  const resetServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      return true;
    }
    return false;
  };

  const clearAppCache = async () => {
    if ('caches' in window) {
      const names = await caches.keys();
      for (const name of names) {
        await caches.delete(name);
      }
      return true;
    }
    return false;
  };

  const clearAppIndexedDB = async () => {
    if ('indexedDB' in window && (indexedDB as any).databases) {
      const dbs = await (indexedDB as any).databases();
      for (const db of dbs) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
      return true;
    }
    return false;
  };

  const hardReload = () => {
    window.location.reload();
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fontData = event.target?.result as string;
        const fontUrl = URL.createObjectURL(file);
        const fontName = `CustomFont-${Date.now()}`;
        const style = document.createElement('style');
        style.textContent = `
          @font-face {
            font-family: "${fontName}";
            src: url("${fontUrl}");
          }
        `;
        document.head.appendChild(style);
        
        setProfile({
          ...profile,
          preferences: {
            ...profile.preferences,
            fontFamily: 'custom',
            customFont: `"${fontName}", sans-serif`
          }
        });
        setFeedback({ message: 'Custom font applied!', type: 'load' });
      };
      reader.readAsArrayBuffer(file);
    }
  };

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
    if (activeTab === 'stats') {
      const interval = setInterval(() => {
        setActiveInsightIndex(prev => (prev + 1) % 4);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

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
      setNewImageId(undefined); // Reset library ID if uploading new
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

  const addCoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    let imageId = newImageId || isEditing?.imageId;
    if (!newImage) {
      imageId = undefined;
    } else if (newImage !== isEditing?.image && !newImageId) {
      imageId = crypto.randomUUID();
      await imageStorage.save(imageId, newImage);
    }

    const { value: denomValue, unit: denomUnit } = parseDenomination(newType);

    const coinData = {
      name: newName.trim(),
      year: newYear,
      type: newType,
      rarity: newRarity,
      summary: newSummary,
      image: imageId ? `image_library/${imageId}.jpg` : undefined,
      imageId,
      folderId: newFolderId,
      amountPaid: parseFloat(newAmountPaid) || 0,
      tags: newTags,
      mint: newMint,
      era: newEra,
      country: newCountry,
      region: newCountry === 'United Kingdom' ? newRegion : undefined,
      currencyType: newCurrencyType,
      denomValue,
      denomUnit,
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
    setIsAdding(false);
    setIsEditing(null);
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
    setNewImageId(undefined);
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
    setNewCountry('United Kingdom');
    setNewRegion('Mainland');
    setNewCurrencyType('Modern');
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
    setNewImageId(coin.imageId);
    
    // If we have an imageId but no base64 in newImage, load it for preview
    if (coin.imageId && (!coin.image || coin.image.startsWith('image_library/'))) {
      imageStorage.load(coin.imageId).then(url => {
        if (url) setNewImage(url);
      });
    }

    setNewFolderId(coin.folderId);
    setNewAmountPaid(coin.amountPaid?.toString() || '0');
    setNewMint(coin.mint || '');
    setNewEra(coin.era || '');
    setNewCountry(coin.country || 'United Kingdom');
    setNewRegion(coin.region || 'Mainland');
    setNewCurrencyType(coin.currencyType || 'Modern');
    setIsEditing(coin);
    setIsAdding(true);
    setSelectedCoin(null);
  };

  const handleSelectFromLibrary = (id: string, url: string) => {
    setNewImage(url);
    setNewImageId(id);
    setShowLibraryPicker(false);
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
    // Ensure no base64 is exported in the JSON
    const sanitizedCoins = coins.map(c => {
      if (c.image && c.image.startsWith('data:image')) {
        return { ...c, image: c.imageId ? `image_library/${c.imageId}.jpg` : undefined };
      }
      return c;
    });

    const data = {
      coins: sanitizedCoins,
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
                  imageId: c.imageId || null,
                  amountPaid: Number(c.amountPaid) || 0,
                  summary: String(c.summary ?? '').substring(0, 100),
                  folderId: String(c.folderId ?? 'purchased'),
                  dateAdded: Number(c.dateAdded) || Date.now(),
                  lastOpened: Number(c.lastOpened) || Date.now(),
                  tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
                  mint: c.mint ? String(c.mint) : undefined,
                  era: c.era ? String(c.era) : undefined,
                  country: c.country ? String(c.country) : undefined,
                  region: c.region ? String(c.region) : undefined,
                  currencyType: c.currencyType === 'Old' ? 'Old' : 'Modern',
                  denomValue: c.denomValue !== undefined ? Number(c.denomValue) : undefined,
                  denomUnit: c.denomUnit ? String(c.denomUnit) : undefined,
                };
              });
            importedCount = newCoins.length;
            const finalCoins = [...prev, ...newCoins];
            // Trigger migration for imported coins if they have base64
            setTimeout(() => migrateImages(finalCoins), 0);
            return finalCoins;
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

    // Currency Type Filter
    if (!profile.preferences.showOldCoins) {
      filtered = filtered.filter(c => c.currencyType !== 'Old');
    } else {
      if (profile.preferences.currencyFilter === 'modern') {
        filtered = filtered.filter(c => (c.currencyType === 'Modern' || !c.currencyType) && !(c.country === 'United Kingdom' && c.region && c.region !== 'Mainland'));
      } else if (profile.preferences.currencyFilter === 'old') {
        filtered = filtered.filter(c => c.currencyType === 'Old' || (c.country === 'United Kingdom' && c.region && c.region !== 'Mainland'));
      }
    }

    // Visible Countries Filter
    if (profile.preferences.visibleCountries && profile.preferences.visibleCountries.length > 0) {
      filtered = filtered.filter(c => !c.country || profile.preferences.visibleCountries.includes(c.country));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.year.includes(query) || 
        c.type.toLowerCase().includes(query) ||
        c.summary.toLowerCase().includes(query) ||
        c.country?.toLowerCase().includes(query) ||
        (c.country === 'Ireland' && (query.includes('eire') || query.includes('punt'))) ||
        c.region?.toLowerCase().includes(query) ||
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
      } else if (groupBy === 'country') {
        const country = coin.country || 'United Kingdom';
        if (country === 'United Kingdom') {
          key = `UK / ${coin.region || 'Mainland'}`;
        } else if (country === 'Ireland' && coin.currencyType === 'Old') {
          key = 'Ireland / Irish Pound (Punt)';
        } else {
          const currency = coin.currencyType || 'Modern';
          key = `${country} / ${currency}`;
        }
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(coin);
    });

    return groups;
  }, [sortedCoins, profile.preferences.groupViewEnabled, profile.preferences.groupBy]);

  const stats = useMemo(() => {
    const allDenoms = allPossibleDenominations;
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

  const renderLayoutSwitcher = () => {
    if (!profile.preferences.showLayoutSwitcher) return null;

    const allLayouts: { type: LayoutType; icon: any; label: string; summary: string; category: 'text' | 'visual' }[] = [
      { type: 'grid', icon: LayoutGrid, label: 'Grid', summary: "Balanced visual grid of coins", category: 'visual' },
      { type: 'card', icon: Layers, label: 'Card', summary: "Detailed coin view in clean text cards", category: 'text' },
      { type: 'table', icon: BarChart2, label: 'Table', summary: "Structured columns for quick comparison", category: 'text' },
      { type: 'list', icon: ListIcon, label: 'List', summary: "Simple vertical list with key details", category: 'text' },
      { type: 'compact', icon: Smartphone, label: 'Compact', summary: "Dense single-line overview of coins", category: 'text' },
      { type: 'carousel', icon: PlayCircle, label: 'Carousel', summary: "Swipe through coins one by one", category: 'visual' },
      { type: 'masonry', icon: Grid, label: 'Masonry', summary: "Dynamic stacked layout with varied sizes", category: 'visual' },
      { type: 'board', icon: Columns, label: 'Board', summary: "Grouped sections like a collection board", category: 'visual' },
      { type: 'timeline', icon: History, label: 'Timeline', summary: "Coins arranged by time and history", category: 'visual' },
      { type: 'gallery', icon: ImageIcon, label: 'Gallery', summary: "Visual showcase of coin images", category: 'visual' },
      { type: 'spotlight', icon: Eye, label: 'Spotlight', summary: "Focus on one coin at a time", category: 'visual' },
      { type: 'split', icon: Layout, label: 'Split', summary: "Dual view for comparison and browsing", category: 'visual' },
      { type: 'hexagon', icon: Zap, label: 'Hexagon', summary: "Unique geometric coin arrangement", category: 'visual' },
    ];

    const layouts = allLayouts.filter(l => profile.preferences.enabledLayouts.includes(l.type));
    const currentLayout = layouts.find(l => l.type === profile.preferences.layoutType) || layouts[0];

    if (profile.preferences.showHorizontalLayoutPicker) {
      return (
        <div className="w-full overflow-x-auto no-scrollbar pb-6 pt-2 -mx-4 px-4">
          <div className="flex gap-4 min-w-max">
            {layouts.map((layout) => {
              const isActive = profile.preferences.layoutType === layout.type;
              const Icon = layout.icon;
              
              return (
                <motion.button
                  key={layout.type}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setProfile(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, layoutType: layout.type }
                    }));
                    addLog(`Layout changed to ${layout.label}`, 'action');
                  }}
                  className={`flex flex-col items-start p-4 rounded-[2.5rem] transition-all w-[200px] text-left border-2 relative overflow-hidden ${
                    isActive 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-2xl shadow-blue-500/30' 
                      : 'ios-surface border-gray-100 dark:border-gray-800 text-gray-500 hover:border-blue-200 dark:hover:border-blue-900/30'
                  }`}
                >
                  <div className={`w-full h-24 rounded-[1.5rem] flex items-center justify-center mb-4 relative overflow-hidden ${
                    isActive ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-800'
                  }`}>
                    <div className="absolute inset-0 opacity-10">
                      <div className="grid grid-cols-4 gap-1 p-2">
                         {[...Array(16)].map((_, i) => <div key={i} className="aspect-square bg-current rounded-sm" />)}
                      </div>
                    </div>
                    <Icon size={32} className={isActive ? 'text-white' : 'text-blue-500'} />
                  </div>
                  
                  <div className="px-1">
                    <p className={`text-[13px] font-black uppercase tracking-widest mb-1 ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      {layout.label}
                    </p>
                    <p className={`text-[10px] font-bold leading-relaxed line-clamp-2 h-[30px] ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                      {layout.summary}
                    </p>
                  </div>

                  {isActive && (
                    <motion.div 
                      layoutId="active-check"
                      className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-lg"
                    >
                      <Check size={14} className="text-blue-600" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowLayoutDropdown(!showLayoutDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 ios-glass rounded-xl border border-white/20 dark:border-white/5 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm w-[120px] justify-center"
        >
          {currentLayout && <currentLayout.icon size={14} className="text-blue-500" />}
          <span className="text-gray-900 dark:text-white hidden sm:inline">{currentLayout?.label || 'Layout'}</span>
          <ChevronDown size={12} className={`text-gray-400 transition-transform duration-300 ${showLayoutDropdown ? 'rotate-180' : ''}`} />
        </motion.button>

        <AnimatePresence>
          {showLayoutDropdown && (
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => setShowLayoutDropdown(false)} />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-56 bg-system-background p-2 shadow-2xl z-[110] border border-gray-100 dark:border-gray-800 rounded-2xl"
              >
                <div className="max-h-80 overflow-y-auto no-scrollbar space-y-4 p-1">
                  {['text', 'visual'].map((cat) => {
                    const catLayouts = layouts.filter(l => l.category === cat);
                    if (catLayouts.length === 0) return null;
                    return (
                      <div key={cat} className="space-y-1">
                        <h4 className="px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-system-tertiary-label">
                          {cat === 'text' ? 'Text Layouts' : 'Visual Layouts'}
                        </h4>
                        {catLayouts.map(l => (
                          <button
                            key={l.type}
                            onClick={() => {
                              setProfile(prev => ({
                                ...prev,
                                preferences: { ...prev.preferences, layoutType: l.type }
                              }));
                              setShowLayoutDropdown(false);
                              addLog(`Layout changed to ${l.label}`, 'action');
                            }}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                              profile.preferences.layoutType === l.type 
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                                : 'hover:bg-secondary-system-background text-system-secondary-label'
                            }`}
                          >
                            <l.icon size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{l.label}</span>
                            {profile.preferences.layoutType === l.type && <Check size={12} className="ml-auto" />}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const [spotlightIdx, setSpotlightIdx] = useState(0);

  const renderLayout = (coinsToRender: Coin[]) => {
    const layout = profile.preferences.layoutType;

    switch (layout) {
      case 'card':
        return (
          <div className="grid grid-cols-1 gap-4">
            {coinsToRender.map(coin => (
              <motion.div 
                key={coin.id}
                layout
                onClick={() => openCoin(coin)}
                className="ios-surface p-6 flex flex-col gap-4 cursor-pointer hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {coin.image || coin.imageId ? (
                        <CoinImage coin={coin} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-black text-gray-300">{coin.type}</span>
                      )}
                    </div>
                    <div>
                      {(profile.preferences.showCoinName || (!profile.preferences.showCoinName && !profile.preferences.showYear && !profile.preferences.showType && !profile.preferences.showRarity && !profile.preferences.showPrice)) && (
                        <h3 className="text-lg font-black tracking-tight text-system-label">{coin.name}</h3>
                      )}
                      {(profile.preferences.showYear || profile.preferences.showType) && (
                        <p className="text-xs text-system-tertiary-label font-bold uppercase tracking-widest">
                          {profile.preferences.showYear && coin.year}
                          {profile.preferences.showYear && profile.preferences.showType && ' • '}
                          {profile.preferences.showType && coin.type}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {profile.preferences.showPrice && <p className="text-sm font-black text-blue-600">£{coin.amountPaid.toFixed(2)}</p>}
                    {profile.preferences.showRarity && <p className="text-[10px] font-bold text-system-tertiary-label uppercase tracking-widest">{coin.rarity}</p>}
                  </div>
                </div>
                {coin.summary && (
                  <p className="text-xs text-system-secondary-label leading-relaxed italic">"{coin.summary}"</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {coin.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-secondary-system-background rounded-lg text-[9px] font-black uppercase tracking-widest text-system-tertiary-label">
                      #{tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className="ios-surface overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary-system-background border-b border-gray-100 dark:border-gray-800">
                    {(profile.preferences.showCoinName || (!profile.preferences.showCoinName && !profile.preferences.showYear && !profile.preferences.showType && !profile.preferences.showRarity && !profile.preferences.showPrice)) && <th className="p-4 text-[10px] font-black uppercase tracking-widest text-system-secondary-label">Coin</th>}
                    {profile.preferences.showYear && <th className="p-4 text-[10px] font-black uppercase tracking-widest text-system-secondary-label">Year</th>}
                    {profile.preferences.showType && <th className="p-4 text-[10px] font-black uppercase tracking-widest text-system-secondary-label">Type</th>}
                    {profile.preferences.showRarity && <th className="p-4 text-[10px] font-black uppercase tracking-widest text-system-secondary-label">Rarity</th>}
                    {profile.preferences.showPrice && <th className="p-4 text-[10px] font-black uppercase tracking-widest text-system-secondary-label text-right">Price</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50 bg-system-background">
                  {coinsToRender.map(coin => (
                    <tr 
                      key={coin.id} 
                      onClick={() => openCoin(coin)}
                      className="hover:bg-secondary-system-background transition-colors cursor-pointer"
                    >
                      {(profile.preferences.showCoinName || (!profile.preferences.showCoinName && !profile.preferences.showYear && !profile.preferences.showType && !profile.preferences.showRarity && !profile.preferences.showPrice)) && (
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-secondary-system-background overflow-hidden flex items-center justify-center flex-shrink-0">
                              {coin.image || coin.imageId ? (
                                <CoinImage coin={coin} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-black text-system-secondary-label">{coin.type}</span>
                              )}
                            </div>
                            <span className="text-xs font-bold truncate max-w-[120px] text-system-label">{coin.name}</span>
                          </div>
                        </td>
                      )}
                      {profile.preferences.showYear && <td className="p-4 text-xs font-black text-system-secondary-label">{coin.year}</td>}
                      {profile.preferences.showType && <td className="p-4 text-xs font-bold text-system-secondary-label">{coin.type}</td>}
                      {profile.preferences.showRarity && (
                        <td className="p-4">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            coin.rarity === 'Very Rare' ? 'bg-red-50 text-red-600' :
                            coin.rarity === 'Rare' ? 'bg-amber-50 text-amber-600' :
                            'bg-secondary-system-background text-system-secondary-label'
                          }`}>
                            {coin.rarity}
                          </span>
                        </td>
                      )}
                      {profile.preferences.showPrice && <td className="p-4 text-right text-xs font-black text-blue-600">£{coin.amountPaid.toFixed(2)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="space-y-2">
            {coinsToRender.map(coin => (
              <motion.div 
                key={coin.id}
                layout
                onClick={() => openCoin(coin)}
                className="ios-surface p-3 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-all h-[64px]"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {coin.image || coin.imageId ? (
                    <CoinImage coin={coin} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-black text-gray-400">{coin.type}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {(profile.preferences.showCoinName || (!profile.preferences.showCoinName && !profile.preferences.showYear && !profile.preferences.showType && !profile.preferences.showRarity && !profile.preferences.showPrice)) && (
                    <h3 className="text-xs font-black truncate h-[16px] text-system-label">{coin.name}</h3>
                  )}
                  {(profile.preferences.showYear || profile.preferences.showType || profile.preferences.showRarity) && (
                    <p className="text-[10px] text-system-tertiary-label font-bold uppercase tracking-widest h-[14px] flex items-center gap-1.5">
                      {profile.preferences.showYear && <span>{coin.year}</span>}
                      {profile.preferences.showYear && (profile.preferences.showType || profile.preferences.showRarity) && <span>•</span>}
                      {profile.preferences.showType && <span>{coin.type}</span>}
                      {profile.preferences.showType && profile.preferences.showRarity && <span>•</span>}
                      {profile.preferences.showRarity && (
                        <span className={
                          coin.rarity === 'Very Rare' ? 'text-amber-500' :
                          coin.rarity === 'Rare' ? 'text-blue-500' : ''
                        }>{coin.rarity}</span>
                      )}
                    </p>
                  )}
                </div>
                {profile.preferences.showPrice && <div className="text-xs font-black text-blue-500 w-16 text-right">£{coin.amountPaid.toFixed(2)}</div>}
              </motion.div>
            ))}
          </div>
        );

      case 'carousel':
        return (
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x h-[340px]">
            {coinsToRender.map(coin => (
              <motion.div 
                key={coin.id}
                layout
                onClick={() => openCoin(coin)}
                className="w-64 flex-shrink-0 snap-center ios-surface p-4 space-y-4 cursor-pointer h-[320px]"
              >
                <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                  {coin.image || coin.imageId ? (
                    <CoinImage coin={coin} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-black text-gray-300">{coin.type}</span>
                  )}
                </div>
                <div className="h-[40px]">
                  <h3 className="text-sm font-black truncate h-[20px]">{coin.name}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest h-[16px]">{coin.year} • {coin.type}</p>
                </div>
              </motion.div>
            ))}
          </div>
        );

      case 'masonry':
        return (
          <div className="grid grid-cols-2 gap-4">
            {coinsToRender.map((coin, idx) => (
              <motion.div 
                key={coin.id}
                layout
                onClick={() => openCoin(coin)}
                className={`ios-surface p-4 flex flex-col gap-3 cursor-pointer ${idx % 3 === 0 ? 'row-span-2' : ''}`}
              >
                <div className={`rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center ${idx % 3 === 0 ? 'h-48' : 'h-32'}`}>
                  {coin.image || coin.imageId ? (
                    <CoinImage coin={coin} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-gray-300">{coin.type}</span>
                  )}
                </div>
                <h3 className="text-xs font-black truncate">{coin.name}</h3>
              </motion.div>
            ))}
          </div>
        );

      case 'board':
        const rarities: Rarity[] = ['Common', 'Rare', 'Very Rare'];
        return (
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {rarities.map(rarity => (
              <div key={rarity} className="w-72 flex-shrink-0 space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">{rarity}</h3>
                  <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    {coinsToRender.filter(c => c.rarity === rarity).length}
                  </span>
                </div>
                <div className="space-y-3">
                  {coinsToRender.filter(c => c.rarity === rarity).map(coin => (
                    <motion.div 
                      key={coin.id}
                      layout
                      onClick={() => openCoin(coin)}
                      className="ios-surface p-3 space-y-2 cursor-pointer"
                    >
                      <h4 className="text-xs font-black truncate">{coin.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold">{coin.year}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 'timeline':
        return (
          <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-gray-800">
            {[...coinsToRender].sort((a, b) => parseInt(a.year) - parseInt(b.year)).map(coin => (
              <motion.div 
                key={coin.id}
                layout
                onClick={() => openCoin(coin)}
                className="relative ios-surface p-4 cursor-pointer"
              >
                <div className="absolute -left-[29px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-gray-900 shadow-sm" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-blue-500">{coin.year}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{coin.type}</span>
                </div>
                <h3 className="text-sm font-black">{coin.name}</h3>
              </motion.div>
            ))}
          </div>
        );

      case 'gallery':
        return (
          <div className="grid grid-cols-1 gap-6">
            {coinsToRender.map(coin => (
              <motion.div 
                key={coin.id}
                layout
                onClick={() => openCoin(coin)}
                className="ios-surface overflow-hidden cursor-pointer group h-[240px]"
              >
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative h-full flex items-center justify-center overflow-hidden">
                  {coin.image || coin.imageId ? (
                    <CoinImage coin={coin} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <span className="text-4xl font-black text-gray-200 dark:text-gray-700">{coin.type}</span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <h3 className="text-white font-black text-xl tracking-tighter truncate w-full">{coin.name}</h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        );

      case 'spotlight':
        const currentCoin = coinsToRender[spotlightIdx % coinsToRender.length];
        if (!currentCoin) return null;
        return (
          <div className="space-y-6">
            <motion.div 
              key={currentCoin.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="ios-surface p-8 text-center space-y-6"
            >
              <div className="w-48 h-48 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden shadow-2xl premium-border flex items-center justify-center">
                {currentCoin.image || currentCoin.imageId ? (
                  <CoinImage coin={currentCoin} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-gray-300">{currentCoin.type}</span>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter mb-2">{currentCoin.name}</h2>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-[0.2em]">{currentCoin.year} • {currentCoin.type}</p>
              </div>
              <button 
                onClick={() => openCoin(currentCoin)}
                className="px-8 py-3 bg-blue-600 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20"
              >
                View Details
              </button>
            </motion.div>
            <div className="flex items-center justify-center gap-4">
              <button 
                onClick={() => setSpotlightIdx(prev => (prev - 1 + coinsToRender.length) % coinsToRender.length)}
                className="p-4 rounded-full ios-glass"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs font-black text-gray-400">{(spotlightIdx % coinsToRender.length) + 1} / {coinsToRender.length}</span>
              <button 
                onClick={() => setSpotlightIdx(prev => (prev + 1) % coinsToRender.length)}
                className="p-4 rounded-full ios-glass"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        );

      case 'compact':
        return (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {coinsToRender.map(coin => (
              <motion.div 
                key={coin.id}
                layout
                onClick={() => openCoin(coin)}
                className="aspect-square bg-system-background rounded-[1.5rem] border border-gray-100 dark:border-gray-800 p-1 cursor-pointer overflow-hidden group"
              >
                <div className="w-full h-full rounded-lg bg-secondary-system-background overflow-hidden relative flex items-center justify-center">
                  {coin.image || coin.imageId ? (
                    <CoinImage coin={coin} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-system-quaternary-label">{coin.type}</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[8px] text-white font-black uppercase text-center p-1 gap-0.5">
                    {(profile.preferences.showCoinName || (!profile.preferences.showCoinName && !profile.preferences.showYear && !profile.preferences.showType && !profile.preferences.showRarity && !profile.preferences.showPrice)) && <span className="truncate w-full">{coin.name}</span>}
                    {profile.preferences.showYear && <span>{coin.year}</span>}
                    {profile.preferences.showType && <span className="truncate w-full">{coin.type}</span>}
                    {profile.preferences.showRarity && <span className="truncate w-full">{coin.rarity}</span>}
                    {profile.preferences.showPrice && <span>£{coin.amountPaid.toFixed(2)}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        );

      case 'split':
        return (
          <div className="space-y-4">
            {coinsToRender.map(coin => (
              <motion.div 
                key={coin.id}
                layout
                onClick={() => openCoin(coin)}
                className="bg-system-background rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden flex h-32 cursor-pointer"
              >
                <div className="w-1/3 bg-secondary-system-background h-full flex items-center justify-center overflow-hidden">
                  {coin.image || coin.imageId ? (
                    <CoinImage coin={coin} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-system-quaternary-label">{coin.type}</span>
                  )}
                </div>
                <div className="flex-1 p-4 flex flex-col justify-center">
                  <h3 className="text-sm font-black mb-1 truncate h-[20px] text-system-label">{coin.name}</h3>
                  <p className="text-[10px] text-system-secondary-label font-bold uppercase tracking-widest h-[14px]">{coin.year} • {coin.type}</p>
                </div>
              </motion.div>
            ))}
          </div>
        );

      case 'hexagon':
        return (
          <div className="flex flex-wrap justify-center gap-4 p-4">
            {coinsToRender.map((coin, idx) => (
              <motion.div 
                key={coin.id}
                layout
                onClick={() => openCoin(coin)}
                className={`w-24 h-28 relative cursor-pointer group ${idx % 2 === 0 ? 'mt-8' : ''}`}
                style={{
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                }}
              >
                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 h-full w-full flex items-center justify-center overflow-hidden">
                  {coin.image || coin.imageId ? (
                    <CoinImage coin={coin} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-black text-gray-300">{coin.type}</span>
                  )}
                  <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-black">
                    {coin.year}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        );

      default:
        return (
          <div className={isCompact ? 'space-y-3' : 'space-y-4'}>
            {coinsToRender.map(coin => renderCoinCard(coin))}
          </div>
        );
    }
  };

  const renderSummaryBar = () => (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={softSpring}
      className={`ios-surface p-4 mb-6 flex items-center justify-between ${isCompact ? 'text-[9px]' : 'text-[10px]'} font-black uppercase tracking-[0.25em] shadow-sm inner-glow relative z-10`}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 group cursor-default">
          <Coins size={isCompact ? 10 : 12} className="text-blue-500 transition-transform group-hover:scale-110" />
          <span className="flex items-center gap-1.5">{stats.total} <span className="text-gray-400 dark:text-gray-500 font-bold">Coins</span></span>
        </div>
        <div className="flex items-center gap-2 group cursor-default">
          <Zap size={isCompact ? 10 : 12} className="text-amber-500 transition-transform group-hover:scale-110" />
          <span className="flex items-center gap-1.5">{profile.points} <span className="text-gray-400 dark:text-gray-500 font-bold">XP</span></span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className={`${isCompact ? 'w-12' : 'w-20'} h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner`}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressToNextLevel}%` }}
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.4)]"
            />
          </div>
          <span className="text-blue-600 dark:text-blue-400 font-black">{progressToNextLevel}%</span>
        </div>
        <div className="w-px h-3 bg-gray-200 dark:bg-white/10" />
        <span className="text-gray-500 dark:text-gray-400 font-bold truncate max-w-[60px]">{currentLevel.name}</span>
      </div>
    </motion.div>
  );

  const renderHeader = () => {
    const headerPaddingTop = isMini ? 'pt-4' : isCompact ? 'pt-6' : isLarge ? 'pt-14' : 'pt-10';
    const headerPaddingBottom = isMini ? 'pb-2' : isCompact ? 'pb-4' : isLarge ? 'pb-10' : 'pb-6';
    const titleSize = isMini ? 'text-2xl' : isCompact ? 'text-3xl' : isLarge ? 'text-5xl' : 'text-4xl';
    const iconSize = isMini ? 'w-10 h-10' : isCompact ? 'w-12 h-12' : isLarge ? 'w-20 h-20' : 'w-16 h-16';
    const starSize = isMini ? 20 : isCompact ? 24 : isLarge ? 40 : 32;
    const spacing = isMini ? 'mb-4' : isCompact ? 'mb-6' : isLarge ? 'mb-12' : 'mb-8';

    return (
      <motion.header 
        style={{ 
          scale: headerScale, 
          opacity: headerOpacity,
          y: headerY,
          filter: blurTemplate
        }}
        className={`px-4 ${headerPaddingTop} ${headerPaddingBottom} relative z-10 transition-all duration-300 overflow-hidden`}
      >
        {/* Mesh background effect - subtle and blended */}
        <div className="absolute inset-0 mesh-gradient opacity-20 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
        
        <div className="max-w-md mx-auto relative z-10">
          <div className={`flex items-center justify-between ${spacing}`}>
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={shouldReduceMotion ? {} : { rotate: 5, scale: 1.05 }}
                whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                transition={springConfig}
                className={`${iconSize} bg-gradient-to-br from-blue-500 to-blue-600 rounded-[1.75rem] flex items-center justify-center text-white shadow-lg shadow-blue-500/20 transition-transform premium-border border border-blue-400/20 inner-glow`}
              >
                <Star size={starSize} className="fill-white" />
              </motion.div>
              <div>
                <h1 className={`${titleSize} font-black tracking-tighter leading-none text-gradient-blue`}>Coinly</h1>
                {!profile.preferences.focusMode && (
                  <div className={`flex items-center gap-3 ${isMini ? 'mt-1.5' : 'mt-3'}`}>
                    <motion.div 
                      whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                      whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                      transition={springConfig}
                      className="flex items-center gap-2 ios-glass px-2.5 py-0.5 rounded-full border border-white/20 dark:border-white/5 shadow-sm cursor-default inner-glow"
                    >
                      <Flame size={isMini ? 12 : 14} className="text-orange-500 fill-orange-500/20" />
                      <span className={`${isMini ? 'text-[10px]' : 'text-xs'} font-black text-orange-600 dark:text-orange-400 tracking-tight`}>{profile.streak.current}</span>
                    </motion.div>
                    <div className="w-1 h-1 bg-secondary-system-background rounded-full" />
                    <p className={`${isMini ? 'text-[8px]' : 'text-[10px]'} font-black text-system-tertiary-label uppercase tracking-[0.25em]`}>{currentLevel.name}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!profile.preferences.focusMode && (
                <motion.button
                  whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                  whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                  transition={springConfig}
                  onClick={handleLuckySpin}
                  disabled={isSpinning}
                  className={`${isMini ? 'p-2' : isCompact ? 'p-2.5' : 'p-3.5'} rounded-[1.25rem] transition-all relative overflow-hidden ios-button ${
                    isSpinning 
                      ? 'bg-secondary-system-background text-system-tertiary-label animate-spin' 
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                  title="Daily Lucky Spin"
                >
                  <Gift size={isMini ? 18 : 22} />
                </motion.button>
              )}
              <div className="flex gap-1">
                {!profile.preferences.focusMode && (
                  <>
                    <motion.button 
                      whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                      whileTap={shouldReduceMotion ? {} : BUTTON_TAP} 
                      transition={springConfig}
                      id="refresh-app-btn" 
                      onClick={() => window.location.reload()} 
                      className={`${isMini ? 'p-2' : 'p-3.5'} text-system-tertiary-label hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-[1.25rem] ios-button`} 
                      title="Refresh App"
                    >
                      <Clock size={isMini ? 18 : 22} />
                    </motion.button>
                    <motion.button 
                      whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                      whileTap={shouldReduceMotion ? {} : BUTTON_TAP} 
                      transition={springConfig}
                      id="export-data-btn" 
                      onClick={exportData} 
                      className={`${isMini ? 'p-2' : 'p-3.5'} text-system-tertiary-label hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-[1.25rem] ios-button`} 
                      title="Export Data"
                    >
                      <Download size={isMini ? 18 : 22} />
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
                  className="ios-surface p-4 flex items-center gap-4 relative overflow-hidden h-full"
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
            className={`rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl premium-shadow premium-border border inner-glow h-[280px] flex flex-col justify-center ${
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
      </motion.header>
    );
  };

  const renderSkeletonCard = () => (
    <div className={`ios-surface flex items-center justify-between animate-pulse overflow-hidden fixed-card ${isCompact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {!profile.preferences.textMode && (
          <div className={`${isCompact ? 'w-14 h-14' : 'w-20 h-20'} rounded-2xl bg-gray-100 dark:bg-gray-800 flex-shrink-0 image-reserve`} />
        )}
        <div className="min-w-0 flex-1">
          <div className={`bg-gray-100 dark:bg-gray-800 rounded-full mb-1 ${isCompact ? 'h-4 w-24' : 'h-5 w-32'}`} />
          <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-full ${isCompact ? 'h-3 w-16' : 'h-4 w-20'}`} />
          {profile.preferences.showFolder && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-full h-3.5 w-12 mt-1.5" />
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 ml-4 flex-shrink-0">
        <div className="flex items-center gap-2 h-[32px]">
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
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={modalTransition}
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
              <motion.button
                whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                transition={springConfig}
                onClick={() => {
                  setLogs([]);
                  addLog('User action: Clear logs', 'action');
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold"
              >
                <Trash2 size={18} /> Clear
              </motion.button>
              <motion.button 
                whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                transition={springConfig}
                onClick={exportLogs}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20"
              >
                <Download size={18} /> Export
              </motion.button>
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
      if (!profile.preferences.featureFlags.bulkActions) return;
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
        whileHover={isMultiSelectMode || shouldReduceMotion ? {} : CARD_HOVER}
        whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
        transition={softSpring}
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
        className={`ios-surface transition-all flex items-center justify-between group cursor-pointer relative overflow-hidden active:bg-white/80 dark:active:bg-black/60 fixed-card ${
          isCompact ? 'p-4' : 'p-6'
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
            <div className={`${isCompact ? 'w-14 h-14' : 'w-20 h-20'} rounded-2xl bg-gray-50 dark:bg-gray-800 flex-shrink-0 overflow-hidden flex items-center justify-center shadow-inner border border-gray-100/50 dark:border-gray-800/50 image-reserve`}>
              {coin.image || coin.imageId ? (
                <CoinImage 
                  coin={coin}
                  className="w-full h-full object-cover" 
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
              {(profile.preferences.showCoinName || (!profile.preferences.showCoinName && !profile.preferences.showYear && !profile.preferences.showType && !profile.preferences.showRarity && !profile.preferences.showPrice)) && (
                <h4 className={`font-bold text-gray-900 dark:text-gray-100 leading-tight text-locked-1 ${isCompact ? 'text-sm' : 'text-base'}`}>
                  {coin.name}
                </h4>
              )}
              {!profile.preferences.textMode && profile.preferences.showRarity && coin.rarity !== 'Common' && (
                <div className={`p-1 rounded-full flex-shrink-0 ${coin.rarity === 'Very Rare' ? 'bg-amber-100/50 dark:bg-amber-900/30' : 'bg-blue-100/50 dark:bg-blue-900/30'}`}>
                  <Star size={10} className={`fill-current ${coin.rarity === 'Very Rare' ? 'text-amber-600' : 'text-blue-600'}`} />
                </div>
              )}
            </div>
            {(profile.preferences.showYear || profile.preferences.showRarity || profile.preferences.showType) && (
              <div className="flex items-center gap-2.5 h-[16px]">
                {profile.preferences.showYear && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">{coin.year}</span>}
                {profile.preferences.showYear && (profile.preferences.showRarity || profile.preferences.showType) && <div className="w-1 h-1 bg-gray-200 dark:bg-gray-800 rounded-full flex-shrink-0" />}
                {profile.preferences.showType && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">{coin.type}</span>}
                {profile.preferences.showType && profile.preferences.showRarity && <div className="w-1 h-1 bg-gray-200 dark:bg-gray-800 rounded-full flex-shrink-0" />}
                {profile.preferences.showRarity && (
                  <span className={`text-[10px] font-bold uppercase tracking-[0.15em] truncate ${
                    coin.rarity === 'Very Rare' ? 'text-amber-600' :
                    coin.rarity === 'Rare' ? 'text-blue-600' : 'text-gray-400'
                  }`}>{coin.rarity}</span>
                )}
              </div>
            )}
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

    const handleBulkPriceChange = async (price: number) => {
      setIsApplyingBulkAction(true);
      setActiveBulkMenu(null);

      // Artificial delay for feedback
      await new Promise(resolve => setTimeout(resolve, 600));

      setCoins(prev => prev.map(coin => 
        selectedCoinIds.has(coin.id) ? { ...coin, amountPaid: price } : coin
      ));
      
      setIsMultiSelectMode(false);
      setSelectedCoinIds(new Set());
      setIsApplyingBulkAction(false);
      setFeedback({ message: `Updated price for ${selectedCoinIds.size} coins to £${price.toFixed(2)}`, type: 'success' });
      addLog(`Bulk update: ${selectedCoinIds.size} coins price to £${price}`, 'action');
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

                <button 
                  onClick={() => {
                    setInputModal({
                      title: 'Set Bulk Price',
                      placeholder: 'Enter price (e.g. 1.50)',
                      onConfirm: (val) => {
                        const price = parseFloat(val);
                        if (!isNaN(price)) {
                          setConfirmModal({
                            title: 'Confirm Bulk Price',
                            message: `Are you sure you want to set the price of ${selectedCoinIds.size} coins to £${price.toFixed(2)}?`,
                            onConfirm: () => handleBulkPriceChange(price)
                          });
                        } else {
                          setFeedback({ message: 'Invalid price entered', type: 'info' });
                        }
                      }
                    });
                  }}
                  className="p-3 rounded-2xl flex items-center gap-2 transition-all bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                >
                  <Tag size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">Price</span>
                </button>
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
      profile.preferences.featureFlags.imageLibrary && { id: 'library', label: 'Library', icon: ImageIcon },
      { id: 'stats', label: 'Stats', icon: PieChart },
      { id: 'profile', label: 'Profile', icon: User },
    ].filter(Boolean) as any[];

    return (
      <div className="max-w-md mx-auto mb-8 px-4">
        <div className="flex ios-surface p-2 rounded-[2.25rem] relative overflow-hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                transition={springConfig}
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
              </motion.button>
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
      profile.preferences.featureFlags.imageLibrary && { id: 'library', label: 'Library', icon: ImageIcon },
      { id: 'stats', label: 'Stats', icon: PieChart },
      { id: 'profile', label: 'Profile', icon: User },
    ].filter(Boolean) as any[];

    return (
      <div className="fixed bottom-[calc(var(--safe-bottom)+1rem)] left-0 right-0 z-40 px-4 pointer-events-none">
        <nav className="max-w-md mx-auto ios-overlay px-6 py-4 flex items-center justify-around pointer-events-auto relative overflow-hidden">
          {/* Subtle background glow for active item */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent pointer-events-none" />
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                transition={springConfig}
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
              <motion.button 
                whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                transition={springConfig}
                onClick={exportData}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-100 dark:shadow-none"
              >
                <Download size={20} /> Export Data
              </motion.button>
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

          <motion.button 
            whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
            transition={springConfig}
            onClick={exitSafeMode}
            className="w-full py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-[2rem] font-black text-lg shadow-xl"
          >
            Exit Safe Mode & Restart
          </motion.button>
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
        <div className="flex items-center gap-4 mb-8">
          <motion.button 
            whileHover={{ scale: 1.1, x: -4 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveGameMode(null)}
            className="w-11 h-11 ios-button rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft size={24} />
          </motion.button>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-gradient-blue leading-tight">Era Conquest</h2>
            <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-1">Conquer the timeline</p>
          </div>
        </div>

        <div className="space-y-6">
          {ERAS.map((era) => {
            const { percent, completedCount, totalCount } = getEraProgress(era);
            return (
              <motion.div
                key={era.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="ios-surface p-6 relative overflow-hidden"
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
        <div className="flex items-center gap-4 mb-8">
          <motion.button 
            whileHover={{ scale: 1.1, x: -4 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveGameMode(null)}
            className="w-11 h-11 ios-button rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft size={24} />
          </motion.button>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-gradient-blue leading-tight">Timeline Puzzle</h2>
            <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-1">Reconstruct History</p>
          </div>
        </div>

        <div className="ios-surface p-8 relative overflow-hidden text-center">
          <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-8 shadow-inner">
            <Puzzle size={48} />
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Broken Timelines</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
            The historical record has been fragmented. Drag and drop events into their correct chronological order to restore the timeline and earn massive XP.
          </p>
          
          <div className="space-y-4 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-300 font-bold text-xs uppercase tracking-widest">
                Slot {i}
              </div>
            ))}
          </div>

          <motion.button 
            whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
            transition={springConfig}
            onClick={() => setFeedback({ message: 'Puzzle Mode coming in next update!', type: 'info' })}
            className="w-full py-4 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-blue-500/30 h-14"
          >
            Start Solving
          </motion.button>
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
        <div className="flex items-center gap-4 mb-8">
          <motion.button 
            whileHover={{ scale: 1.1, x: -4 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setActiveNarrativeStoryId(null);
              setSelectedChapterId(null);
            }}
            className="w-11 h-11 ios-button rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
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
                  className="w-full p-6 text-left flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg ${
                      isUnlocked ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-black text-base text-gray-900 dark:text-white leading-tight">{chapter.title}</h4>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
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
                      className="px-6 pb-6"
                    >
                      <div className="h-[1px] w-full bg-gray-100 dark:bg-gray-800 mb-6" />
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6 italic">
                        {chapter.description}
                      </p>
                      
                      <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/20">
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
          className={`flex-shrink-0 w-64 p-6 rounded-[2.75rem] text-left transition-all relative overflow-hidden fixed-card-lg ${
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
                <h4 className="font-black text-lg leading-tight text-locked-1 tracking-tight">{title}</h4>
              </div>
              {locked && <Lock size={16} className="text-gray-400/60" />}
            </div>
            <p className={`text-[11px] font-bold leading-relaxed text-locked-2 mb-6 ${locked ? 'text-gray-400/60' : isActive ? 'text-blue-100/80' : 'text-gray-400 dark:text-gray-500'}`}>
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
        className="max-w-md mx-auto px-4 pb-24 space-y-8"
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
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <PlayCircle size={12} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-[11px] font-black text-gray-400/80 dark:text-gray-500 uppercase tracking-[0.2em]">Continue Exploring</h3>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1 snap-x">
              <div className="snap-start">
                {renderStoryCard(lastItem as any, lastItemType as any)}
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <BookOpen size={12} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-[11px] font-black text-gray-400/80 dark:text-gray-500 uppercase tracking-[0.2em]">Narrative Stories</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 px-1 snap-x">
            {NARRATIVE_STORIES.map(story => (
              <div key={story.id} className="snap-start">
                {renderStoryCard(story, 'narrative')}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <History size={12} className="text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-[11px] font-black text-gray-400/80 dark:text-gray-500 uppercase tracking-[0.2em]">Timelines</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 px-1 snap-x">
            {allAvailableTimelines.map(t => (
              <div key={t.id} className="snap-start">
                {renderStoryCard(t, 'timeline')}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <Trophy size={12} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-[11px] font-black text-gray-400/80 dark:text-gray-500 uppercase tracking-[0.2em]">Game Modes</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 px-1 snap-x">
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
      className="w-full p-4 flex items-center justify-between hover:bg-secondary-system-background transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-secondary-system-background flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
          <Icon size={20} />
        </div>
        <div className="flex flex-col items-start">
          <span className="font-bold text-sm text-system-label">{title}</span>
          <span className="text-[10px] text-system-secondary-label font-medium">{description}</span>
        </div>
      </div>
      <ChevronRight size={16} className="text-system-quaternary-label group-hover:translate-x-1 transition-transform" />
    </button>
  );

  return (
    <ErrorBoundary onExport={exportData}>
      <AmbientBackground enabled={profile.preferences.ambientMotionEnabled} />
      <div className={`locked-viewport ios-base text-system-label font-sans transition-colors relative theme-${profile.preferences.theme}`}>
        {/* Global Texture Overlay - Extremely subtle as per request */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.01] dark:opacity-[0.02] z-50 bg-[url('https://www.transparenttextures.com/patterns/p6.png')]" />
        
        <input 
          type="file" 
          ref={importInputRef} 
          onChange={importData} 
          accept=".json" 
          className="hidden" 
        />

        <input 
          type="file" 
          ref={fontInputRef} 
          onChange={handleFontUpload} 
          accept=".ttf,.otf,.woff,.woff2" 
          className="hidden" 
        />

        <div className="scroll-container" ref={scrollRef}>
          <div className="safe-top-padding">
            {profile.preferences.showCollectorCard && renderHeader()}
            {renderTabs()}
          </div>
          <main className="max-w-md mx-auto px-4 pt-4 safe-bottom-padding">
            {profile.preferences.showTopSummary && renderSummaryBar()}
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
                <div className={`relative ${isCompact ? 'h-[48px]' : 'h-[56px]'}`}>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-system-tertiary-label" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search collection..."
                    className={`w-full h-full pl-11 pr-4 ios-surface border-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-system-tertiary-label font-medium bg-system-background text-system-label`}
                  />
                  {searchQuery && (
                    <motion.button 
                      whileTap={{ scale: 0.8 }}
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-system-tertiary-label"
                    >
                      <X size={16} />
                    </motion.button>
                  )}
                </div>

                {/* Folder Selector */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar h-[44px]">
                  <motion.button
                    whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                    transition={springConfig}
                    onClick={() => setSelectedFolderId('all')}
                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all h-[36px] flex items-center justify-center ${
                      selectedFolderId === 'all' ? 'bg-blue-600 text-white' : 'bg-secondary-system-background text-system-secondary-label border border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    All Coins
                  </motion.button>
                  {folders.map(folder => (
                    <div key={folder.id} className="relative flex-shrink-0 h-[36px]">
                      <motion.button
                        whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                        transition={springConfig}
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
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 h-full ${
                          selectedFolderId === folder.id ? 'bg-blue-600 text-white' : 'bg-secondary-system-background text-system-secondary-label border border-gray-100 dark:border-gray-800'
                        }`}
                      >
                        {folder.isLocked && (
                          unlockedFolders.includes(folder.id) ? <Unlock size={12} /> : <Lock size={12} />
                        )}
                        {folder.name}
                      </motion.button>
                    </div>
                  ))}
                </div>

                {/* Currency Filter */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar h-[40px]">
                  <motion.button
                    whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                    transition={springConfig}
                    onClick={() => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, currencyFilter: 'both' } }))}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all h-[32px] flex items-center justify-center ${
                      profile.preferences.currencyFilter === 'both' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}
                  >
                    All Currencies
                  </motion.button>
                  <motion.button
                    whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                    transition={springConfig}
                    onClick={() => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, currencyFilter: 'modern' } }))}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all h-[32px] flex items-center justify-center ${
                      profile.preferences.currencyFilter === 'modern' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}
                  >
                    Modern Only
                  </motion.button>
                  <motion.button
                    whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                    transition={springConfig}
                    onClick={() => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, currencyFilter: 'old' } }))}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all h-[32px] flex items-center justify-center ${
                      profile.preferences.currencyFilter === 'old' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}
                  >
                    Old Only
                  </motion.button>
                </div>

                {/* Layout Picker */}
                {renderLayoutSwitcher()}

                {/* Sorting & Grouping Controls */}
                <div className="flex flex-col gap-3 bg-white dark:bg-gray-900 p-4 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between h-[32px]">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">View Options</span>
                    <motion.button 
                      whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                      transition={springConfig}
                      onClick={() => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, groupViewEnabled: !prev.preferences.groupViewEnabled } }))}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all w-[110px] h-[32px] justify-center ${
                        profile.preferences.groupViewEnabled 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20' 
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'
                      }`}
                    >
                      <Layers size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {profile.preferences.groupViewEnabled ? 'Grouping On' : 'Grouping Off'}
                      </span>
                    </motion.button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 bg-secondary-system-background px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                      <Layout size={14} className="text-system-tertiary-label" />
                      <div className="flex flex-col flex-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-system-tertiary-label">Sort By</span>
                        <select 
                          value={profile.preferences.sortBy}
                          onChange={(e) => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, sortBy: e.target.value as SortOption } }))}
                          className="text-[11px] font-black uppercase tracking-tight bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-system-label w-full"
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

                    <div className="flex items-center gap-2 bg-secondary-system-background px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                      <Grid size={14} className="text-system-tertiary-label" />
                      <div className="flex flex-col flex-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-system-tertiary-label">Group By</span>
                        <select 
                          value={profile.preferences.groupBy}
                          onChange={(e) => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, groupBy: e.target.value as GroupOption } }))}
                          className="text-[11px] font-black uppercase tracking-tight bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-system-label w-full"
                          disabled={!profile.preferences.groupViewEnabled}
                        >
                          <option value="none">No Grouping</option>
                          <option value="year">Year</option>
                          <option value="denomination">Denom</option>
                          <option value="country">Country</option>
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
                    className="bg-system-background p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg text-system-label">{isEditing ? 'Edit Coin' : (profile.preferences.quickAddMode ? 'Quick Add' : 'New Coin')}</h3>
                      <button type="button" onClick={resetForm} className="text-system-tertiary-label"><X size={20} /></button>
                    </div>

                    {/* Image Upload - Hidden in Quick Add unless editing */}
                    {(!profile.preferences.quickAddMode || isEditing) && (
                      <>
                        <div 
                          onClick={() => !isProcessingImage && fileInputRef.current?.click()}
                          className="w-full aspect-video bg-secondary-system-background rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
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
                              <ImageIcon className="text-system-quaternary-label mb-2" size={32} />
                              <span className="text-xs font-bold text-system-tertiary-label">Add Coin Image</span>
                            </>
                          )}
                          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                        </div>

                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => setShowLibraryPicker(true)}
                            className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700"
                          >
                            <FolderIcon size={16} /> Library
                          </button>
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 py-3 bg-blue-600/10 text-blue-600 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <ImageIcon size={16} /> Upload
                          </button>
                        </div>
                      </>
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
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Country</label>
                        <select
                          value={newCountry}
                          onChange={(e) => {
                            const country = e.target.value;
                            setNewCountry(country);
                            // Reset type if not available in new country
                            const modernDenoms = MODERN_CURRENCIES_BY_COUNTRY[country] || EURO_MODERN_CURRENCIES;
                            setNewType(newCurrencyType === 'Modern' ? modernDenoms[0] : (PRE_EURO_CURRENCIES[country]?.[0] || DEFAULT_DENOMINATIONS[0]));
                          }}
                          className="w-full h-[48px] px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                        >
                          {EUROPEAN_COUNTRIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Currency</label>
                        <select
                          value={newCurrencyType}
                          onChange={(e) => {
                            const ct = e.target.value as 'Modern' | 'Old';
                            setNewCurrencyType(ct);
                            const modernDenoms = MODERN_CURRENCIES_BY_COUNTRY[newCountry] || EURO_MODERN_CURRENCIES;
                            setNewType(ct === 'Modern' ? modernDenoms[0] : (PRE_EURO_CURRENCIES[newCountry]?.[0] || DEFAULT_DENOMINATIONS[0]));
                          }}
                          className="w-full h-[48px] px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                        >
                          <option value="Modern">Modern (Euro)</option>
                          <option value="Old">Old (Pre-Euro)</option>
                        </select>
                      </div>
                    </div>

                    {newCountry === 'United Kingdom' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-1"
                      >
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Region / Territory</label>
                        <select
                          value={newRegion}
                          onChange={(e) => setNewRegion(e.target.value)}
                          className="w-full h-[48px] px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                        >
                          {UK_REGIONS.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </motion.div>
                    )}

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
                          {availableDenominations.map(denom => (
                            <option key={denom} value={denom}>{denom}</option>
                          ))}
                          {profile.preferences.customDenominations.map(denom => (
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
                      {searchQuery ? 'No Match Found' : 
                       (profile.preferences.currencyFilter === 'old' && profile.preferences.showOldCoins) ? 'No Old Coins Available' :
                       'Your Collection is Empty'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 font-medium max-w-[200px] mx-auto leading-relaxed">
                      {searchQuery ? `We couldn't find anything for "${searchQuery}"` : 
                       (profile.preferences.currencyFilter === 'old' && profile.preferences.showOldCoins) ? 'You haven\'t added any pre-euro coins to your collection yet.' :
                       'Start your journey by adding your first coin!'}
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
                                <tr className="h-[32px]">
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
                        {Object.entries(groupedCoins as Record<string, Coin[]>).map(([groupName, groupCoins]) => {
                          const isExpanded = !collapsedGroups.has(groupName) || profile.preferences.groupBy === 'none';
                          return (
                            <div key={groupName} className="space-y-3">
                              <button 
                                onClick={() => setCollapsedGroups(prev => {
                                  const next = new Set(prev);
                                  if (next.has(groupName)) next.delete(groupName);
                                  else next.add(groupName);
                                  return next;
                                })}
                                className="flex items-center gap-3 px-2 h-[24px] w-full group"
                              >
                                <ChevronRight size={14} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] truncate max-w-[200px] group-hover:text-blue-500 transition-colors">
                                  {groupName.includes(' / ') ? (
                                    <>
                                      <span className="text-gray-900 dark:text-white">{groupName.split(' / ')[0]}</span>
                                      <span className="mx-2 opacity-30">/</span>
                                      <span>{groupName.split(' / ')[1]}</span>
                                    </>
                                  ) : groupName}
                                </h3>
                                <div className="h-[1px] flex-1 bg-gray-100 dark:bg-gray-800" />
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest w-8 text-right">{groupCoins.length}</span>
                              </button>
                              <AnimatePresence mode="wait">
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    {renderLayout(groupCoins)}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      renderLayout(sortedCoins)
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
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={cleanupLibrary}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <RefreshCw size={12} /> Cleanup
                    </button>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{fullLibrary.length} Images</span>
                  </div>
                </div>

                {fullLibrary.length === 0 ? (
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
                    {fullLibrary.map(img => (
                      <motion.div
                        key={img.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                        onClick={() => {
                          const coin = coins.find(c => c.imageId === img.id);
                          if (coin) openCoin(coin);
                        }}
                        className="group relative aspect-square bg-system-background rounded-2xl border border-gray-100 dark:border-gray-800 p-2 shadow-sm overflow-hidden cursor-pointer"
                      >
                        <img 
                          src={img.url} 
                          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        
                        {profile.preferences.enableDeleteMode && (
                          <motion.button 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmModal({
                                title: 'Delete Image',
                                message: 'Are you sure you want to delete this image from your library?',
                                onConfirm: () => deleteFromLibrary(img.id)
                              });
                            }}
                            className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center z-10 hover:bg-red-600 transition-colors"
                          >
                            <Trash2 size={12} />
                          </motion.button>
                        )}
                        
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[7px] font-black text-white uppercase tracking-widest text-center truncate">
                            {coins.find(c => c.imageId === img.id)?.name || 'Unlinked'}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="space-y-8 pb-32"
              >
                {/* Top: Progress Card */}
                <motion.div 
                  layoutId="stats-hero"
                  className="ios-surface p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <p className="text-blue-100/80 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Current Rank</p>
                        <h2 className="text-4xl font-black tracking-tighter italic">{currentLevel.name}</h2>
                      </div>
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                        <Trophy size={32} className="text-white drop-shadow-lg" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <p className="text-blue-100/80 text-[10px] font-black uppercase tracking-[0.2em]">XP Progress</p>
                        <p className="text-xs font-black tracking-tight">{profile.points} / {nextLevel?.minPoints || 'MAX'} XP</p>
                      </div>
                      <div className="h-3 bg-white/10 rounded-full overflow-hidden shadow-inner border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progressToNextLevel}%` }}
                          transition={{ duration: 1.5, ease: "circOut" }}
                          className="h-full bg-gradient-to-r from-blue-300 to-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                        />
                      </div>
                      {nextLevel && (
                        <div className="flex items-center gap-2 pt-1">
                          <Zap size={12} className="text-blue-200" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-100/60">
                            Next Level: {nextLevel.name}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Section 1: Highlights (Horizontal Scroll) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-black text-gray-800 dark:text-gray-200">Highlights</h3>
                    <Star size={18} className="text-amber-500" />
                  </div>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar px-2 pb-4 -mx-2">
                    {/* Most Collected */}
                    <motion.div 
                      whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                      className="flex-shrink-0 w-[200px] ios-surface p-5 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100/50 dark:border-blue-800/30"
                    >
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                        <Grid size={20} />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Most Collected</p>
                      <p className="text-lg font-black text-gray-800 dark:text-gray-200 truncate">{stats.insights.mostCollectedType}</p>
                      <p className="text-[10px] font-bold text-blue-600 mt-2">{stats.counts[stats.insights.mostCollectedType]} Coins</p>
                    </motion.div>

                    {/* Rarest Coin */}
                    {stats.insights.rarestCoin && (
                      <motion.div 
                        whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                        onClick={() => openCoin(stats.insights.rarestCoin!)}
                        className="flex-shrink-0 w-[200px] ios-surface p-5 bg-amber-50/50 dark:bg-amber-900/10 border-amber-100/50 dark:border-amber-800/30"
                      >
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 mb-4">
                          <Award size={20} />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rarest Find</p>
                        <p className="text-lg font-black text-gray-800 dark:text-gray-200 truncate">{stats.insights.rarestCoin.name}</p>
                        <p className="text-[10px] font-bold text-amber-600 mt-2">{stats.insights.rarestCoin.rarity}</p>
                      </motion.div>
                    )}

                    {/* Monthly Activity */}
                    <motion.div 
                      whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                      className="flex-shrink-0 w-[200px] ios-surface p-5 bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100/50 dark:border-emerald-800/30"
                    >
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
                        <Activity size={20} />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Recent Activity</p>
                      <p className="text-lg font-black text-gray-800 dark:text-gray-200 truncate">
                        {(Object.values(stats.monthlyTotals).slice(-1)[0] as { count: number })?.count || 0} Added
                      </p>
                      <p className="text-[10px] font-bold text-emerald-600 mt-2">This Month</p>
                    </motion.div>
                  </div>
                </div>

                {/* Section 2: Achievements (Badges Grid) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-black text-gray-800 dark:text-gray-200">Achievements</h3>
                    <Trophy size={18} className="text-blue-600" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {profile.badges.map(badge => (
                      <motion.div 
                        key={badge.id}
                        whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                        onClick={() => setFeedback({ message: badge.isUnlocked ? `${badge.name}: ${badge.description}` : `Locked: ${badge.description}`, type: 'info' })}
                        className={`ios-surface p-4 flex flex-col items-center justify-center text-center relative overflow-hidden ${!badge.isUnlocked ? 'opacity-50 grayscale' : ''}`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
                          badge.isUnlocked ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }`}>
                          {badge.id.includes('collector') ? <LayoutGrid size={24} /> :
                           badge.id.includes('rare') ? <Star size={24} /> :
                           badge.id.includes('streak') ? <Flame size={24} /> : <Award size={24} />}
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest leading-tight line-clamp-2">{badge.name}</p>
                        {!badge.isUnlocked && (
                          <div className="absolute inset-0 bg-white/20 dark:bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
                            <Lock size={14} className="text-gray-400" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Section 3: Charts */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-black text-gray-800 dark:text-gray-200">Analytics</h3>
                    <div className="flex gap-2">
                      <motion.button 
                        whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                        onClick={() => setExpandedChart(expandedChart === 'pie' ? null : 'pie')}
                        className={`p-2 rounded-xl transition-colors ${expandedChart === 'pie' ? 'bg-blue-600 text-white' : 'ios-button text-gray-400'}`}
                      >
                        <PieChart size={18} />
                      </motion.button>
                      <motion.button 
                        whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                        onClick={() => setExpandedChart(expandedChart === 'timeline' ? null : 'timeline')}
                        className={`p-2 rounded-xl transition-colors ${expandedChart === 'timeline' ? 'bg-blue-600 text-white' : 'ios-button text-gray-400'}`}
                      >
                        <BarChart2 size={18} />
                      </motion.button>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {/* Denomination Split (Pie) */}
                    <motion.div 
                      layout
                      className={`ios-surface p-6 overflow-hidden ${expandedChart === 'pie' ? 'fixed inset-4 z-[100] h-auto flex flex-col' : 'h-[300px]'}`}
                    >
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h4 className="font-black text-gray-800 dark:text-gray-200">Denomination Split</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Collection Diversity</p>
                        </div>
                        {expandedChart === 'pie' && (
                          <button onClick={() => setExpandedChart(null)} className="p-2 ios-button text-gray-400"><X size={20} /></button>
                        )}
                      </div>
                      <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={Object.entries(stats.counts).map(([name, value]) => ({ name, value }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={expandedChart === 'pie' ? 80 : 60}
                              outerRadius={expandedChart === 'pie' ? 120 : 90}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {Object.entries(stats.counts).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e'][index % 8]} />
                              ))}
                            </Pie>
                            <ReTooltip 
                              contentStyle={{ 
                                borderRadius: '16px', 
                                border: 'none', 
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                                backgroundColor: profile.preferences.appearanceMode === 'dark' ? '#111827' : '#ffffff'
                              }}
                            />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>

                    {/* Collection Timeline (Area) */}
                    <motion.div 
                      layout
                      className={`ios-surface p-6 overflow-hidden ${expandedChart === 'timeline' ? 'fixed inset-4 z-[100] h-auto flex flex-col' : 'h-[300px]'}`}
                    >
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h4 className="font-black text-gray-800 dark:text-gray-200">Collection Growth</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Coins Added Over Time</p>
                        </div>
                        {expandedChart === 'timeline' && (
                          <button onClick={() => setExpandedChart(null)} className="p-2 ios-button text-gray-400"><X size={20} /></button>
                        )}
                      </div>
                      <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={Object.entries(stats.monthlyTotals).sort((a, b) => a[0].localeCompare(b[0])).map(([month, data]) => ({ month, count: (data as { count: number }).count }))}>
                            <defs>
                              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={profile.preferences.appearanceMode === 'dark' ? '#374151' : '#f3f4f6'} />
                            <XAxis 
                              dataKey="month" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                              tickFormatter={(val) => {
                                const [y, m] = val.split('-');
                                return new Date(parseInt(y), parseInt(m)-1).toLocaleString('default', { month: 'short' });
                              }}
                            />
                            <YAxis hide />
                            <ReTooltip 
                              contentStyle={{ 
                                borderRadius: '16px', 
                                border: 'none', 
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                                backgroundColor: profile.preferences.appearanceMode === 'dark' ? '#111827' : '#ffffff'
                              }}
                            />
                            <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Section 4: Insights */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-black text-gray-800 dark:text-gray-200">Smart Insights</h3>
                    <Lightbulb size={18} className="text-blue-600" />
                  </div>
                  <div className="relative h-[100px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeInsightIndex}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.05, y: -10 }}
                        className="absolute inset-0 ios-surface p-6 flex items-center gap-4 bg-blue-600 text-white border-none shadow-xl shadow-blue-500/20"
                      >
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                          {activeInsightIndex === 0 ? <TrendingUp size={24} /> :
                           activeInsightIndex === 1 ? <Calendar size={24} /> :
                           activeInsightIndex === 2 ? <Tag size={24} /> : <Zap size={24} />}
                        </div>
                        <div>
                          <p className="text-blue-100/80 text-[10px] font-black uppercase tracking-widest mb-1">
                            {activeInsightIndex === 0 ? 'Collection Trend' :
                             activeInsightIndex === 1 ? 'Peak Activity' :
                             activeInsightIndex === 2 ? 'Value Insight' : 'Daily Tip'}
                          </p>
                          <p className="font-bold text-sm leading-tight">
                            {activeInsightIndex === 0 ? `You collect mostly ${stats.insights.mostCollectedType} coins.` :
                             activeInsightIndex === 1 ? `Most active in ${stats.insights.mostCollectedYear || 'recent years'}.` :
                             activeInsightIndex === 2 ? `Average paid per coin is £${stats.insights.averagePaid.toFixed(2)}.` :
                             suggestion}
                          </p>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Section 5: Activity */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-black text-gray-800 dark:text-gray-200">Activity</h3>
                    <Activity size={18} className="text-blue-600" />
                  </div>
                  
                  {/* Streak Card */}
                  <div className="ios-surface p-6 flex items-center justify-between bg-gradient-to-r from-orange-500 to-red-600 text-white border-none shadow-xl shadow-orange-500/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Flame size={28} className="animate-bounce" />
                      </div>
                      <div>
                        <p className="text-orange-100/80 text-[10px] font-black uppercase tracking-widest mb-1">Current Streak</p>
                        <h4 className="text-2xl font-black tracking-tight">{profile.streak.current} Days</h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-100/80 text-[10px] font-black uppercase tracking-widest mb-1">Best</p>
                      <p className="text-lg font-black">{profile.streak.best}d</p>
                    </div>
                  </div>

                  {/* Recent Additions */}
                  <div className="ios-surface overflow-hidden divide-y divide-gray-50 dark:divide-gray-800/50">
                    <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Additions</p>
                    </div>
                    {coins.slice(-3).reverse().map(coin => (
                      <motion.div 
                        key={coin.id}
                        whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                        onClick={() => openCoin(coin)}
                        className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-[10px] font-black text-gray-400">
                            {coin.type}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{coin.name}</p>
                            <p className="text-[10px] font-bold text-gray-400">{new Date(coin.dateAdded).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                      </motion.div>
                    ))}
                  </div>
                </div>
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
                  <div className="ios-surface p-4">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Value</p>
                    <p className="text-2xl font-black text-green-600 dark:text-green-400 tracking-tight">£{stats.totalSpend.toFixed(2)}</p>
                  </div>
                  <div className="ios-surface p-4">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Points</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{profile.points}</p>
                  </div>
                </div>

                {/* Collector Identity & Timeline Section */}
                {(profile.preferences.showCollectorCard || profile.preferences.featureFlags.timelineModes) && (
                  <div className="grid grid-cols-2 gap-4">
                    {profile.preferences.showCollectorCard && (
                      <motion.button 
                        whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -2 }}
                        whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                        transition={springConfig}
                        onClick={() => setShowCollectorCard(true)}
                        className={`p-6 bg-blue-600 text-white rounded-[2rem] font-black text-sm flex flex-col items-center justify-center gap-3 shadow-xl shadow-blue-200/50 dark:shadow-none ${
                          !profile.preferences.featureFlags.timelineModes ? 'col-span-2' : ''
                        }`}
                      >
                        <User size={28} />
                        <span className="tracking-tight">Identity Card</span>
                      </motion.button>
                    )}
                    {profile.preferences.featureFlags.timelineModes && (
                      <motion.button 
                        whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -2 }}
                        whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                        transition={springConfig}
                        onClick={() => {
                          setActiveTab('explore');
                          setExploreMode('timeline');
                        }}
                        className={`p-6 rounded-[2rem] font-black text-sm flex flex-col items-center justify-center gap-3 shadow-xl ${
                          profile.preferences.showCollectorCard ? 'ios-surface text-gray-800 dark:text-gray-100' : 'col-span-2 ios-surface text-gray-800 dark:text-gray-100'
                        }`}
                      >
                        <History size={28} className="text-blue-600" />
                        <span className="tracking-tight">Timeline Hub</span>
                      </motion.button>
                    )}
                  </div>
                )}

                {/* Hidden Settings (Unlocked via Milestones) */}
                {/* Settings Categories */}
                <div className="space-y-6">
                  {/* Appearance Section */}
                  <SettingsSection id="appearance" title="Appearance" icon={Palette}>
                    <SettingSelect 
                      label="Theme Mode" 
                      icon={Moon} 
                      value={profile.preferences.appearanceMode}
                      onChange={(val) => setProfile({ ...profile, preferences: { ...profile.preferences, appearanceMode: val as any } })}
                      options={[
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'system', label: 'Follow System' }
                      ]}
                    />
                    
                    {(profile.preferences.appearanceMode === 'dark' || (profile.preferences.appearanceMode === 'system' && systemIsDark)) && (
                      <SettingSelect 
                        label="Dark Style" 
                        icon={Zap} 
                        value={profile.preferences.darkModeStyle || 'blue'}
                        onChange={(val) => setProfile({ ...profile, preferences: { ...profile.preferences, darkModeStyle: val as any } })}
                        options={[
                          { value: 'blue', label: 'Soft Blue' },
                          { value: 'purple', label: 'Soft Purple' }
                        ]}
                      />
                    )}

                    <div className="border-t border-gray-50 dark:border-gray-800/50 my-1" />

                    <SettingSelect 
                      label="Theme Category" 
                      icon={Layers} 
                      value={profile.preferences.themeCategory}
                      onChange={(val) => {
                        const category = THEME_CATEGORIES.find(c => c.id === val);
                        setProfile({ 
                          ...profile, 
                          preferences: { 
                            ...profile.preferences, 
                            themeCategory: val,
                            theme: category?.themes[0].id || 'win98'
                          } 
                        });
                      }}
                      options={THEME_CATEGORIES.map(c => ({ value: c.id, label: c.name }))}
                    />
                    <SettingSelect 
                      label="Active Theme" 
                      icon={Palette} 
                      value={profile.preferences.theme}
                      onChange={(val) => setProfile({ ...profile, preferences: { ...profile.preferences, theme: val } })}
                      options={THEME_CATEGORIES.find(c => c.id === profile.preferences.themeCategory)?.themes.map(t => ({ value: t.id, label: t.name })) || []}
                    />
                  </SettingsSection>

                  {/* Display & Layout Section */}
                  <SettingsSection id="display" title="Display & Layout" icon={Layout}>
                    <SettingSelect 
                      label="Default View" 
                      icon={Layout} 
                      value={profile.preferences.layoutType}
                      onChange={(val) => setProfile({ ...profile, preferences: { ...profile.preferences, layoutType: val as any } })}
                      options={[
                        { value: 'grid', label: 'Grid' },
                        { value: 'card', label: 'Card' },
                        { value: 'table', label: 'Table' },
                        { value: 'list', label: 'List' },
                        { value: 'carousel', label: 'Carousel' },
                        { value: 'masonry', label: 'Masonry' },
                        { value: 'board', label: 'Board' },
                        { value: 'timeline', label: 'Timeline' },
                        { value: 'gallery', label: 'Gallery' },
                        { value: 'spotlight', label: 'Spotlight' },
                        { value: 'compact', label: 'Compact' },
                        { value: 'split', label: 'Split' },
                        { value: 'hexagon', label: 'Hexagon' }
                      ]}
                    />
                    <SettingToggle 
                      label="Horizontal Layout Picker" 
                      icon={Layout} 
                      value={profile.preferences.showHorizontalLayoutPicker}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showHorizontalLayoutPicker: !profile.preferences.showHorizontalLayoutPicker } })}
                      description="Apple-style preview cards"
                    />
                    <SettingToggle 
                      label="Show Layout Switcher" 
                      icon={Layout} 
                      value={profile.preferences.showLayoutSwitcher}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showLayoutSwitcher: !profile.preferences.showLayoutSwitcher } })}
                    />
                    <div className="px-5 py-2">
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">Enabled Layouts</p>
                      <div className="grid grid-cols-2 gap-2">
                        {['grid', 'card', 'table', 'list', 'compact', 'carousel', 'masonry', 'board', 'timeline', 'gallery', 'spotlight', 'split', 'hexagon'].map((type) => (
                          <button
                            key={type}
                            onClick={() => {
                              const current = profile.preferences.enabledLayouts;
                              const next = current.includes(type as LayoutType)
                                ? current.filter(t => t !== type)
                                : [...current, type as LayoutType];
                              if (next.length === 0) return; // Must have at least one
                              setProfile({ ...profile, preferences: { ...profile.preferences, enabledLayouts: next } });
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                              profile.preferences.enabledLayouts.includes(type as LayoutType)
                                ? 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800'
                                : 'bg-gray-50 border-gray-100 text-gray-400 dark:bg-gray-800/50 dark:border-gray-800'
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${profile.preferences.enabledLayouts.includes(type as LayoutType) ? 'bg-blue-500' : 'bg-gray-300'}`} />
                            <span className="text-[9px] font-black uppercase tracking-widest">{type}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <SettingToggle 
                      label="Compact Mode" 
                      icon={Smartphone} 
                      value={profile.preferences.compactUI}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, compactUI: !profile.preferences.compactUI } })}
                      description="Denser layout for more content"
                    />
                    <SettingToggle 
                      label="Text Only UI" 
                      icon={ListIcon} 
                      value={profile.preferences.textMode}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, textMode: !profile.preferences.textMode } })}
                      description="Minimal interface without images"
                    />

                    <div className="px-5 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 px-4">Text Layout Settings</p>
                      <div className="bg-gray-50/50 dark:bg-gray-800/20 rounded-3xl overflow-hidden border border-gray-100/50 dark:border-gray-800/50 scale-[0.98] origin-top">
                        <SettingToggle 
                          label="Coin Name" 
                          icon={ListIcon} 
                          value={profile.preferences.showCoinName}
                          onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showCoinName: !profile.preferences.showCoinName } })}
                          description="Display the coin's main title"
                        />
                        <SettingToggle 
                          label="Year" 
                          icon={Calendar} 
                          value={profile.preferences.showYear}
                          onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showYear: !profile.preferences.showYear } })}
                          description="Display the minting/issue year"
                        />
                        <SettingToggle 
                          label="Type" 
                          icon={Tag} 
                          value={profile.preferences.showType}
                          onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showType: !profile.preferences.showType } })}
                          description="Display denomination & system"
                        />
                        <SettingToggle 
                          label="Rarity" 
                          icon={Star} 
                          value={profile.preferences.showRarity}
                          onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showRarity: !profile.preferences.showRarity } })}
                          description="Display collection scarcity"
                        />
                        <SettingToggle 
                          label="Price" 
                          icon={Coins} 
                          value={profile.preferences.showPrice}
                          onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showPrice: !profile.preferences.showPrice } })}
                          description="Display purchase value"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-50 dark:border-gray-800/50 my-1" />

                    <SettingToggle 
                      label="Show Top Summary" 
                      icon={Layout} 
                      value={profile.preferences.showTopSummary}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showTopSummary: !profile.preferences.showTopSummary } })}
                    />
                    <SettingToggle 
                      label="Progress Card" 
                      icon={User} 
                      value={profile.preferences.showProgressCard}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showProgressCard: !profile.preferences.showProgressCard } })}
                    />
                    <SettingToggle 
                      label="Rank System" 
                      icon={Award} 
                      value={profile.preferences.showRankSystem}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showRankSystem: !profile.preferences.showRankSystem } })}
                    />
                    <SettingToggle 
                      label="Show Folder" 
                      icon={FolderIcon} 
                      value={profile.preferences.showFolder}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showFolder: !profile.preferences.showFolder } })}
                    />

                    <div className="border-t border-gray-50 dark:border-gray-800/50 my-1" />

                    <SettingSelect 
                      label="App Font" 
                      icon={BookOpen} 
                      value={profile.preferences.fontFamily}
                      onChange={(val) => setProfile({ ...profile, preferences: { ...profile.preferences, fontFamily: val } })}
                      options={[
                        ...FONTS.map(f => ({ value: f.id, label: f.name })),
                        { value: 'custom', label: 'Custom Upload' }
                      ]}
                    />

                    <div className="px-5 pb-4 space-y-2">
                      <motion.button 
                        whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                        transition={springConfig}
                        onClick={() => fontInputRef.current?.click()}
                        className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all flex items-center justify-center gap-2"
                      >
                        <Upload size={12} /> Upload Custom Font
                      </motion.button>
                      
                      {(profile.preferences.fontFamily !== 'default' || profile.preferences.customFont) && (
                        <motion.button 
                          whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                          transition={springConfig}
                          onClick={() => setProfile({ ...profile, preferences: { ...profile.preferences, fontFamily: 'default', customFont: undefined } })}
                          className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                        >
                          Reset to System Font
                        </motion.button>
                      )}
                    </div>
                  </SettingsSection>

                  {/* Experience & Motion Section */}
                  <SettingsSection id="experience" title="Experience" icon={Zap}>
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
                    <SettingToggle 
                      label="Purchase Mode" 
                      icon={TrendingUp} 
                      value={profile.preferences.purchaseMode}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, purchaseMode: !profile.preferences.purchaseMode } })}
                      description="Enable price tracking for additions"
                    />
                    <SettingToggle 
                      label="Ambient Motion" 
                      icon={Activity} 
                      value={profile.preferences.ambientMotionEnabled}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, ambientMotionEnabled: !profile.preferences.ambientMotionEnabled } })}
                      description="Subtle background movement"
                    />
                    <SettingToggle 
                      label="Performance Mode" 
                      icon={Gauge} 
                      value={profile.preferences.performanceMode}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, performanceMode: !profile.preferences.performanceMode } })}
                      description="Reduce animations for speed"
                    />
                    <SettingToggle 
                      label="Focus Mode" 
                      icon={Target} 
                      value={profile.preferences.focusMode}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, focusMode: !profile.preferences.focusMode } })}
                      description="Hide non-essential UI elements"
                    />
                    <SettingToggle 
                      label="Haptic Feedback" 
                      icon={Smartphone} 
                      value={profile.preferences.hapticsEnabled}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, hapticsEnabled: !profile.preferences.hapticsEnabled } })}
                      description="Vibrate on key interactions"
                    />
                  </SettingsSection>

                  {/* Collection Management Section */}
                  <SettingsSection id="collection" title="Collection" icon={Database}>
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-700 dark:text-gray-300 block">Folders</span>
                        <button 
                          onClick={() => {
                            setModalInputValue('');
                            setInputModal({
                              title: 'New Folder',
                              placeholder: 'Folder Name',
                              onConfirm: (name) => setFolders([...folders, { id: crypto.randomUUID(), name }])
                            });
                          }}
                          className="text-blue-600 dark:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {folders.map(folder => (
                          <div key={folder.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{folder.name}</span>
                            {!folder.isDefault && (
                              <button onClick={() => setFolders(folders.filter(f => f.id !== folder.id))} className="text-red-400 hover:text-red-600">
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-gray-50 dark:border-gray-800/50 my-1" />

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
                      <div className="flex flex-wrap gap-2">
                        {profile.preferences.customDenominations.map(denom => (
                          <div key={denom} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{denom}</span>
                            <button 
                              onClick={() => {
                                const newDenoms = profile.preferences.customDenominations.filter(d => d !== denom);
                                setProfile({ ...profile, preferences: { ...profile.preferences, customDenominations: newDenoms } });
                              }} 
                              className="text-red-400 hover:text-red-600"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SettingsSection>

                  {/* Navigation & Hubs Section */}
                  <SettingsSection id="navigation" title="Navigation" icon={Columns}>
                    <SettingToggle 
                      label="Bottom Menu" 
                      icon={Columns} 
                      value={profile.preferences.showBottomMenu}
                      onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, showBottomMenu: !profile.preferences.showBottomMenu } })}
                      description="Main navigation visibility"
                    />
                    <SettingToggle 
                      label="Timeline Hub" 
                      icon={History} 
                      value={profile.preferences.featureFlags.timelineModes}
                      onChange={() => setProfile({ 
                        ...profile, 
                        preferences: { 
                          ...profile.preferences, 
                          featureFlags: { ...profile.preferences.featureFlags, timelineModes: !profile.preferences.featureFlags.timelineModes } 
                        } 
                      })}
                      description="Enable timeline & mindmap views"
                    />
                  </SettingsSection>

                  {/* Data & System Section */}
                  <SettingsSection id="data" title="Data & System" icon={Database}>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                      <SettingToggle 
                        label="Enable Delete Mode" 
                        icon={Trash2} 
                        value={profile.preferences.enableDeleteMode}
                        onChange={() => setProfile({ ...profile, preferences: { ...profile.preferences, enableDeleteMode: !profile.preferences.enableDeleteMode } })}
                        description="Safe browsing vs. edit mode"
                        badge="Safety"
                      />
                      <SettingAction 
                        icon={RefreshCcw}
                        title="Refresh App"
                        description="Reload state from local storage"
                        onClick={refreshApp}
                      />
                      <SettingAction 
                        icon={Download}
                        title="Export Collection"
                        description="Save as JSON backup file"
                        onClick={exportData}
                      />
                      <SettingAction 
                        icon={Upload}
                        title="Import Collection"
                        description="Restore from JSON backup"
                        onClick={() => importInputRef.current?.click()}
                      />
                      <SettingAction 
                        icon={Trash2}
                        title="Reset All Data"
                        description="Permanently delete everything"
                        color="text-red-600"
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
                      />
                    </div>
                  </SettingsSection>

                  {/* Advanced Section */}
                  <SettingsSection id="advanced" title="Advanced" icon={Zap}>
                    <div className="p-4 space-y-4">
                      <div className="ios-surface p-4 bg-gray-50/50 dark:bg-gray-800/20">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-system-secondary-label mb-0.5">Service Worker</p>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${
                                swStatus === 'Active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                swStatus === 'Installing' ? 'bg-blue-500 animate-pulse' :
                                swStatus === 'Waiting' ? 'bg-amber-500' : 'bg-gray-400'
                              }`} />
                              <span className="text-xs font-black text-system-label capitalize">{swStatus}</span>
                            </div>
                          </div>
                          <button 
                            onClick={hardReload}
                            className="p-2.5 bg-system-background text-system-label rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm active:scale-95 transition-all"
                          >
                            <RefreshCw size={16} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                title: 'Reset SW',
                                message: 'Unregister all service workers? This can fix update issues.',
                                onConfirm: async () => {
                                  const success = await resetServiceWorker();
                                  setFeedback({ message: success ? 'Service workers cleared' : 'No service workers found', type: success ? 'success' : 'load' });
                                }
                              });
                            }}
                            className="py-2.5 bg-system-background rounded-xl text-[9px] font-black uppercase tracking-widest text-system-secondary-label border border-gray-100 dark:border-gray-800 shadow-sm"
                          >
                            Reset SW
                          </button>
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                title: 'Clear Cache',
                                message: 'Clear all application cache storage?',
                                onConfirm: async () => {
                                  const success = await clearAppCache();
                                  setFeedback({ message: success ? 'App cache cleared' : 'No cache found', type: success ? 'success' : 'load' });
                                }
                              });
                            }}
                            className="py-2.5 bg-system-background rounded-xl text-[9px] font-black uppercase tracking-widest text-system-secondary-label border border-gray-100 dark:border-gray-800 shadow-sm"
                          >
                            Clear Cache
                          </button>
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                title: 'Clear IndexedDB',
                                message: 'Clear all IndexedDB databases? This will delete all local images!',
                                onConfirm: async () => {
                                  const success = await clearAppIndexedDB();
                                  setFeedback({ message: success ? 'IndexedDB cleared' : 'No databases found', type: success ? 'success' : 'load' });
                                }
                              });
                            }}
                            className="py-2.5 bg-system-background rounded-xl text-[9px] font-black uppercase tracking-widest text-system-secondary-label border border-gray-100 dark:border-gray-800 shadow-sm"
                          >
                            Clear DB
                          </button>
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                title: 'Full Reset',
                                message: 'Perform a full system reset? All data (coins, settings, images) will be lost and the app will reload!',
                                onConfirm: async () => {
                                  localStorage.clear();
                                  await resetServiceWorker();
                                  await clearAppCache();
                                  await clearAppIndexedDB();
                                  window.location.reload();
                                }
                              });
                            }}
                            className="py-2.5 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                          >
                            Full Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  </SettingsSection>

                  {/* Version History */}
                  <SettingsSection id="version" title="App Version" icon={History}>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-gray-900 dark:text-white">v{APP_VERSION_HISTORY[0].version}</span>
                          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">Latest</span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{APP_VERSION_HISTORY[0].date}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium mb-4 italic">
                        "{APP_VERSION_HISTORY[0].notes}"
                      </p>
                      <motion.button 
                        whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                        transition={springConfig}
                        onClick={() => setShowAllVersions(!showAllVersions)}
                        className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
                      >
                        {showAllVersions ? 'Hide History' : 'View Full History'}
                      </motion.button>
                      
                      <AnimatePresence>
                        {showAllVersions && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-6 space-y-8"
                          >
                            {APP_VERSION_HISTORY.slice(1).map((item) => (
                              <div key={item.version} className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-800">
                                <div className="flex flex-col">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black text-gray-700 dark:text-gray-300">v{item.version}</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.date}</span>
                                  </div>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2">{item.notes}</p>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                        <motion.button 
                          whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                          transition={springConfig}
                          onClick={() => setShowLogsModal(true)}
                          className="w-full flex items-center justify-between p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 text-blue-600 font-bold"
                        >
                          <div className="flex items-center gap-3">
                            <Activity size={20} />
                            <span>View System Logs</span>
                          </div>
                          <ChevronRight size={18} />
                        </motion.button>
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
      </div>

      {renderBottomMenu()}

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
                transition={modalTransition}
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

                  {selectedCoin.image || selectedCoin.imageId ? (
                    <CoinImage 
                      coin={selectedCoin}
                      className="w-full h-full object-cover relative z-10" 
                      motionProps={{
                        initial: { scale: 1.2, opacity: 0 },
                        animate: { scale: 1, opacity: 1 }
                      }}
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
                      whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -2 }}
                      whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                      transition={springConfig}
                      onClick={() => startEdit(selectedCoin)}
                      className="flex-1 py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-[2rem] font-black text-lg shadow-2xl"
                    >
                      Edit Details
                    </motion.button>
                    <motion.button 
                      whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -2 }}
                      whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                      transition={springConfig}
                      onClick={() => {
                        setConfirmModal({
                          title: 'Delete Coin',
                          message: 'Are you sure you want to delete this coin permanently?',
                          onConfirm: () => deleteCoin(selectedCoin.id)
                        });
                      }}
                      className="w-20 py-5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-[2rem] font-black flex items-center justify-center border border-red-100 dark:border-red-900/30"
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
                initial={{ scale: 0.9, opacity: 0, rotate: -5, y: 20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, rotate: 5, y: 20 }}
                transition={modalTransition}
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
                    <motion.button 
                      whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                      transition={springConfig}
                      onClick={() => setShowSpinModal(false)}
                      className="w-full py-4 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-2xl font-black text-lg shadow-xl"
                    >
                      Awesome!
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.button 
                    whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                    transition={springConfig}
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
                    className={`w-full py-5 rounded-2xl font-black text-xl shadow-2xl flex items-center justify-center gap-3 ${
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
                  </motion.button>
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
                <span className="flex-1">{feedback.message}</span>
                {feedback.action && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      feedback.action?.onAction();
                    }}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    {feedback.action.label}
                  </button>
                )}
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-6"
              onClick={() => setConfirmModal(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={modalTransition}
                className="bg-system-background w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-xl font-black mb-2 text-system-label">{confirmModal.title}</h3>
                <p className="text-system-secondary-label font-bold text-sm mb-6 leading-relaxed">{confirmModal.message}</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-3 bg-secondary-system-background text-system-label rounded-xl font-black text-sm border border-gray-100 dark:border-gray-800"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(null);
                    }}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black text-sm shadow-lg shadow-red-500/20"
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
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={modalTransition}
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
                transition={modalTransition}
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
                          {coin.image || coin.imageId ? (
                            <CoinImage coin={coin} className="w-full h-full object-cover" />
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
                          <motion.button 
                            whileTap={shouldReduceMotion ? {} : BUTTON_TAP}
                            transition={springConfig}
                            onClick={() => {
                              const ids = coinGroup.slice(0, 3).map(c => c.id);
                              handleFusion(ids);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs shadow-lg shadow-blue-200 dark:shadow-none"
                          >
                            Fuse 3
                          </motion.button>
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

        <AnimatePresence>
          {showLibraryPicker && (
            <ImageLibraryPicker 
              isOpen={showLibraryPicker}
              onClose={() => setShowLibraryPicker(false)}
              onSelect={handleSelectFromLibrary}
              images={fullLibrary}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
