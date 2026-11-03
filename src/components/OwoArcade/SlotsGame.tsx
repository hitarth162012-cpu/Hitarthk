import React, { useState, useEffect } from 'react';
import { WalletState } from '../../types';
import {
  formatINR,
  playSlots,
  SLOT_SYMBOLS,
  SlotSymbol,
  subtractFromWallet,
  addToWallet,
} from '../../utils/economy';
import { sound } from '../../utils/audioSynth';
import confetti from 'canvas-confetti';
import { Sparkles, Zap, Trophy, AlertTriangle } from 'lucide-react';

interface SlotsGameProps {
  wallet: WalletState;
  onUpdateWallet: (newWallet: WalletState) => void;
  onOpenRedeem: () => void;
}

export const SlotsGame: React.FC<SlotsGameProps> = ({ wallet, onUpdateWallet, onOpenRedeem }) => {
  const [betAmount, setBetAmount] = useState<number>(250);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [reels, setReels] = useState<[SlotSymbol, SlotSymbol, SlotSymbol]>([
    SLOT_SYMBOLS[0],
    SLOT_SYMBOLS[1],
    SLOT_SYMBOLS[2],
  ]);
  const [spinResult, setSpinResult] = useState<{
    payout: number;
    multiplier: number;
    isWin: boolean;
    isJackpot: boolean;
  } | null>(null);

  const quickBets = [100, 250, 500, 1000, 2500, 5000];

  const handleSpin = () => {
    if (isSpinning) return;
    if (wallet.balanceINR < betAmount) {
      sound.playLoss();
      return;
    }

    const sub = subtractFromWallet(wallet, betAmount, 'Slots', `Spin bet ${formatINR(betAmount)}`);
    if (!sub.success) return;

    setIsSpinning(true);
    setSpinResult(null);

    // Audio tickers
    let tickCount = 0;
    const ticker = setInterval(() => {
      sound.playSlotTick();
      // randomize display during spin
      setReels([
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
      ]);
      tickCount++;
      if (tickCount > 12) clearInterval(ticker);
    }, 90);

    setTimeout(() => {
      clearInterval(ticker);
      const outcome = playSlots(betAmount);
      setReels(outcome.reels);
      setIsSpinning(false);
      setSpinResult({
        payout: outcome.payoutINR,
        multiplier: outcome.multiplier,
        isWin: outcome.isWin,
        isJackpot: outcome.isJackpot,
      });

      let updated = sub.updatedWallet;
      if (outcome.isWin) {
        if (outcome.isJackpot) {
          sound.playJackpot();
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
        } else {
          sound.playWin();
          confetti({ particleCount: 50, spread: 60 });
        }
        updated = addToWallet(
          updated,
          outcome.payoutINR,
          'Slots',
          `${outcome.isJackpot ? '🎰 JACKPOT' : 'Slot Win'} ${outcome.multiplier}x (+${formatINR(outcome.payoutINR)})!`
        );
      } else {
        sound.playLoss();
      }

      updated = {
        ...updated,
        stats: {
          ...updated.stats,
          slotsSpun: updated.stats.slotsSpun + 1,
          slotsJackpots: outcome.isJackpot ? updated.stats.slotsJackpots + 1 : updated.stats.slotsJackpots,
        },
      };

      onUpdateWallet(updated);
    }, 1300);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>🎰</span>
              <span>OwO Lucky Slots</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Up to 50x Jackpot
              </span>
            </h2>
            <p className="text-xs text-slate-400">Match 3 symbols for massive multipliers, or 2 for a cash return!</p>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Jackpots:</span>
            <span className="font-bold text-amber-400">{wallet.stats.slotsJackpots}</span>
          </div>
        </div>

        {/* Slot Reels Container */}
        <div className="py-8">
          <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-purple-500/40 shadow-2xl relative">
            {/* Payline Marker Lines */}
            <div className="absolute top-1/2 -left-2 -right-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent pointer-events-none opacity-80" />

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {reels.map((sym, idx) => (
                <div
                  key={idx}
                  className={`h-32 sm:h-40 rounded-xl bg-slate-950/80 border-2 flex flex-col items-center justify-center relative overflow-hidden shadow-inner transition-all ${
                    isSpinning
                      ? 'border-cyan-500/50 animate-pulse'
                      : spinResult?.isWin
                      ? 'border-amber-400 shadow-amber-500/20'
                      : 'border-slate-800'
                  }`}
                >
                  <span
                    className={`text-5xl sm:text-6xl transition-transform ${
                      isSpinning ? 'scale-90 blur-[1px]' : 'scale-100'
                    }`}
                  >
                    {sym.emoji}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 mt-2 tracking-wide font-mono">
                    {sym.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Result Banner */}
          <div className="h-12 mt-4 flex items-center justify-center">
            {spinResult && !isSpinning && (
              <div
                className={`text-sm sm:text-base font-black px-5 py-2 rounded-xl border animate-in zoom-in-95 duration-150 flex items-center gap-2 ${
                  spinResult.isJackpot
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-xl shadow-amber-500/40'
                    : spinResult.isWin
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                {spinResult.isJackpot && <span>👑</span>}
                {spinResult.isWin
                  ? `WINNER! ${spinResult.multiplier}x Multiplier (+${formatINR(spinResult.payout)})`
                  : `No match. Try another spin!`}
              </div>
            )}
          </div>
        </div>

        {/* Insufficient Funds Warning */}
        {wallet.balanceINR < betAmount && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Not enough INR? Claim your daily ₹2,000 bonus or redeem secret codes!
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

        {/* Bet & Spin Controls */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="slotBetInput" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Spin Bet (₹ INR)
              </label>
              <span className="text-xs text-slate-400">
                Wallet: <strong className="text-amber-400 font-mono">{formatINR(wallet.balanceINR)}</strong>
              </span>
            </div>

            <div className="flex gap-2">
              <input
                id="slotBetInput"
                type="number"
                min={50}
                max={wallet.balanceINR || 1000000}
                step={50}
                value={betAmount}
                disabled={isSpinning}
                onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 0))}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-base focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Quick Bet Chips */}
            <div className="flex flex-wrap gap-2 mt-2.5">
              {quickBets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => {
                    sound.playSlotTick();
                    setBetAmount(amt);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    betAmount === amt
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  +{formatINR(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Spin Button */}
          <button
            type="button"
            disabled={isSpinning || wallet.balanceINR < betAmount || betAmount <= 0}
            onClick={handleSpin}
            className={`w-full py-4 rounded-xl font-extrabold text-base tracking-wide flex items-center justify-center gap-2 shadow-xl transition-all ${
              isSpinning
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : wallet.balanceINR < betAmount
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white shadow-purple-600/30 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isSpinning ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Spinning Reels...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                SPIN REELS ({formatINR(betAmount)})
              </span>
            )}
          </button>
        </div>

        {/* Payout Table Drawer */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <div className="text-xs font-bold text-slate-400 mb-2">Payout Multipliers (3 of a kind):</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
            {SLOT_SYMBOLS.map((s) => (
              <div key={s.id} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-xl">{s.emoji}</div>
                <div className="font-bold text-amber-400 font-mono mt-1">{s.payout3x}x</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 text-center">
            Matching any 2 symbols returns 1.8x payout.
          </div>
        </div>
      </div>
    </div>
  );
};
