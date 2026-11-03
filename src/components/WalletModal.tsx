import React, { useState } from 'react';
import { WalletState } from '../types';
import { formatINR, redeemCode, addToWallet } from '../utils/economy';
import { sound } from '../utils/audioSynth';
import confetti from 'canvas-confetti';
import {
  X,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  KeyRound,
  Gift,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletState;
  onUpdateWallet: (newWallet: WalletState) => void;
  initialCode?: string;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  wallet,
  onUpdateWallet,
  initialCode = '',
}) => {
  const [inputCode, setInputCode] = useState(initialCode);
  const [feedback, setFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleRedeem = (codeToUse?: string) => {
    const code = codeToUse || inputCode;
    const { updatedWallet, result } = redeemCode(wallet, code);

    if (result.success) {
      sound.playJackpot();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      setFeedback({ success: true, msg: result.message });
      onUpdateWallet(updatedWallet);
      setInputCode('');
    } else {
      sound.playLoss();
      setFeedback({ success: false, msg: result.message });
    }
  };

  const handleClaimDaily = () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (wallet.lastDailyReward && now - wallet.lastDailyReward < oneDay) {
      setFeedback({
        success: false,
        msg: 'Daily reward already claimed today! Check back tomorrow or redeem a secret code.',
      });
      return;
    }

    sound.playWin();
    confetti({ particleCount: 50, spread: 60 });
    const updated = addToWallet(wallet, 2000, 'Daily Login', 'Claimed daily reward bonus (+₹2,000)!', 'daily');
    const withDate = { ...updated, lastDailyReward: now };
    onUpdateWallet(withDate);
    setFeedback({ success: true, msg: 'Claimed daily reward bonus of ₹2,000 INR!' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Virtual INR Wallet
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono">
                  Indian Rupees (₹)
                </span>
              </h2>
              <p className="text-xs text-slate-400">Used for OwO arcade betting, rewards, and 1080p AI video generation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close wallet modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Balance Card */}
          <div className="relative p-6 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400/80 font-semibold">Current Balance</span>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-amber-300 mt-1">
                  {formatINR(wallet.balanceINR)}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Total Won: <span className="text-emerald-400 font-mono">{formatINR(wallet.totalWonINR)}</span> | Lost:{' '}
                  <span className="text-rose-400 font-mono">{formatINR(wallet.totalLostINR)}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleClaimDaily}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/50 transition-transform active:scale-95"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Claim Daily ₹2,000</span>
                </button>
              </div>
            </div>
          </div>

          {/* Secret / Promo Code Section */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="walletCodeInput" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Redeem Secret Code
              </label>
              <span className="text-[11px] text-slate-500">Case-insensitive</span>
            </div>

            <div className="flex gap-2">
              <input
                id="walletCodeInput"
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                placeholder="Enter secret promo code..."
                className="flex-1 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400 transition-colors"
              />
              <button
                onClick={() => handleRedeem()}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all hover:shadow-lg hover:shadow-amber-500/20 active:scale-95"
              >
                Redeem
              </button>
            </div>

            {feedback && (
              <div
                className={`flex items-center gap-2 text-xs p-2.5 rounded-lg border ${
                  feedback.success
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                    : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
                }`}
              >
                {feedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{feedback.msg}</span>
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Transaction History
              </h3>
              <span className="text-xs text-slate-500">{wallet.transactions.length} entries</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {wallet.transactions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800/60">
                  No transactions yet. Start playing games or redeem code!
                </div>
              ) : (
                wallet.transactions.map((tx) => {
                  const isPositive = tx.amount >= 0;
                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isPositive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200">{tx.game}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">{tx.note}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-bold font-mono text-sm ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? `+${formatINR(tx.amount)}` : formatINR(tx.amount)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
