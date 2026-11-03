import React, { useState } from 'react';
import { WalletState, UserAccount } from '../types';
import { redeemCustomGameCode, isUserDeveloper } from '../utils/customCodeService';
import { sound } from '../utils/audioSynth';
import confetti from 'canvas-confetti';

interface RedeemCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletState;
  onUpdateWallet: (newWallet: WalletState) => void;
  account: UserAccount | null;
  onOpenDeveloperCodeModal?: () => void;
}

export const RedeemCodeModal: React.FC<RedeemCodeModalProps> = ({
  isOpen,
  onClose,
  wallet,
  onUpdateWallet,
  account,
  onOpenDeveloperCodeModal,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [feedback, setFeedback] = useState<{ success: boolean; msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDev = isUserDeveloper(account);

  if (!isOpen) return null;

  const handleRedeem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputCode.trim();
    if (!clean) return;

    setIsSubmitting(true);
    setFeedback(null);

    const res = await redeemCustomGameCode(clean, account, wallet);
    setIsSubmitting(false);

    if (res.success && res.updatedWallet) {
      sound.playJackpot();
      if (typeof window !== 'undefined') {
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.5 },
          });
        } catch {
          // fallback
        }
      }
      setFeedback({ success: true, msg: res.message });
      onUpdateWallet(res.updatedWallet);
      setInputCode('');
    } else {
      sound.playLoss();
      setFeedback({ success: false, msg: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md my-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-lg shadow-inner">
              🎟️
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Redeem Game Code
              </h3>
              <p className="text-xs text-slate-400">
                Claim Joules, XP bonuses & companion beasts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Feedback alert */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 ${
                feedback.success
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}
            >
              <span className="text-base shrink-0">{feedback.success ? '🎉' : '⚠️'}</span>
              <p className="flex-1 leading-snug">{feedback.msg}</p>
            </div>
          )}

          <form onSubmit={handleRedeem} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Secret Game Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Enter secret code here..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 text-base text-white font-mono uppercase tracking-wider outline-none placeholder-slate-500 shadow-inner"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Enter any official creator code to receive instant virtual play credits.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !inputCode.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95"
            >
              {isSubmitting ? 'Verifying Code...' : '⚡ Redeem Rewards'}
            </button>
          </form>

          {/* Developer Access Button (ONLY visible to developer) */}
          {isDev && onOpenDeveloperCodeModal && (
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDeveloperCodeModal();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <span>👑</span>
                <span>Developer Code Vault & Generator</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">ADMIN</span>
              </button>
            </div>
          )}

          <div className="text-center text-[11px] text-slate-400">
            Codes can be redeemed once per player account. Joules are 100% free virtual play credits.
          </div>
        </div>

      </div>
    </div>
  );
};
