import React, { useState } from 'react';
import { WalletState } from '../../types';
import { formatINR, playCoinFlip, subtractFromWallet, addToWallet } from '../../utils/economy';
import { sound } from '../../utils/audioSynth';
import confetti from 'canvas-confetti';
import { Coins, Sparkles, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';

interface CoinFlipGameProps {
  wallet: WalletState;
  onUpdateWallet: (newWallet: WalletState) => void;
  onOpenRedeem: () => void;
}

export const CoinFlipGame: React.FC<CoinFlipGameProps> = ({ wallet, onUpdateWallet, onOpenRedeem }) => {
  const [betAmount, setBetAmount] = useState<number>(500);
  const [chosenSide, setChosenSide] = useState<'heads' | 'tails'>('heads');
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<{
    side: 'heads' | 'tails';
    isWin: boolean;
    payout: number;
  } | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [flipDegree, setFlipDegree] = useState<number>(0);

  const quickBets = [100, 500, 1000, 5000, 10000];

  const handleFlip = () => {
    if (isFlipping) return;

    if (wallet.balanceINR < betAmount) {
      sound.playLoss();
      return;
    }

    const sub = subtractFromWallet(wallet, betAmount, 'Coin Flip', `Bet on ${chosenSide.toUpperCase()}`);
    if (!sub.success) return;

    setIsFlipping(true);
    setLastResult(null);
    sound.playCoinFlip();

    // Determine outcome
    const outcome = playCoinFlip(betAmount, chosenSide);

    // Compute rotation degrees (heads ends at 0 or 720, tails ends at 180 or 900)
    const baseRotations = 1800; // 5 full spins
    const targetDeg = flipDegree + baseRotations + (outcome.resultSide === 'tails' ? 180 : 0);
    setFlipDegree(targetDeg);

    setTimeout(() => {
      setIsFlipping(false);
      setLastResult({
        side: outcome.resultSide,
        isWin: outcome.isWin,
        payout: outcome.payoutINR,
      });

      let updated = sub.updatedWallet;
      if (outcome.isWin) {
        sound.playWin();
        confetti({ particleCount: 40, spread: 60 });
        setStreak((s) => s + 1);
        updated = addToWallet(updated, outcome.payoutINR, 'Coin Flip', `Won ${formatINR(outcome.payoutINR)} on ${outcome.resultSide.toUpperCase()}!`);
      } else {
        sound.playLoss();
        setStreak(0);
      }

      // Update stats
      updated = {
        ...updated,
        stats: {
          ...updated.stats,
          flipsPlayed: updated.stats.flipsPlayed + 1,
          flipsWon: outcome.isWin ? updated.stats.flipsWon + 1 : updated.stats.flipsWon,
        },
      };

      onUpdateWallet(updated);
    }, 1200);
  };

  const handleAllIn = () => {
    if (wallet.balanceINR > 0) {
      setBetAmount(wallet.balanceINR);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Game Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Title */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>🪙</span>
              <span>OwO Coin Flip</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                2.0x Payout
              </span>
            </h2>
            <p className="text-xs text-slate-400">Pick Heads or Tails, place your ₹ INR bet, and test your luck!</p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Streak:</span>
            <span className="font-bold text-amber-400">{streak} 🔥</span>
          </div>
        </div>

        {/* 3D Coin Visual */}
        <div className="py-10 flex flex-col items-center justify-center">
          <div
            className="w-40 h-40 relative select-none"
            style={{ perspective: '1000px' }}
          >
            <div
              className="w-full h-full relative rounded-full transition-transform duration-1000 ease-out shadow-2xl"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateY(${flipDegree}deg)`,
              }}
            >
              {/* Heads Face (Front) */}
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border-4 border-yellow-300 flex flex-col items-center justify-center text-slate-950 shadow-inner"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <span className="text-3xl font-black">₹</span>
                <span className="text-xs font-black tracking-widest uppercase mt-0.5">HEADS</span>
                <span className="text-[10px] font-bold text-amber-900">BHARAT</span>
              </div>

              {/* Tails Face (Back) */}
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-700 via-amber-500 to-yellow-300 border-4 border-yellow-400 flex flex-col items-center justify-center text-slate-950 shadow-inner"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <span className="text-2xl font-black">🪙</span>
                <span className="text-xs font-black tracking-widest uppercase mt-1">TAILS</span>
                <span className="text-[10px] font-bold text-amber-950">RUPEES</span>
              </div>
            </div>
          </div>

          {/* Outcome Message */}
          <div className="h-10 mt-6 flex items-center justify-center">
            {lastResult && !isFlipping && (
              <div
                className={`text-sm sm:text-base font-bold px-4 py-1.5 rounded-xl border animate-in zoom-in-95 duration-150 ${
                  lastResult.isWin
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                }`}
              >
                {lastResult.isWin
                  ? `🎉 WON! Landed on ${lastResult.side.toUpperCase()} (+${formatINR(lastResult.payout)})`
                  : `💀 Landed on ${lastResult.side.toUpperCase()}. Lost ${formatINR(betAmount)}`}
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
                Need more INR to bet? Claim your daily bonus or redeem secret codes!
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
        <div className="space-y-4">
          {/* Side Picker */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Choose Side
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isFlipping}
                onClick={() => {
                  sound.playSlotTick();
                  setChosenSide('heads');
                }}
                className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  chosenSide === 'heads'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="text-lg">₹</span>
                <span>HEADS</span>
              </button>

              <button
                type="button"
                disabled={isFlipping}
                onClick={() => {
                  sound.playSlotTick();
                  setChosenSide('tails');
                }}
                className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  chosenSide === 'tails'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="text-lg">🪙</span>
                <span>TAILS</span>
              </button>
            </div>
          </div>

          {/* Bet Input & Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="flipBetInput" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Bet Amount (₹ INR)
              </label>
              <span className="text-xs text-slate-400">
                Wallet: <strong className="text-amber-400 font-mono">{formatINR(wallet.balanceINR)}</strong>
              </span>
            </div>

            <div className="flex gap-2">
              <input
                id="flipBetInput"
                type="number"
                min={10}
                max={wallet.balanceINR || 1000000}
                step={50}
                value={betAmount}
                disabled={isFlipping}
                onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 0))}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-base focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={handleAllIn}
                disabled={isFlipping || wallet.balanceINR <= 0}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                ALL IN
              </button>
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-2 mt-2.5">
              {quickBets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={isFlipping}
                  onClick={() => {
                    sound.playSlotTick();
                    setBetAmount(amt);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    betAmount === amt
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  +{formatINR(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Flip Action Button */}
          <button
            type="button"
            disabled={isFlipping || wallet.balanceINR < betAmount || betAmount <= 0}
            onClick={handleFlip}
            className={`w-full py-4 rounded-xl font-extrabold text-base tracking-wide flex items-center justify-center gap-2 shadow-xl transition-all ${
              isFlipping
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : wallet.balanceINR < betAmount
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isFlipping ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-slate-500 border-t-amber-400 rounded-full animate-spin" />
                Flipping Coin...
              </span>
            ) : (
              <span>FLIP COIN FOR {formatINR(betAmount * 2)}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
