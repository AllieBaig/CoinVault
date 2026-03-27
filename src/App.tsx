/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, PieChart, LayoutGrid, Info, CheckCircle2, Star } from 'lucide-react';

type CoinType = '£1' | '£2' | '50p';
type Rarity = 'Common' | 'Rare' | 'Very Rare';

interface Coin {
  id: string;
  name: string;
  year: string;
  type: CoinType;
  rarity: Rarity;
  dateAdded: number;
}

const TARGET_PER_TYPE = 20;

export default function App() {
  const [coins, setCoins] = useState<Coin[]>(() => {
    const saved = localStorage.getItem('coin-collection');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<'collection' | 'stats'>('collection');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newType, setNewType] = useState<CoinType>('50p');
  const [newRarity, setNewRarity] = useState<Rarity>('Common');

  useEffect(() => {
    localStorage.setItem('coin-collection', JSON.stringify(coins));
  }, [coins]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const addCoin = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newCoin: Coin = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      year: newYear,
      type: newType,
      rarity: newRarity,
      dateAdded: Date.now(),
    };

    setCoins([newCoin, ...coins]);
    setNewName('');
    setIsAdding(false);
    setFeedback({ message: 'Coin added to collection!', type: 'success' });
  };

  const deleteCoin = (id: string) => {
    setCoins(coins.filter(c => c.id !== id));
    setFeedback({ message: 'Coin removed', type: 'info' });
  };

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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24">
      {/* Header & Summary */}
      <header className="bg-white border-b border-gray-100 px-6 pt-12 pb-6 sticky top-0 z-10">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold tracking-tight mb-4">My Coins</h1>
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

      <main className="max-w-md mx-auto px-6 pt-6">
        {/* Tabs */}
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
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'collection' ? (
            <motion.div
              key="collection"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
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
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Rarity</label>
                    <div className="flex gap-2">
                      {(['Common', 'Rare', 'Very Rare'] as Rarity[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setNewRarity(r)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                            newRarity === r
                              ? 'bg-blue-50 border-blue-200 text-blue-600'
                              : 'bg-white border-gray-100 text-gray-400'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="flex-1 py-3 text-gray-500 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                    >
                      Save Coin
                    </button>
                  </div>
                </motion.form>
              )}

              {/* List */}
              {coins.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Start Your Collection</h3>
                  <p className="text-gray-500">Add your first coin to see it here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {coins.map((coin) => (
                    <motion.div
                      layout
                      key={coin.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                          coin.rarity === 'Very Rare' ? 'bg-amber-100 text-amber-600' :
                          coin.rarity === 'Rare' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {coin.type}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            {coin.name}
                            {coin.rarity !== 'Common' && <Star size={14} className="fill-current" />}
                          </h4>
                          <p className="text-xs text-gray-500 font-medium">{coin.year} • {coin.rarity}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteCoin(coin.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
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
        </AnimatePresence>
      </main>

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
  );
}
