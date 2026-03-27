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
}

interface Folder {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface Profile {
  name: string;
  recoveryCode: string;
  preferences: {
    sortBy: 'added' | 'opened';
  };
}

const TARGET_PER_TYPE = 20;

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
    if (saved) return JSON.parse(saved);
    return {
      name: 'Collector',
      recoveryCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
      preferences: { sortBy: 'added' }
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
    };

    if (isEditing) {
      setCoins(coins.map(c => c.id === isEditing.id ? { ...c, ...coinData } : c));
      setFeedback({ message: 'Coin updated!', type: 'success' });
    } else {
      const newCoin: Coin = {
        id: crypto.randomUUID(),
        ...coinData,
        dateAdded: Date.now(),
        lastOpened: Date.now(),
      };
      setCoins([newCoin, ...coins]);
      setFeedback({ message: 'Coin added to collection!', type: 'success' });
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

    return { counts, total, completion };
  }, [coins]);

  const suggestion = useMemo(() => {
    if (coins.length === 0) return "Start your collection today!";
    if (coins.length < 5) return "You're on your way! Add more coins.";
    if (coins.length < 15) return "Great collection! Keep going.";
    return "Impressive! You're a true collector.";
  }, [coins.length]);

  // --- Render Helpers ---

  const renderHeader = () => (
    <header className="bg-white border-b border-gray-100 px-6 pt-12 pb-6 sticky top-0 z-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold tracking-tight">My Coins</h1>
          <div className="flex gap-2">
            <button onClick={exportData} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <Download size={20} />
            </button>
            <button onClick={() => importInputRef.current?.click()} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <Upload size={20} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
          <div>
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Coins</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Completion</p>
            <p className="text-2xl font-bold text-blue-600">{stats.completion}%</p>
          </div>
        </div>
      </div>
    </header>
  );

  const renderTabs = () => (
    <div className="flex bg-gray-200/50 p-1 rounded-xl mb-6">
      <button
        onClick={() => setActiveTab('collection')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          activeTab === 'collection' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
        }`}
      >
        <LayoutGrid size={18} />
        Collection
      </button>
      <button
        onClick={() => setActiveTab('stats')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          activeTab === 'stats' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
        }`}
      >
        <PieChart size={18} />
        Stats
      </button>
      <button
        onClick={() => setActiveTab('profile')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          activeTab === 'profile' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
        }`}
      >
        <User size={18} />
        Profile
      </button>
    </div>
  );

  return (
    <ErrorBoundary onExport={exportData}>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24">
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
                      selectedFolderId === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-100'
                    }`}
                  >
                    All Coins
                  </button>
                  {folders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                        selectedFolderId === folder.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-100'
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
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                  >
                    <Plus size={20} /> Add New Coin
                  </motion.button>
                ) : (
                  <motion.form
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onSubmit={addCoin}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg">{isEditing ? 'Edit Coin' : 'New Coin'}</h3>
                      <button type="button" onClick={resetForm} className="text-gray-400"><X size={20} /></button>
                    </div>

                    {/* Image Upload */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
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
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Year</label>
                        <input
                          type="number"
                          value={newYear}
                          onChange={(e) => setNewYear(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Type</label>
                        <select
                          value={newType}
                          onChange={(e) => setNewType(e.target.value as CoinType)}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                        >
                          <option value="50p">50p</option>
                          <option value="£1">£1</option>
                          <option value="£2">£2</option>
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
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Folder</label>
                        <select
                          value={newFolderId}
                          onChange={(e) => setNewFolderId(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                        >
                          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Rarity</label>
                        <select
                          value={newRarity}
                          onChange={(e) => setNewRarity(e.target.value as Rarity)}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                        >
                          <option value="Common">Common</option>
                          <option value="Rare">Rare</option>
                          <option value="Very Rare">Very Rare</option>
                        </select>
                      </div>
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
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Info className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">No Coins Found</h3>
                    <p className="text-gray-500">Try adding a coin or checking another folder.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedCoins.map((coin) => (
                      <motion.div
                        layout
                        key={coin.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => openCoin(coin)}
                        className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-transform"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gray-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {coin.image ? (
                              <img src={coin.image} alt={coin.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className={`text-lg font-bold ${
                                coin.rarity === 'Very Rare' ? 'text-amber-600' :
                                coin.rarity === 'Rare' ? 'text-blue-600' : 'text-gray-400'
                              }`}>
                                {coin.type}
                              </span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                              {coin.name}
                              {coin.rarity !== 'Common' && <Star size={14} className="fill-amber-400 text-amber-400" />}
                            </h4>
                            <p className="text-xs text-gray-500 font-medium line-clamp-1">{coin.year} • {coin.rarity} • {folders.find(f => f.id === coin.folderId)?.name}</p>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-300" />
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
                <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100">
                  <p className="text-blue-100 text-sm font-bold uppercase tracking-wider mb-1">Suggestion</p>
                  <h3 className="text-2xl font-bold leading-tight">{suggestion}</h3>
                </div>

                {/* Progress Bars */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-800">Progress by Type</h3>
                  {(['50p', '£1', '£2'] as CoinType[]).map((type) => {
                    const count = stats.counts[type];
                    const percent = Math.min((count / TARGET_PER_TYPE) * 100, 100);
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="font-bold text-gray-700">{type} Coins</span>
                          <span className="text-sm font-bold text-gray-400">{count} / {TARGET_PER_TYPE}</span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
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
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                    <User size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{profile.name}</h3>
                    <p className="text-sm text-gray-500">Device-based Profile</p>
                  </div>
                </div>

                {/* Recovery Code */}
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                  <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                    <Info size={18} />
                    <span>Recovery Code</span>
                  </div>
                  <p className="text-sm text-amber-700 mb-4">Save this code to recover your data if you lose access to this device.</p>
                  <div className="bg-white p-4 rounded-xl text-center font-mono text-xl font-bold tracking-widest border border-amber-200">
                    {profile.recoveryCode}
                  </div>
                </div>

                {/* Preferences */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Settings size={20} /> Preferences
                  </h3>
                  <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                    <div className="p-4 flex items-center justify-between">
                      <span className="font-medium">Sort Collection By</span>
                      <select 
                        value={profile.preferences.sortBy}
                        onChange={(e) => setProfile({ ...profile, preferences: { sortBy: e.target.value as 'added' | 'opened' } })}
                        className="bg-gray-50 px-3 py-1 rounded-lg text-sm font-bold border-none focus:ring-0"
                      >
                        <option value="added">Recently Added</option>
                        <option value="opened">Recently Opened</option>
                      </select>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="font-medium">Data Management</span>
                      <div className="flex gap-2">
                        <button onClick={exportData} className="text-blue-600 text-sm font-bold">Export</button>
                        <span className="text-gray-200">|</span>
                        <button onClick={() => importInputRef.current?.click()} className="text-blue-600 text-sm font-bold">Import</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Folders Management */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <FolderIcon size={20} /> Folders
                  </h3>
                  <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
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
                      className="w-full p-4 text-blue-600 font-bold text-sm flex items-center justify-center gap-2"
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
                className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="relative h-64 bg-gray-100 flex-shrink-0">
                  {selectedCoin.image ? (
                    <img src={selectedCoin.image} alt={selectedCoin.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-gray-200">
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
                      selectedCoin.rarity === 'Very Rare' ? 'bg-amber-100 text-amber-600' :
                      selectedCoin.rarity === 'Rare' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedCoin.rarity}
                    </span>
                    <span className="text-sm font-bold text-gray-400">{selectedCoin.year}</span>
                  </div>
                  
                  <h2 className="text-3xl font-bold mb-4">{selectedCoin.name}</h2>
                  
                  <div className="bg-gray-50 p-4 rounded-2xl mb-6">
                    <p className="text-gray-600 leading-relaxed italic">"{selectedCoin.summary || 'No summary provided.'}"</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">Type</p>
                      <p className="font-bold text-lg">{selectedCoin.type}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">Folder</p>
                      <p className="font-bold text-lg">{folders.find(f => f.id === selectedCoin.folderId)?.name}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => startEdit(selectedCoin)}
                      className="flex-1 py-4 bg-gray-100 text-gray-800 rounded-2xl font-bold"
                    >
                      Edit Details
                    </button>
                    <button 
                      onClick={() => deleteCoin(selectedCoin.id)}
                      className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold"
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
