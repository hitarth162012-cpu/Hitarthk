import React, { useState } from 'react';
import { WalletState, UserAccount } from '../../types';
import { formatJoules, formatINR } from '../../utils/economy';
import { redeemCustomGameCode, isUserDeveloper } from '../../utils/customCodeService';
import { sound } from '../../utils/audioSynth';
import confetti from 'canvas-confetti';
import { KeyRound, Sparkles, CheckCircle2, AlertCircle, Copy, Check, Lock, Crown } from 'lucide-react';

interface RedeemCodeSectionProps {
  wallet: WalletState;
  account: UserAccount | null;
  onUpdateWallet: (newWallet: WalletState) => void;
  onOpenDeveloperCodeModal?: () => void;
}

export const RedeemCodeSection: React.FC<RedeemCodeSectionProps> = ({
  wallet,
  account,
  onUpdateWallet,
  onOpenDeveloperCodeModal,
}) => {
  const [code, setCode] = useState<string>('');
  const [feedback, setFeedback] = useState<{ success: boolean; msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDev = isUserDeveloper(account);

  const handleRedeem = async (codeToRedeem?: string) => {
    const targetCode = (codeToRedeem || code).trim();
    if (!targetCode) return;

    setIsSubmitting(true);
    setFeedback(null);

    const res = await redeemCustomGameCode(targetCode, account, wallet);
    setIsSubmitting(false);

    if (res.success && res.updatedWallet) {
      sound.playJackpot();
      if (typeof window !== 'undefined') {
        try {
          confetti({
            particleCount: 140,
            spread: 85,
            origin: { y: 0.5 },
          });
        } catch {
          // fallback
        }
      }
      setFeedback({ success: true, msg: res.message });
      onUpdateWallet(res.updatedWallet);
      setCode('');
    } else {
      sound.playLoss();
      setFeedback({ success: false, msg: res.message });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Secret Code Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-xl">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Redeem Secret Creator & Promo Codes</h2>
            <p className="text-xs text-slate-400">
              Type your secret code below to unlock direct Joules (₹) and companion rewards into your wallet.
            </p>
          </div>
        </div>

        {/* Input & Action */}
        <div className="pt-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              placeholder="Enter secret code here..."
              className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-base uppercase placeholder:normal-case placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              disabled={isSubmitting || !code.trim()}
              onClick={() => handleRedeem()}
              className="px-6 py-3 rounded-xl text-sm font-extrabold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
            >
              {isSubmitting ? 'Verifying...' : 'Redeem'}
            </button>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center gap-2 animate-in fade-in duration-200 ${
                feedback.success
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                  : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
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

        {/* Developer Secret Code Vault Trigger (VISIBLE ONLY TO DEVELOPER) */}
        {isDev && onOpenDeveloperCodeModal && (
          <div className="pt-6 border-t border-slate-800/80 mt-6">
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">👑</span>
                  <span className="text-sm font-bold text-purple-200">Developer Code Generator & Vault</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    DEV ONLY
                  </span>
                </div>
                <p className="text-xs text-purple-300/80 mt-0.5">
                  Generate, edit and manage custom secret codes. Codes are hidden from public players.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenDeveloperCodeModal}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-md transition active:scale-95 whitespace-nowrap self-start sm:self-auto"
              >
                Open Vault
              </button>
            </div>
          </div>
        )}

        <div className="pt-4 text-center text-[11px] text-slate-500">
          Codes can be redeemed once per player account • Virtual play credits only
        </div>
      </div>
    </div>
  );
};
