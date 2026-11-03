import React, { useState, useEffect } from 'react';
import { WalletState, LeaderboardEntry, ArcadeSubTab, UserAccount } from '../../types';
import { formatINR } from '../../utils/economy';
import {
  subscribeGlobalLeaderboard,
  updateCloudLeaderboard,
  FirestoreLeaderboardEntry,
} from '../../services/firebaseService';
import { sound } from '../../utils/audioSynth';
import {
  Trophy,
  Crown,
  Medal,
  Sparkles,
  Flame,
  ArrowUpRight,
  Edit2,
  Check,
  RefreshCw,
  Coins,
  Shield,
  Zap,
  Cloud,
  Users,
  Award,
} from 'lucide-react';

interface LeaderboardProps {
  wallet: WalletState;
  account?: UserAccount | null;
  onNavigateTab: (tab: ArcadeSubTab) => void;
  onOpenAuth?: () => void;
}

const AVATAR_OPTIONS = ['⚡', '👑', '🐯', '💎', '🐉', '🦊', '🎯', '🚀', '⚔️', '🦅', '🔥', '🌟'];

export const Leaderboard: React.FC<LeaderboardProps> = ({
  wallet,
  account,
  onNavigateTab,
  onOpenAuth,
}) => {
  const [cloudEntries, setCloudEntries] = useState<FirestoreLeaderboardEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Total accumulated wealth for the current player
  const currentAccumulatedINR = Math.max(wallet.balanceINR, wallet.totalWonINR);
  const userIdentifier = account?.uid || account?.id || 'guest_local';
  const userName = account?.inGameName || 'You (Player)';
  const userAvatar = account?.avatar || '⚡';

  // Real-time Firestore subscription to global leaderboard
  useEffect(() => {
    const unsubscribe = subscribeGlobalLeaderboard((entries) => {
      setCloudEntries(entries);
    }, 20);

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync current player to Firestore whenever balance or stats change
  const syncCurrentUserToCloud = async () => {
    setIsSyncing(true);
    sound.playSlotSpin();

    try {
      const entry: FirestoreLeaderboardEntry = {
        userId: userIdentifier,
        inGameName: userName,
        playerId: account?.id || `OWO-${Math.floor(1000 + Math.random() * 9000)}`,
        avatar: userAvatar,
        balanceINR: currentAccumulatedINR,
        bossWins: wallet.stats.battlesWon || 0,
        pvpWins: wallet.stats.multiplayerDuelsWon || 0,
        updatedAt: new Date().toISOString(),
      };

      await updateCloudLeaderboard(userIdentifier, entry);
      sound.playJackpot();
      setSyncSuccessMsg('Your INR Net Worth is synced live to Firebase Firestore!');
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to sync leaderboard:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Real Firestore players ONLY - no fake accounts
  const combinedMap = new Map<string, FirestoreLeaderboardEntry>();

  // Only real players from Firestore
  cloudEntries.forEach((c) => combinedMap.set(c.userId, c));

  // Ensure current user's latest local or cloud balance is reflected
  const currentLeaderboardItem: FirestoreLeaderboardEntry = {
    userId: userIdentifier,
    inGameName: userName,
    playerId: account?.id || 'OWO-YOU',
    avatar: userAvatar,
    balanceINR: currentAccumulatedINR,
    bossWins: wallet.stats.battlesWon || 0,
    pvpWins: wallet.stats.multiplayerDuelsWon || 0,
    updatedAt: new Date().toISOString(),
  };
  combinedMap.set(userIdentifier, currentLeaderboardItem);

  // Sort descending by balanceINR
  const allRanked = Array.from(combinedMap.values()).sort(
    (a, b) => b.balanceINR - a.balanceINR
  );

  const top10 = allRanked.slice(0, 10);
  const userRankIndex = allRanked.findIndex((e) => e.userId === userIdentifier);
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : 11;
  const rank10Balance = top10[9]?.balanceINR || 20000;
  const deficitToTop10 = Math.max(0, rank10Balance - currentAccumulatedINR + 500);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/70 via-slate-900 to-indigo-950/70 border border-amber-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Firebase Firestore Global Cloud Leaderboard</span>
              <span className="text-slate-400">•</span>
              <span className="text-amber-200">Real-Time Sync</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              Top 10 Global Indian Rupee Leaderboard
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl">
              Ranked live across all players by <strong className="text-amber-300">Total Accumulated INR Balance</strong> on Google Firebase Firestore.
              Play minigames, hunt mythic beasts, conquer boss battles, and outduel friends to claim the #1 spot!
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <div className="text-center px-3 border-r border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Your Rank</span>
              <span
                className={`text-xl font-black font-mono ${
                  userRank <= 3 ? 'text-amber-400' : userRank <= 10 ? 'text-emerald-400' : 'text-slate-300'
                }`}
              >
                #{userRank > 0 ? userRank : '11+'}
              </span>
            </div>
            <div className="text-center px-3">
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Your Net Wealth</span>
              <span className="text-xl font-black font-mono text-amber-300">
                {formatINR(currentAccumulatedINR)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Status & Sync Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl">
            {userAvatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm sm:text-base">{userName}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                {account?.id || 'OWO-YOU'}
              </span>
              {account?.isCloudSynced ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  <span>Cloud Active</span>
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                  Local Guest
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 block">
              Boss Wins: <strong className="text-amber-300">{wallet.stats.battlesWon || 0}</strong> • PvP Wins: <strong className="text-indigo-300">{wallet.stats.multiplayerDuelsWon || 0}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {syncSuccessMsg && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>{syncSuccessMsg}</span>
            </span>
          )}

          <button
            onClick={syncCurrentUserToCloud}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Rank to Cloud'}</span>
          </button>

          {!account?.isCloudSynced && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Podium Display (Top 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* 2nd Place */}
        {top10[1] && (
          <div
            className={`order-2 md:order-1 rounded-2xl p-5 border flex flex-col justify-between transition-all ${
              top10[1].userId === userIdentifier
                ? 'bg-gradient-to-b from-slate-900 via-amber-950/40 to-slate-900 border-amber-400 shadow-xl shadow-amber-500/10 scale-102 ring-2 ring-amber-400'
                : 'bg-slate-900/80 border-slate-700/60 hover:border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-9 h-9 rounded-xl bg-slate-700 text-white font-black text-sm flex items-center justify-center shadow">
                  🥈 #2
                </span>
                <span className="text-xs font-bold text-slate-400">Runner Up</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-3xl">{top10[1].avatar}</div>
                <div>
                  <div className="font-extrabold text-white text-base flex items-center gap-1.5">
                    <span>{top10[1].inGameName}</span>
                    {top10[1].userId === userIdentifier && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 block font-mono">{top10[1].playerId}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Net Accumulated</span>
              <span className="font-mono font-black text-slate-200 text-base">
                {formatINR(top10[1].balanceINR)}
              </span>
            </div>
          </div>
        )}

        {/* 1st Place - The Crown */}
        {top10[0] && (
          <div
            className={`order-1 md:order-2 rounded-2xl p-6 border flex flex-col justify-between relative overflow-hidden transition-all ${
              top10[0].userId === userIdentifier
                ? 'bg-gradient-to-b from-amber-950/90 via-slate-900 to-amber-950/80 border-amber-400 shadow-2xl shadow-amber-500/20 ring-2 ring-amber-400 scale-105'
                : 'bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40 shadow-xl'
            }`}
          >
            <div className="absolute top-2 right-2">
              <Crown className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black text-base flex items-center justify-center shadow-lg shadow-amber-500/40">
                  👑 #1
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  REIGNING CHAMPION
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-4xl">{top10[0].avatar}</div>
                <div>
                  <div className="font-extrabold text-white text-lg flex items-center gap-1.5">
                    <span>{top10[0].inGameName}</span>
                    {top10[0].userId === userIdentifier && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black animate-bounce">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-amber-300 font-semibold block font-mono">
                    {top10[0].playerId}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-amber-500/30 flex items-center justify-between">
              <span className="text-xs text-amber-300/80 font-medium">Champion Balance</span>
              <span className="font-mono font-black text-amber-300 text-xl">
                {formatINR(top10[0].balanceINR)}
              </span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {top10[2] && (
          <div
            className={`order-3 md:order-3 rounded-2xl p-5 border flex flex-col justify-between transition-all ${
              top10[2].userId === userIdentifier
                ? 'bg-gradient-to-b from-slate-900 via-amber-950/40 to-slate-900 border-amber-400 shadow-xl shadow-amber-500/10 scale-102 ring-2 ring-amber-400'
                : 'bg-slate-900/80 border-slate-700/60 hover:border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-9 h-9 rounded-xl bg-amber-800 text-amber-100 font-black text-sm flex items-center justify-center shadow">
                  🥉 #3
                </span>
                <span className="text-xs font-bold text-amber-600">Bronze Podium</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-3xl">{top10[2].avatar}</div>
                <div>
                  <div className="font-extrabold text-white text-base flex items-center gap-1.5">
                    <span>{top10[2].inGameName}</span>
                    {top10[2].userId === userIdentifier && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 block font-mono">{top10[2].playerId}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Net Accumulated</span>
              <span className="font-mono font-black text-amber-200 text-base">
                {formatINR(top10[2].balanceINR)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Ranks 4 to 10 Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-amber-400" />
            <h3 className="font-black text-white text-base">Top 4 – 10 Global Contenders</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">10 Ranked Spots</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {top10.slice(3).map((entry, idx) => {
            const rank = idx + 4;
            const isUser = entry.userId === userIdentifier;
            return (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-3.5 sm:p-4 transition-all ${
                  isUser
                    ? 'bg-amber-500/15 border-l-4 border-amber-400 font-bold'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                {/* Left: Rank & User */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs sm:text-sm ${
                      isUser
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    #{rank}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xl sm:text-2xl">{entry.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm sm:text-base font-bold ${
                            isUser ? 'text-amber-300' : 'text-white'
                          }`}
                        >
                          {entry.inGameName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          {entry.playerId}
                        </span>
                        {isUser && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>Boss Victories: <strong className="text-amber-400">{entry.bossWins || 0}</strong></span>
                        <span>•</span>
                        <span>PvP Duels: <strong className="text-indigo-400">{entry.pvpWins || 0}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Balance & Status */}
                <div className="text-right">
                  <div className="font-mono font-extrabold text-sm sm:text-base text-amber-300">
                    {formatINR(entry.balanceINR)}
                  </div>
                  <span className="text-[10px] text-emerald-400 block font-mono flex items-center justify-end gap-1">
                    <Cloud className="w-3 h-3" />
                    <span>Firestore Cloud</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky User Standing & Deficit Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
              <h4 className="font-extrabold text-white text-base sm:text-lg">
                Your Competitive Standing
              </h4>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono ${
                  userRank <= 10
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                Rank #{userRank > 0 ? userRank : '11+'}
              </span>
            </div>

            {userRank === 1 ? (
              <p className="text-sm text-emerald-300">
                🎉 Magnificent! You are the <strong className="text-white">#1 Rupee Emperor</strong> on the Firestore Global Leaderboard! Defend your reign against all challengers.
              </p>
            ) : userRank <= 10 ? (
              <p className="text-sm text-slate-300">
                You are currently in the <strong className="text-amber-300">Top 10 Global Hall of Fame</strong>! Climb into the Top 3 Podium to cement your legacy!
              </p>
            ) : (
              <p className="text-sm text-slate-300">
                You are currently at <strong className="text-white">Rank #{userRank}</strong>.
                You need <strong className="text-amber-300">{formatINR(deficitToTop10)} more</strong> to enter the Top 10 Hall of Fame!
              </p>
            )}
          </div>

          {/* Quick CTAs to jump directly into minigames */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                sound.playSlotTick();
                onNavigateTab('slots');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all hover:scale-105 cursor-pointer"
            >
              <span>🎰</span>
              <span>Slots (70% Loss)</span>
            </button>
            <button
              onClick={() => {
                sound.playSlotTick();
                onNavigateTab('flip');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all hover:scale-105 cursor-pointer"
            >
              <span>🪙</span>
              <span>Flip (50/50)</span>
            </button>
            <button
              onClick={() => {
                sound.playSlotTick();
                onNavigateTab('battle');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all hover:scale-105 cursor-pointer"
            >
              <span>⚔️</span>
              <span>Boss Battle</span>
            </button>
            <button
              onClick={() => {
                sound.playSlotTick();
                onNavigateTab('redeem');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition-all cursor-pointer"
            >
              <span>🎟️</span>
              <span>Redeem Code</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
