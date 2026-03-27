/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, FormEvent, useRef, ErrorInfo, ReactNode, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, PieChart, LayoutGrid, Info, CheckCircle2, Star, 
  Folder as FolderIcon, Image as ImageIcon, Download, Upload, 
  Settings, User, ChevronRight, X, ArrowLeft, Search, Clock
} from 'lucide-react';

// --- Types ---

type CoinType = '£1' | '£2' | '50p';
type Rarity = 'Common' | 'Rare' | 'Very Rare';

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
}

interface Folder {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface Profile {
  name: string;
  recoveryCode: string;
  points: number;
  preferences: {
    sortBy: 'added' | 'opened';
    theme: 'light' | 'dark' | 'system';
    compactUI: boolean;
    showBottomMenu: boolean;
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

  render() {
    const self = this as any;
    if (self.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-6">The app encountered an error. You can still export your data to keep it safe.</p>
          <button
            onClick={self.props.onExport}
            className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"
          >
            <Download size={20} /> Export Data Now
          </button>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-red-500 font-medium underline"
          >
            Reload App
          </button>
        </div>
      );
    }
    return self.props.children;
  }
}

// --- Main App ---

export default function App() {
  // --- State ---
  
  const [coins, setCoins] = useState<Coin[]>(() => {
    const saved = localStorage.getItem('coin-collection');
    return saved ? JSON.parse(saved) : [];
  });

  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem('coin-folders');
    if (saved) return JSON.parse(saved);
    return [{ id: 'purchased', name: 'Coins Purchased', isDefault: true }];
  });

  const [profile, setProfile] = useState<Profile>(() => {
    const saved = localStorage.getItem('coin-profile');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration for new fields
      return {
        ...parsed,
        points: parsed.points ?? 0,
        preferences: {
          sortBy: parsed.preferences?.sortBy ?? 'added',
          theme: parsed.preferences?.theme ?? 'system',
          compactUI: parsed.preferences?.compactUI ?? false,
          showBottomMenu: parsed.preferences?.showBottomMenu ?? true,
        }
      };
    }
    return {
      name: 'Collector',
      recoveryCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
      points: 0,
      preferences: { 
        sortBy: 'added',
        theme: 'system',
        compactUI: false,
        showBottomMenu: true,
      }
    };
  });

  const [activeTab, setActiveTab] = useState<'collection' | 'stats' | 'profile'>('collection');
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all');
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<Coin | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [importProgress, setImportProgress] = useState<number | null>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newType, setNewType] = useState<CoinType>('50p');
  const [newRarity, setNewRarity] = useState<Rarity>('Common');
  const [newSummary, setNewSummary] = useState('');
  const [newImage, setNewImage] = useState<string | undefined>();
  const [newFolderId, setNewFolderId] = useState<string>('purchased');
  const [newAmountPaid, setNewAmountPaid] = useState('0');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---

  useEffect(() => {
    localStorage.setItem('coin-collection', JSON.stringify(coins));
  }, [coins]);

  useEffect(() => {
    localStorage.setItem('coin-folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('coin-profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    const root = window.document.documentElement;
    const theme = profile.preferences.theme;
    
    const applyTheme = (isDark: boolean) => {
      root.classList.toggle('dark', isDark);
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);
      
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [profile.preferences.theme]);

  // --- Actions ---

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
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
    };

    if (isEditing) {
      setCoins(coins.map(c => c.id === isEditing.id ? { ...c, ...coinData } : c));
      setFeedback({ message: 'Coin updated!', type: 'success' });
    } else {
      const points = RARITY_POINTS[newRarity];
      const newCoin: Coin = {
        id: crypto.randomUUID(),
        ...coinData,
        dateAdded: Date.now(),
        lastOpened: Date.now(),
      };
      setCoins([newCoin, ...coins]);
      setProfile(prev => ({ ...prev, points: prev.points + points }));
      setFeedback({ message: `Coin added! +${points} points`, type: 'success' });
    }

    resetForm();
  };

  const resetForm = () => {
    setNewName('');
    setNewYear(new Date().getFullYear().toString());
    setNewType('50p');
    setNewRarity('Common');
    setNewSummary('');
    setNewImage(undefined);
    setNewFolderId('purchased');
    setNewAmountPaid('0');
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
    setCoins(coins.map(c => c.id === coin.id ? { ...c, lastOpened: Date.now() } : c));
    setSelectedCoin(coin);
  };

  const exportData = () => {
    const data = {
      coins,
      folders,
      profile,
      version: '1.1'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `coin-collection-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({ message: 'Data exported successfully', type: 'success' });
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
        const data = JSON.parse(event.target?.result as string);
        if (data.coins) setCoins(data.coins);
        if (data.folders) setFolders(data.folders);
        if (data.profile) setProfile(data.profile);
        
        setFeedback({ message: 'Data imported successfully', type: 'success' });
      } catch (err) {
        setFeedback({ message: 'Invalid data format', type: 'info' });
      } finally {
        setImportProgress(null);
        if (importInputRef.current) importInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // --- Memos ---

  const sortedCoins = useMemo(() => {
    let filtered = coins;
    if (selectedFolderId !== 'all') {
      filtered = coins.filter(c => c.folderId === selectedFolderId);
    }

    return [...filtered].sort((a, b) => {
      if (profile.preferences.sortBy === 'opened') {
        return b.lastOpened - a.lastOpened;
      }
      return b.dateAdded - a.dateAdded;
    });
  }, [coins, selectedFolderId, profile.preferences.sortBy]);

  const stats = useMemo(() => {
    const counts = {
      '£1': coins.filter(c => c.type === '£1').length,
      '£2': coins.filter(c => c.type === '£2').length,
      '50p': coins.filter(c => c.type === '50p').length,
    };
    const total = coins.length;
    const targetTotal = TARGET_PER_TYPE * 3;
    const completion = Math.min(Math.round((total / targetTotal) * 100), 100);

    const totalSpend = coins.reduce((sum, c) => sum + (c.amountPaid || 0), 0);
    
    // Monthly totals
    const monthlyTotals: { [key: string]: number } = {};
    coins.forEach(c => {
      const date = new Date(c.dateAdded);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTotals[key] = (monthlyTotals[key] || 0) + 1;
    });

    // Duplicate tracking
    const duplicates: { [key: string]: { count: number; coin: Coin } } = {};
    coins.forEach(c => {
      const key = `${c.name}-${c.year}-${c.type}`.toLowerCase();
      if (duplicates[key]) {
        duplicates[key].count += 1;
      } else {
        duplicates[key] = { count: 1, coin: c };
      }
    });
    const duplicateList = Object.values(duplicates).filter(d => d.count > 1).sort((a, b) => b.count - a.count);

    return { counts, total, completion, totalSpend, monthlyTotals, duplicateList };
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

  const renderHeader = () => (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 pt-12 pb-6 sticky top-0 z-10 transition-colors">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold tracking-tight">My Coins</h1>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Refresh App">
              <Clock size={20} />
            </button>
            <button onClick={exportData} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <Download size={20} />
            </button>
            <button onClick={() => importInputRef.current?.click()} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <Upload size={20} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 transition-colors">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Total Coins</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Completion</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.completion}%</p>
          </div>
        </div>
      </div>
    </header>
  );

  const renderTabs = () => {
    if (profile.preferences.showBottomMenu) return null;
    return (
      <div className="flex bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('collection')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'collection' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <LayoutGrid size={18} />
          Collection
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'stats' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <PieChart size={18} />
          Stats
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'profile' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <User size={18} />
          Profile
        </button>
      </div>
    );
  };

  const renderBottomMenu = () => {
    if (!profile.preferences.showBottomMenu) return null;
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 px-6 py-4 z-40 flex items-center justify-around pb-8 sm:pb-4">
        <button
          onClick={() => setActiveTab('collection')}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'collection' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
          }`}
        >
          <LayoutGrid size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Collection</span>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'stats' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
          }`}
        >
          <PieChart size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Stats</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'profile' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
          }`}
        >
          <User size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Profile</span>
        </button>
      </nav>
    );
  };

  return (
    <ErrorBoundary onExport={exportData}>
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors ${profile.preferences.showBottomMenu ? 'pb-32' : 'pb-24'}`}>
        <input 
          type="file" 
          ref={importInputRef} 
          onChange={importData} 
          accept=".json" 
          className="hidden" 
        />

        {renderHeader()}

        <main className="max-w-md mx-auto px-6 pt-6">
          {renderTabs()}

          <AnimatePresence mode="wait">
            {activeTab === 'collection' && (
              <motion.div
                key="collection"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Folder Selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  <button
                    onClick={() => setSelectedFolderId('all')}
                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                      selectedFolderId === 'all' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    All Coins
                  </button>
                  {folders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                        selectedFolderId === folder.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'
                      }`}
                    >
                      {folder.name}
                    </button>
                  ))}
                </div>

                {/* Add Button / Form */}
                {!isAdding ? (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsAdding(true)}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
                  >
                    <Plus size={20} /> Add New Coin
                  </motion.button>
                ) : (
                  <motion.form
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onSubmit={addCoin}
                    className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg">{isEditing ? 'Edit Coin' : 'New Coin'}</h3>
                      <button type="button" onClick={resetForm} className="text-gray-400"><X size={20} /></button>
                    </div>

                    {/* Image Upload */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
                    >
                      {newImage ? (
                        <img src={newImage} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="text-gray-300 mb-2" size={32} />
                          <span className="text-xs font-bold text-gray-400">Add Coin Image</span>
                        </>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Coin Name</label>
                      <input
                        autoFocus
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Kew Gardens"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Year</label>
                        <input
                          type="number"
                          value={newYear}
                          onChange={(e) => setNewYear(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Amount Paid (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newAmountPaid}
                          onChange={(e) => setNewAmountPaid(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Type</label>
                        <select
                          value={newType}
                          onChange={(e) => setNewType(e.target.value as CoinType)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                        >
                          <option value="50p">50p</option>
                          <option value="£1">£1</option>
                          <option value="£2">£2</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Rarity</label>
                        <select
                          value={newRarity}
                          onChange={(e) => setNewRarity(e.target.value as Rarity)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                        >
                          <option value="Common">Common</option>
                          <option value="Rare">Rare</option>
                          <option value="Very Rare">Very Rare</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Summary (2 lines)</label>
                      <textarea
                        rows={2}
                        value={newSummary}
                        onChange={(e) => setNewSummary(e.target.value)}
                        placeholder="Brief description of the coin..."
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Folder</label>
                      <select
                        value={newFolderId}
                        onChange={(e) => setNewFolderId(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                      >
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold mt-2"
                    >
                      {isEditing ? 'Update Coin' : 'Save Coin'}
                    </button>
                  </motion.form>
                )}

                {/* List */}
                {sortedCoins.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Info className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">No Coins Found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Try adding a coin or checking another folder.</p>
                  </div>
                ) : (
                  <div className={profile.preferences.compactUI ? 'space-y-2' : 'space-y-3'}>
                    {sortedCoins.map((coin) => (
                      <motion.div
                        layout
                        key={coin.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => openCoin(coin)}
                        className={`bg-white dark:bg-gray-900 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer active:scale-[0.98] ${
                          profile.preferences.compactUI ? 'p-2' : 'p-3'
                        } ${
                          coin.rarity === 'Very Rare' ? 'border-amber-400 shadow-amber-100 dark:shadow-none' : 
                          coin.rarity === 'Rare' ? 'border-blue-400 shadow-blue-100 dark:shadow-none' : 'border-gray-100 dark:border-gray-800 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`${profile.preferences.compactUI ? 'w-10 h-10' : 'w-14 h-14'} rounded-xl bg-gray-50 dark:bg-gray-800 flex-shrink-0 overflow-hidden flex items-center justify-center`}>
                            {coin.image ? (
                              <img src={coin.image} alt={coin.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className={`${profile.preferences.compactUI ? 'text-sm' : 'text-lg'} font-bold ${
                                coin.rarity === 'Very Rare' ? 'text-amber-600' :
                                coin.rarity === 'Rare' ? 'text-blue-600' : 'text-gray-400'
                              }`}>
                                {coin.type}
                              </span>
                            )}
                          </div>
                          <div>
                            <h4 className={`font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 ${profile.preferences.compactUI ? 'text-sm' : ''}`}>
                              {coin.name}
                              {coin.rarity !== 'Common' && <Star size={profile.preferences.compactUI ? 12 : 14} className="fill-amber-400 text-amber-400" />}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium line-clamp-1">
                              {coin.year} • {coin.rarity} • £{coin.amountPaid?.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Suggestion */}
                <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100 dark:shadow-none">
                  <p className="text-blue-100 text-sm font-bold uppercase tracking-wider mb-1">Suggestion</p>
                  <h3 className="text-2xl font-bold leading-tight">{suggestion}</h3>
                </div>

                {/* Progress Bars */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Progress by Type</h3>
                  {(['50p', '£1', '£2'] as CoinType[]).map((type) => {
                    const count = stats.counts[type];
                    const percent = Math.min((count / TARGET_PER_TYPE) * 100, 100);
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="font-bold text-gray-700 dark:text-gray-300">{type} Coins</span>
                          <span className="text-sm font-bold text-gray-400">{count} / {TARGET_PER_TYPE}</span>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            className={`h-full rounded-full ${
                              type === '50p' ? 'bg-blue-500' :
                              type === '£1' ? 'bg-indigo-500' : 'bg-purple-500'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Monthly Totals */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Collection History</h3>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
                    {Object.entries(stats.monthlyTotals).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6).map(([month, count]) => {
                      const [year, m] = month.split('-');
                      const date = new Date(parseInt(year), parseInt(m) - 1);
                      const monthName = date.toLocaleString('default', { month: 'long' });
                      return (
                        <div key={month} className="p-4 flex items-center justify-between">
                          <span className="font-medium text-gray-600 dark:text-gray-400">{monthName} {year}</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">+{count} coins</span>
                        </div>
                      );
                    })}
                    {Object.keys(stats.monthlyTotals).length === 0 && (
                      <div className="p-8 text-center text-gray-400 italic">No history yet.</div>
                    )}
                  </div>
                </div>

                {/* Duplicates */}
                {stats.duplicateList.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Duplicates Tracked</h3>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
                      {stats.duplicateList.map(({ count, coin }) => (
                        <div key={coin.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                              {coin.type}
                            </div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{coin.name} ({coin.year})</span>
                          </div>
                          <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold">
                            {count} owned
                          </span>
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Profile Card */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <User size={32} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{profile.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{currentLevel.name} Collector</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase">Total Spend</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">£{stats.totalSpend.toFixed(2)}</p>
                  </div>
                </div>

                {/* Level Progress */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">Level Progress</p>
                      <h4 className="text-lg font-bold">{profile.points} Points</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">Next: {nextLevel?.name || 'Max'}</p>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{progressToNextLevel}%</p>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToNextLevel}%` }}
                      className="h-full bg-blue-600 rounded-full"
                    />
                  </div>
                </div>

                {/* Preferences */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Settings size={20} /> Settings
                  </h3>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
                    <div className="p-4 flex items-center justify-between">
                      <span className="font-medium">Theme Mode</span>
                      <select 
                        value={profile.preferences.theme}
                        onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences, theme: e.target.value as any } })}
                        className="bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-lg text-sm font-bold border-none focus:ring-0"
                      >
                        <option value="system">System</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="font-medium">Compact UI</span>
                      <button 
                        onClick={() => setProfile({ ...profile, preferences: { ...profile.preferences, compactUI: !profile.preferences.compactUI } })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${profile.preferences.compactUI ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                      >
                        <motion.div 
                          animate={{ x: profile.preferences.compactUI ? 26 : 2 }}
                          className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="font-medium">Bottom Menu</span>
                      <button 
                        onClick={() => setProfile({ ...profile, preferences: { ...profile.preferences, showBottomMenu: !profile.preferences.showBottomMenu } })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${profile.preferences.showBottomMenu ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                      >
                        <motion.div 
                          animate={{ x: profile.preferences.showBottomMenu ? 26 : 2 }}
                          className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="font-medium">Sort Collection By</span>
                      <select 
                        value={profile.preferences.sortBy}
                        onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences, sortBy: e.target.value as 'added' | 'opened' } })}
                        className="bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-lg text-sm font-bold border-none focus:ring-0"
                      >
                        <option value="added">Recently Added</option>
                        <option value="opened">Recently Opened</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* App Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => window.location.reload()}
                    className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Clock size={18} className="text-blue-600" /> Refresh App
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure? This will delete all your coins and settings!')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 text-red-600"
                  >
                    <Trash2 size={18} /> Clear Cache
                  </button>
                </div>

                {/* Recovery Code */}
                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold mb-2">
                    <Info size={18} />
                    <span>Recovery Code</span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-500 mb-4">Save this code to recover your data if you lose access to this device.</p>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl text-center font-mono text-xl font-bold tracking-widest border border-amber-200 dark:border-amber-900/50">
                    {profile.recoveryCode}
                  </div>
                </div>

                {/* Folders Management */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <FolderIcon size={20} /> Folders
                  </h3>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
                    {folders.map(folder => (
                      <div key={folder.id} className="p-4 flex items-center justify-between">
                        <span className="font-medium">{folder.name}</span>
                        {!folder.isDefault && (
                          <button 
                            onClick={() => setFolders(folders.filter(f => f.id !== folder.id))}
                            className="text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const name = prompt('Folder Name:');
                        if (name) setFolders([...folders, { id: crypto.randomUUID(), name }]);
                      }}
                      className="w-full p-4 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Add Folder
                    </button>
                  </div>
                </div>
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
              onClick={() => setSelectedCoin(null)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[90vh] flex flex-col border-t sm:border border-gray-100 dark:border-gray-800"
                onClick={e => e.stopPropagation()}
              >
                <div className="relative h-64 bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                  {selectedCoin.image ? (
                    <img src={selectedCoin.image} alt={selectedCoin.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-gray-200 dark:text-gray-700">
                      {selectedCoin.type}
                    </div>
                  )}
                  <button 
                    onClick={() => setSelectedCoin(null)}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-8 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedCoin.rarity === 'Very Rare' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                      selectedCoin.rarity === 'Rare' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {selectedCoin.rarity}
                    </span>
                    <span className="text-sm font-bold text-gray-400">{selectedCoin.year}</span>
                  </div>
                  
                  <h2 className="text-3xl font-bold mb-4">{selectedCoin.name}</h2>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl mb-6">
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed italic">"{selectedCoin.summary || 'No summary provided.'}"</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">Type</p>
                      <p className="font-bold text-lg">{selectedCoin.type}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">Folder</p>
                      <p className="font-bold text-lg">{folders.find(f => f.id === selectedCoin.folderId)?.name}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => startEdit(selectedCoin)}
                      className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl font-bold"
                    >
                      Edit Details
                    </button>
                    <button 
                      onClick={() => deleteCoin(selectedCoin.id)}
                      className="flex-1 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-bold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
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
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
            >
              <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-white ${
                feedback.type === 'success' ? 'bg-green-500' : 'bg-gray-800'
              }`}>
                <CheckCircle2 size={18} />
                {feedback.message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
