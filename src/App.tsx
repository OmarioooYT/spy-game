/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserPlus, 
  Play, 
  User, 
  Ghost, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Timer, 
  Trash2, 
  ChevronLeft,
  ShieldAlert,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TRANSLATIONS, CATEGORIES } from './constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type GameState = 'setup' | 'reveal' | 'playing' | 'voting' | 'elimination_result' | 'summary';

interface Player {
  id: string;
  name: string;
  role: 'player' | 'spy';
  hasSeenRole: boolean;
  isEliminated?: boolean;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedWord, setSelectedWord] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isRoleVisible, setIsRoleVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [spyCount, setSpyCount] = useState(1);
  const [votedPlayer, setVotedPlayer] = useState<Player | null>(null);
  const [victoryType, setVictoryType] = useState<'players' | 'spies' | null>(null);

  const t = TRANSLATIONS.ar;

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      setPlayers([
        ...players,
        {
          id: Math.random().toString(36).substr(2, 9),
          name: newPlayerName.trim(),
          role: 'player',
          hasSeenRole: false,
        },
      ]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const startGame = () => {
    if (players.length < 3) return;

    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const word = category.words[Math.floor(Math.random() * category.words.length)];
    
    // Pick spy indices
    const spyIndices: number[] = [];
    const actualSpyCount = Math.min(spyCount, players.length - 1);
    
    while (spyIndices.length < actualSpyCount) {
      const randomIndex = Math.floor(Math.random() * players.length);
      if (!spyIndices.includes(randomIndex)) {
        spyIndices.push(randomIndex);
      }
    }

    const updatedPlayers = players.map((p, i) => ({
      ...p,
      role: spyIndices.includes(i) ? 'spy' as const : 'player' as const,
      hasSeenRole: false,
    }));

    setPlayers(updatedPlayers);
    setSelectedWord(word);
    setSelectedCategory(category.name);
    setGameState('reveal');
    setCurrentPlayerIndex(0);
    setIsRoleVisible(false);
    setTimeLeft(300);
  };

  const nextPlayer = () => {
    const updatedPlayers = [...players];
    updatedPlayers[currentPlayerIndex].hasSeenRole = true;
    setPlayers(updatedPlayers);

    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setIsRoleVisible(false);
    } else {
      setGameState('playing');
      setIsTimerActive(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#16a34a', '#ffffff']
      });
    }
  };

  const handleVote = (player: Player) => {
    setVotedPlayer(player);
    const updatedPlayers = players.map(p => 
      p.id === player.id ? { ...p, isEliminated: true } : p
    );
    setPlayers(updatedPlayers);
    setGameState('elimination_result');
    setIsTimerActive(false);

    if (player.role === 'spy') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#ffffff']
      });
    }
  };

  const continueAfterElimination = () => {
    const remainingSpies = players.filter(p => p.role === 'spy' && !p.isEliminated);
    const remainingPlayers = players.filter(p => p.role === 'player' && !p.isEliminated);

    if (remainingSpies.length === 0) {
      setVictoryType('players');
      setGameState('summary');
    } else if (remainingPlayers.length <= remainingSpies.length) {
      setVictoryType('spies');
      setGameState('summary');
    } else {
      setGameState('playing');
      setIsTimerActive(true);
      setVotedPlayer(null);
    }
  };

  const endGame = () => {
    setGameState('summary');
    setIsTimerActive(false);
    setVictoryType(null);
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#ffffff', '#000000']
    });
  };

  const resetGame = () => {
    setGameState('setup');
    setPlayers(players.map(p => ({ ...p, role: 'player', hasSeenRole: false, isEliminated: false })));
    setIsTimerActive(false);
    setVotedPlayer(null);
    setVictoryType(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const spyPlayers = players.filter(p => p.role === 'spy');

  return (
    <div className="min-h-screen spy-gradient flex flex-col items-center justify-center p-4 md:p-8 font-sans overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 mb-4 neon-glow">
            <ShieldAlert className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">{t.title}</h1>
          <p className="text-white/40 font-medium uppercase tracking-widest text-xs">{t.subtitle}</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {gameState === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-6"
            >
              <div className="glass-card p-6 space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                    placeholder={t.playerNamePlaceholder}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                  />
                  <button
                    onClick={addPlayer}
                    className="bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl px-4 transition-all active:scale-95"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {players.map((player) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={player.id}
                      className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3 group hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-white/60" />
                        </div>
                        <span className="font-semibold">{player.name}</span>
                      </div>
                      <button
                        onClick={() => removePlayer(player.id)}
                        className="text-white/20 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-4 space-y-3">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest text-center">{t.spyCount}</p>
                <div className="flex gap-2">
                  {[1, 2].map((count) => (
                    <button
                      key={count}
                      onClick={() => setSpyCount(count)}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-black transition-all border",
                        spyCount === count 
                          ? "bg-green-500 border-green-500 text-black neon-glow" 
                          : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={players.length < 3}
                onClick={startGame}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]",
                  players.length >= 3 
                    ? "bg-white text-black hover:bg-green-500 hover:text-black shadow-xl" 
                    : "bg-white/10 text-white/20 cursor-not-allowed"
                )}
              >
                <Play className="w-6 h-6 fill-current" />
                {t.startGame}
              </button>
              
              {players.length < 3 && (
                <p className="text-center text-white/30 text-sm font-medium">{t.minPlayers}</p>
              )}
            </motion.div>
          )}

          {gameState === 'reveal' && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-8 text-center"
            >
              <div className="glass-card p-12 flex flex-col items-center gap-8 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-white/20 font-mono text-sm">
                  {currentPlayerIndex + 1} / {players.length}
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white">{players[currentPlayerIndex].name}</h2>
                  <p className="text-white/40 text-sm">{t.revealRole}</p>
                </div>

                <div className="relative w-full aspect-square max-w-[200px]">
                  <AnimatePresence mode="wait">
                    {!isRoleVisible ? (
                      <motion.button
                        key="hidden"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        onClick={() => setIsRoleVisible(true)}
                        className="w-full h-full rounded-full bg-white/5 border-4 border-dashed border-white/10 flex items-center justify-center group hover:border-green-500/50 transition-all"
                      >
                        <Eye className="w-12 h-12 text-white/20 group-hover:text-green-500/50 transition-all" />
                      </motion.button>
                    ) : (
                      <motion.div
                        key="visible"
                        initial={{ opacity: 0, scale: 1.2 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full h-full rounded-full bg-green-500/10 border-4 border-green-500 flex flex-col items-center justify-center p-4 neon-glow"
                      >
                        {players[currentPlayerIndex].role === 'spy' ? (
                          <>
                            <Ghost className="w-12 h-12 text-green-500 mb-2" />
                            <span className="text-2xl font-black text-green-500">{t.youAreSpy}</span>
                            <p className="text-[10px] text-green-500/60 mt-2 leading-tight">{t.spyGoal}</p>
                          </>
                        ) : (
                          <>
                            <Search className="w-10 h-10 text-white mb-2" />
                            <span className="text-sm text-white/60 mb-1">{t.yourWord}</span>
                            <span className="text-3xl font-black text-white tracking-tight">{selectedWord}</span>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  disabled={!isRoleVisible}
                  onClick={nextPlayer}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    isRoleVisible 
                      ? "bg-white text-black hover:bg-green-500" 
                      : "bg-white/5 text-white/10 cursor-not-allowed"
                  )}
                >
                  {t.nextPlayer}
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="glass-card p-8 text-center space-y-8">
                <div className="space-y-1">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{t.category}</p>
                  <h2 className="text-4xl font-black text-white">{selectedCategory}</h2>
                </div>

                <div className="flex flex-col items-center gap-4 py-8 border-y border-white/5">
                  <div className={cn(
                    "text-6xl font-mono font-black tracking-tighter",
                    timeLeft < 60 ? "text-red-500 animate-pulse" : "text-white"
                  )}>
                    {formatTime(timeLeft)}
                  </div>
                  <div className="flex items-center gap-2 text-white/40 font-bold text-sm">
                    <Timer className="w-4 h-4" />
                    {t.timer}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsTimerActive(!isTimerActive)}
                    className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    {isTimerActive ? "إيقاف" : "استئناف"}
                  </button>
                  <button
                    onClick={() => setGameState('voting')}
                    className="bg-green-500 hover:bg-green-600 text-black font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 neon-glow"
                  >
                    <UserPlus className="w-4 h-4" />
                    {t.voteButton}
                  </button>
                </div>

                <button
                  onClick={endGame}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-black py-4 rounded-xl transition-all"
                >
                  {t.endGame}
                </button>
              </div>

              <div className="glass-card p-4">
                <h3 className="text-xs font-bold text-white/20 uppercase tracking-widest mb-3 px-2">{t.players}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {players.map((p) => (
                    <div key={p.id} className={cn(
                      "rounded-lg p-2 text-sm font-medium flex items-center gap-2 transition-all",
                      p.isEliminated ? "bg-red-500/10 text-red-500/40 line-through" : "bg-white/5 text-white/60"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        p.isEliminated ? "bg-red-500/40" : "bg-green-500/40"
                      )} />
                      {p.name}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {gameState === 'voting' && (
            <motion.div
              key="voting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="glass-card p-8 text-center space-y-6">
                <h2 className="text-3xl font-black text-white">{t.voteTitle}</h2>
                <div className="grid grid-cols-1 gap-3">
                  {players.filter(p => !p.isEliminated).map((player) => (
                    <button
                      key={player.id}
                      onClick={() => handleVote(player)}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-xl font-bold text-white transition-all flex items-center justify-between group"
                    >
                      <span>{player.name}</span>
                      <ChevronLeft className="w-6 h-6 text-white/20 group-hover:text-green-500 transition-all" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setGameState('playing')}
                  className="text-white/40 hover:text-white text-sm font-bold transition-all"
                >
                  {t.back}
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'elimination_result' && votedPlayer && (
            <motion.div
              key="elimination_result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 text-center"
            >
              <div className="glass-card p-12 space-y-8">
                <div className="space-y-2">
                  <p className="text-white/40 text-sm font-bold uppercase tracking-widest">{t.eliminated}</p>
                  <h2 className="text-5xl font-black text-white tracking-tighter">{votedPlayer.name}</h2>
                </div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    "py-6 rounded-2xl border-4 flex flex-col items-center gap-4",
                    votedPlayer.role === 'spy' 
                      ? "bg-green-500/10 border-green-500 text-green-500 neon-glow" 
                      : "bg-red-500/10 border-red-500 text-red-500"
                  )}
                >
                  {votedPlayer.role === 'spy' ? (
                    <>
                      <Ghost className="w-16 h-16" />
                      <span className="text-3xl font-black">{t.wasSpy}</span>
                    </>
                  ) : (
                    <>
                      <User className="w-16 h-16" />
                      <span className="text-3xl font-black">{t.wasNotSpy}</span>
                    </>
                  )}
                </motion.div>

                <button
                  onClick={continueAfterElimination}
                  className="w-full bg-white text-black hover:bg-green-500 font-black py-4 rounded-xl transition-all"
                >
                  {t.continueGame}
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 text-center"
            >
              <div className="glass-card p-12 space-y-8 relative overflow-hidden">
                {victoryType && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                      "text-4xl font-black mb-4",
                      victoryType === 'players' ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {victoryType === 'players' ? t.victoryPlayers : t.victorySpies}
                  </motion.div>
                )}

                <div className="space-y-4">
                  <p className="text-white/40 text-sm font-bold uppercase tracking-widest">
                    {spyPlayers.length > 1 ? t.spiesWere : t.spyWas}
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-6">
                    {spyPlayers.map((spy, idx) => (
                      <motion.div
                        key={spy.id}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', damping: 12, delay: idx * 0.1 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <div className="w-20 h-20 rounded-full bg-red-500/10 border-4 border-red-500 flex items-center justify-center neon-glow">
                          <Ghost className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tighter">{spy.name}</h2>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 py-6 border-y border-white/5">
                  <p className="text-white/40 text-xs uppercase tracking-widest">{t.category}: {selectedCategory}</p>
                  <p className="text-2xl font-bold text-green-500">{selectedWord}</p>
                </div>

                <button
                  onClick={resetGame}
                  className="w-full bg-white text-black hover:bg-green-500 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-3"
                >
                  <RotateCcw className="w-5 h-5" />
                  {t.resetGame}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer info */}
        <div className="mt-12 text-center">
          <p className="text-white/10 text-[10px] font-mono tracking-widest uppercase">
            Mission Protocol v1.0.4 // Encrypted Session
          </p>
        </div>
      </div>

      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-500/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>
    </div>
  );
}
