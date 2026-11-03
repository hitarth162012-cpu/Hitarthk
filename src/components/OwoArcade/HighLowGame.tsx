import React, { useState } from 'react';
import { WalletState } from '../../types';
import {
  CardItem,
  checkHighLowGuess,
  drawCard,
  formatINR,
  HIGH_LOW_STREAK_MULTIPLIERS,
  subtractFromWallet,
  addToWallet,
} from '../../utils/economy';
import { sound } from '../../utils/audioSynth';
import confetti from 'canvas-confetti';
import { ArrowUp, ArrowDown, Banknote, ShieldAlert, Sparkles, AlertTriangle } from 'lucide-react';

interface HighLowGameProps {
  wallet: WalletState;
  onUpdateWallet: (newWallet: WalletState) => void;
  onOpenRedeem: () => void;
}

export const HighLowGame: React.FC<HighLowGameProps> = ({ wallet, onUpdateWallet, onOpenRedeem }) => {
  const [initialBet, setInitialBet] = useState<number>(300);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentCard, setCurrentCard] = useState<CardItem>(drawCard());
  const [previousCards, setPreviousCards] = useState<CardItem[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Place your bet to start the High-Low round.');

  const currentMultiplier = streak > 0 ? HIGH_LOW_STREAK_MULTIPLIERS[Math.min(streak - 1, HIGH_LOW_STREAK_MULTIPLIERS.length - 1)] : 1;
  const currentPotentialPayout = Math.round(initialBet * currentMultiplier);

  const startRound = () => {
    if (wallet.balanceINR < initialBet) {
      sound.playLoss();
      return;
    }

    const sub = subtractFromWallet(wallet, initialBet, 'High-Low', `High-Low initial bet`);
    if (!sub.success) return;

    sound.playSlotTick();
    onUpdateWallet(sub.updatedWallet);

    const firstCard = drawCard();
    setCurrentCard(firstCard);
    setPreviousCards([]);
    setStreak(0);
    setIsPlaying(true);
    setStatusMessage(`Card drawn: ${firstCard.name} of ${firstCard.suit}. Guess Higher or Lower!`);
  };

  const handleGuess = (guess: 'higher' | 'lower') => {
    if (!isPlaying) return;

    const nextCard = drawCard();
    const outcome = checkHighLowGuess(currentCard.value, nextCard.value, guess);

    setPreviousCards((prev) => [currentCard, ...prev.slice(0, 4)]);
    setCurrentCard(nextCard);

    if (outcome === 'tie') {
      sound.playSlotTick();
      setStatusMessage(`It's a tie (${nextCard.name})! Multiplier preserved.`);
    } else if (outcome === 'win') {
      sound.playWin();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      const nextMult = HIGH_LOW_STREAK_MULTIPLIERS[Math.min(nextStreak - 1, HIGH_LOW_STREAK_MULTIPLIERS.length - 1)];
      const nextPay = Math.round(initialBet * nextMult);
      setStatusMessage(`Correct! Streak: ${nextStreak} 🔥 (${nextMult}x = ${formatINR(nextPay)})`);
    } else {
      sound.playLoss();
      setIsPlaying(false);
      setStreak(0);
      setStatusMessage(`Bust! Next card was ${nextCard.name}. Round ended.`);
    }
  };

  const handleCashOut = () => {
    if (!isPlaying || streak === 0) return;

    sound.playJackpot();
    confetti({ particleCount: 70, spread: 70 });

    const updated = addToWallet(
      wallet,
      currentPotentialPayout,
      'High-Low',
      `Cashed out ${currentMultiplier}x on ${streak} streak (+${formatINR(currentPotentialPayout)})!`
    );

    onUpdateWallet(updated);
    setIsPlaying(false);
    setStatusMessage(`Cashed out successfully! +${formatINR(currentPotentialPayout)} added to wallet.`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>🃏</span>
              <span>OwO High-Low Cards</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Streak Multipliers
              </span>
            </h2>
            <p className="text-xs text-slate-400">Guess if the next card is higher or lower. Cash out anytime!</p>
          </div>

          {isPlaying && (
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-semibold">Current Value:</span>
              <span className="text-base font-extrabold font-mono text-emerald-400">
                {formatINR(currentPotentialPayout)} ({currentMultiplier}x)
              </span>
            </div>
          )}
        </div>

        {/* Card Stage */}
        <div className="py-8 flex flex-col items-center justify-center">
          {/* Card Presentation */}
          <div className="w-36 h-52 sm:w-44 sm:h-64 rounded-2xl bg-white border-4 border-slate-200 shadow-2xl flex flex-col justify-between p-4 text-slate-900 select-none transition-transform hover:scale-105">
            <div className="flex items-center justify-between">
              <span
                className={`text-2xl font-black ${
                  currentCard.suit === '♥' || currentCard.suit === '♦' ? 'text-rose-600' : 'text-slate-950'
                }`}
              >
                {currentCard.name === '10' ? '10' : currentCard.name.charAt(0)}
              </span>
              <span
                className={`text-xl ${
                  currentCard.suit === '♥' || currentCard.suit === '♦' ? 'text-rose-600' : 'text-slate-950'
                }`}
              >
                {currentCard.suit}
              </span>
            </div>

            <div
              className={`text-6xl text-center self-center ${
                currentCard.suit === '♥' || currentCard.suit === '♦' ? 'text-rose-600' : 'text-slate-950'
              }`}
            >
              {currentCard.suit}
            </div>

            <div className="flex items-center justify-between rotate-180">
              <span
                className={`text-2xl font-black ${
                  currentCard.suit === '♥' || currentCard.suit === '♦' ? 'text-rose-600' : 'text-slate-950'
                }`}
              >
                {currentCard.name === '10' ? '10' : currentCard.name.charAt(0)}
              </span>
              <span
                className={`text-xl ${
                  currentCard.suit === '♥' || currentCard.suit === '♦' ? 'text-rose-600' : 'text-slate-950'
                }`}
              >
                {currentCard.suit}
              </span>
            </div>
          </div>

          {/* Status Message */}
          <div className="mt-5 text-center">
            <p className="text-sm font-semibold text-slate-300">{statusMessage}</p>
          </div>

          {/* Previous Cards History */}
          {previousCards.length > 0 && (
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
              <span>History:</span>
              {previousCards.map((c, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-slate-300"
                >
                  {c.name} {c.suit}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Multiplier Progress Bar */}
        <div className="mb-6 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
            <span>Multiplier Ladder:</span>
            <span className="text-amber-400 font-bold">{streak} Streak Hits</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center text-xs font-mono">
            {HIGH_LOW_STREAK_MULTIPLIERS.map((mult, idx) => {
              const isPassed = streak > idx;
              const isCurrent = streak === idx + 1;
              return (
                <div
                  key={idx}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 font-black border-amber-300 shadow-md'
                      : isPassed
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : 'bg-slate-900/60 text-slate-500 border-slate-800'
                  }`}
                >
                  {mult}x
                </div>
              );
            })}
          </div>
        </div>

        {/* Insufficient Funds Warning */}
        {wallet.balanceINR < initialBet && !isPlaying && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Need funds to play? Claim your daily bonus or enter secret codes!
              </span>
            </div>
            <button
              onClick={onOpenRedeem}
              className="px-2.5 py-1 text-xs font-bold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors shrink-0"
            >
              Redeem
            </button>
          </div>
        )}

        {/* Controls */}
        {!isPlaying ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="hlBetInput" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Initial Round Bet (₹ INR)
                </label>
                <span className="text-xs text-slate-400">
                  Wallet: <strong className="text-amber-400 font-mono">{formatINR(wallet.balanceINR)}</strong>
                </span>
              </div>
              <input
                id="hlBetInput"
                type="number"
                min={50}
                max={wallet.balanceINR || 1000000}
                step={50}
                value={initialBet}
                onChange={(e) => setInitialBet(Math.max(10, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-base focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="button"
              disabled={wallet.balanceINR < initialBet || initialBet <= 0}
              onClick={startRound}
              className={`w-full py-4 rounded-xl font-extrabold text-base tracking-wide flex items-center justify-center gap-2 shadow-xl transition-all ${
                wallet.balanceINR < initialBet
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-cyan-600/30 active:scale-[0.99]'
              }`}
            >
              START HIGH-LOW ROUND ({formatINR(initialBet)})
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleGuess('higher')}
                className="py-3.5 px-4 rounded-xl font-extrabold text-base bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <ArrowUp className="w-5 h-5" />
                <span>HIGHER</span>
              </button>

              <button
                type="button"
                onClick={() => handleGuess('lower')}
                className="py-3.5 px-4 rounded-xl font-extrabold text-base bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <ArrowDown className="w-5 h-5" />
                <span>LOWER</span>
              </button>
            </div>

            {streak > 0 && (
              <button
                type="button"
                onClick={handleCashOut}
                className="w-full py-3 rounded-xl font-black text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all animate-pulse"
              >
                <Banknote className="w-4 h-4" />
                <span>CASH OUT {formatINR(currentPotentialPayout)} ({currentMultiplier}x)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
