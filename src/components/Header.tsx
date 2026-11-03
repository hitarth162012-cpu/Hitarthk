import React from 'react';
import { formatINR, formatJoules } from '../utils/economy';
import { Coins, Volume2, VolumeX, KeyRound, Sparkles, Gamepad2, Trophy, User, Crown, Terminal, Ticket } from 'lucide-react';
import { UserAccount } from '../types';

interface HeaderProps {
  balanceINR: number;
  account: UserAccount | null;
  onOpenWallet: () => void;
  onOpenRedeem: () => void;
  onOpenLeaderboard?: () => void;
  onOpenProfile: () => void;
  onOpenDevCodeModal?: () => void;
  onOpenDevStudio?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  balanceINR,
  account,
  onOpenWallet,
  onOpenRedeem,
  onOpenLeaderboard,
  onOpenProfile,
  onOpenDevCodeModal,
  onOpenDevStudio,
  isMuted,
  onToggleMute,
}) => {
  // Strict Developer check: Hitarth OWO-9850
  const isDev =
    account?.id === 'OWO-9850' &&
    (account?.inGameName.toLowerCase() === 'hitarth' || account?.isDeveloper === true);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 py-2.5 sm:py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-black text-lg sm:text-xl shrink-0">
            🪙
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-amber-400 via-rose-300 to-amber-200 bg-clip-text text-transparent">
                HITARTH
              </span>
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono">
                ⚡ Joules (₹)
              </span>
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-mono hidden md:inline-flex">
                Real-Time Online
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              OwO Indian Rupee Minigames, 1v1 PvP Duels & Live Game Bot
            </p>
          </div>
        </div>

        {/* Right Actions: Virtual Wallet, Profile & Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Account Profile Badge (Clicking icon opens full profile) */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            title="Click to view full player profile with Money, EXP, Stats & Pets"
          >
            <span className="text-base sm:text-lg">{account?.avatar || '👑'}</span>
            <span className="hidden sm:inline font-bold">{account?.inGameName || 'Hitarth'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono hidden md:inline">
              {account?.id || 'OWO-9850'}
            </span>
            {isDev && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                DEV
              </span>
            )}
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Online Firebase Sync" />
          </button>

          {/* Leaderboard shortcut (SEPARATE SECTION) */}
          {onOpenLeaderboard && (
            <button
              onClick={onOpenLeaderboard}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Separate Global Leaderboard"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>
          )}

          {/* Quick Shortcut for Code */}
          <button
            onClick={onOpenRedeem}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Redeem Secret Promo Code"
          >
            <Ticket className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="hidden sm:inline">Redeem Code</span>
          </button>

          {/* Developer Code Vault Shortcut (ONLY Hitarth OWO-9850) */}
          {isDev && onOpenDevCodeModal && (
            <button
              onClick={onOpenDevCodeModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/50 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
              title="Developer Secret Code Vault & Generator"
            >
              <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="hidden md:inline">Code Vault</span>
            </button>
          )}

          {/* Virtual Wallet INR / Joules Pill */}
          <button
            onClick={onOpenWallet}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border border-amber-500/40 hover:border-amber-400 text-amber-300 shadow-md shadow-amber-950/40 transition-all hover:scale-105 active:scale-95 group cursor-pointer"
            aria-label="View Virtual Wallet"
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              <Coins className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <span className="text-[9px] sm:text-[10px] text-slate-400 block leading-tight font-medium">Virtual Wallet</span>
              <span className="text-xs sm:text-sm font-extrabold font-mono tracking-tight text-amber-300 group-hover:text-amber-200">
                {formatINR(balanceINR)}
              </span>
            </div>
          </button>

          {/* Mute Audio Toggle */}
          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
