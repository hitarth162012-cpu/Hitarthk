import React, { useState } from 'react';
import { UserAccount, WalletState } from '../types';
import { formatJoules, formatINR } from '../utils/economy';
import { isUserDeveloper } from '../utils/customCodeService';
import { sound } from '../utils/audioSynth';
import {
  User,
  Shield,
  Coins,
  Zap,
  Flame,
  Award,
  Crown,
  Trophy,
  Swords,
  Crosshair,
  Briefcase,
  Copy,
  Check,
  Ticket,
  LogOut,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: UserAccount | null;
  wallet: WalletState;
  onUpdateAccount?: (newAccount: UserAccount) => void;
  onOpenRedeemModal?: () => void;
  onOpenDevCodeModal?: () => void;
}

const STARTER_AVATARS = ['👑', '⚡', '🐯', '💎', '🐉', '🦊', '🎯', '🚀', '⚔️', '🦅', '🔥', '🌟'];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  account,
  wallet,
  onUpdateAccount,
  onOpenRedeemModal,
  onOpenDevCodeModal,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(account?.inGameName || 'Hitarth');
  const [selectedAvatar, setSelectedAvatar] = useState(account?.avatar || '👑');

  if (!isOpen) return null;

  // Strict Developer Check: Hitarth OWO-9850
  const isDev =
    account?.id === 'OWO-9850' &&
    (account?.inGameName.toLowerCase() === 'hitarth' || account?.isDeveloper === true);

  const playerId = account?.id || 'OWO-9850';
  const playerName = account?.inGameName || 'Hitarth';
  const playerAvatar = account?.avatar || '👑';

  const equippedPet = wallet.pets?.find((p) => p.id === wallet.equippedPetId) || wallet.pets?.[0];
  const teamPets = (wallet.pets || []).filter((p) => wallet.teamPetIds?.includes(p.id));

  // XP & Level calculations
  const playerLevel = wallet.level || 1;
  const playerXP = wallet.xp || 0;
  const xpForNextLevel = playerLevel * 500;
  const currentLevelProgress = playerXP % 500;
  const progressPercent = Math.min(100, Math.round((currentLevelProgress / 500) * 100));

  const handleCopyId = () => {
    navigator.clipboard.writeText(playerId);
    setCopiedId(true);
    sound.playCoin();
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveProfile = () => {
    if (!nameInput.trim()) return;
    const cleanName = nameInput.trim();
    if (onUpdateAccount && account) {
      const updated: UserAccount = {
        ...account,
        inGameName: cleanName,
        avatar: selectedAvatar,
      };
      onUpdateAccount(updated);
      sound.playJackpot();
    }
    setIsEditingName(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl my-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 font-sans max-h-[92vh] flex flex-col">
        
        {/* Banner Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-amber-950/60 via-slate-900 to-purple-950/60 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                PLAYER PROFILE CARD
              </span>
              {isDev ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono flex items-center gap-1">
                  👑 DEVELOPER • HITARTH (OWO-9850)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                  PLAYER
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>

          {/* User Bio Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20 text-white font-black border-2 border-slate-800">
                  {playerAvatar}
                </div>
                {account?.isCloudSynced && (
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center"
                    title="Cloud Synced to Firebase Firestore"
                  >
                    <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white tracking-tight">{playerName}</h3>
                  <button
                    onClick={() => setIsEditingName(!isEditingName)}
                    className="text-xs text-slate-400 hover:text-amber-400 underline font-medium"
                  >
                    {isEditingName ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="font-mono font-bold text-amber-300">ID: {playerId}</span>
                  <button
                    onClick={handleCopyId}
                    className="p-1 hover:text-white rounded transition"
                    title="Copy Player ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-slate-600">•</span>
                  <span className="text-emerald-400 font-semibold">Online</span>
                </div>
              </div>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              {/* Shortcut for Code */}
              {onOpenRedeemModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRedeemModal();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title="Redeem Secret Promo Code"
                >
                  <Ticket className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                  <span>Redeem Code</span>
                </button>
              )}

              {/* Developer Code Vault Shortcut (ONLY Hitarth OWO-9850) */}
              {isDev && onOpenDevCodeModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDevCodeModal();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/50 text-purple-200 font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title="Developer Code Vault & Generator"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Code Vault</span>
                </button>
              )}
            </div>
          </div>

          {/* Inline Edit Form */}
          {isEditingName && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-700 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="In-Game Name..."
                  className="flex-1 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white outline-none focus:border-amber-400"
                />
                <button
                  onClick={handleSaveProfile}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold"
                >
                  Save
                </button>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                {STARTER_AVATARS.map((av) => (
                  <button
                    key={av}
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center border transition ${
                      selectedAvatar === av ? 'border-amber-400 bg-amber-500/20 scale-110' : 'border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content: Money, EXP, Stats, Pets, Inventory */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* SECTION 1: MONEY & VIRTUAL CURRENCY */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>MONEY & VIRTUAL JOULES</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 shadow-md">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Current Joules (₹)
                </span>
                <span className="text-lg font-black font-mono text-amber-300">
                  {formatJoules(wallet.balanceINR)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  100% free virtual play credits
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-md">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Won (₹)
                </span>
                <span className="text-base font-extrabold font-mono text-emerald-400">
                  +{formatINR(wallet.totalWonINR)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">From Minigames & Duels</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-md">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Lost (₹)
                </span>
                <span className="text-base font-extrabold font-mono text-rose-400">
                  -{formatINR(wallet.totalLostINR)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Wagered stake losses</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: EXPERIENCE (EXP) & LEVEL PROGRESS */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <div>
                  <h4 className="text-sm font-extrabold text-white">Level {playerLevel} Contender</h4>
                  <p className="text-[11px] text-slate-400">
                    Earn EXP through work shifts, hunting expeditions, and pet battles.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-amber-400">
                  {playerXP} Total XP
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {500 - currentLevelProgress} XP to Level {playerLevel + 1}
                </span>
              </div>
            </div>

            {/* EXP Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Progress: {progressPercent}%</span>
              <span>Level {playerLevel + 1} Threshold: {xpForNextLevel} XP</span>
            </div>
          </div>

          {/* SECTION 3: GAMEPLAY STATS SUMMARY */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>CAREER GAMEPLAY STATS</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Coin Flips</span>
                <span className="font-extrabold text-white">{wallet.stats?.flipsWon || 0} / {wallet.stats?.flipsPlayed || 0} Won</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Slot Spins</span>
                <span className="font-extrabold text-white">{wallet.stats?.slotsSpun || 0} ({wallet.stats?.slotsJackpots || 0} Hits)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Hunts & Safari</span>
                <span className="font-extrabold text-amber-300">{wallet.stats?.huntsCount || (wallet.pets?.length || 1)} Expeditions</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Boss Battles</span>
                <span className="font-extrabold text-indigo-300">{wallet.stats?.battlesWon || 0} Victories</span>
              </div>
            </div>
          </div>

          {/* SECTION 4: EQUIPPED BEAST & SQUAD TEAM */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-emerald-400" />
              <span>CREATURE SQUAD & ACTIVE COMPANION</span>
            </h4>
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              {equippedPet && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{equippedPet.emoji}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs sm:text-sm text-white">{equippedPet.name}</span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                          {equippedPet.rarity}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {equippedPet.biome || 'Wild Habitat'} • Level {equippedPet.level || 1}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    ⚡ {equippedPet.power} PWR
                  </span>
                </div>
              )}

              {/* Squad Formation */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  3-Pet Battle Squad ({teamPets.length}/3 selected):
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {teamPets.map((pet) => (
                    <div
                      key={pet.id}
                      className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-1.5 truncate"
                    >
                      <span className="text-lg">{pet.emoji}</span>
                      <div className="truncate">
                        <span className="font-bold text-[11px] block truncate text-slate-200">{pet.name}</span>
                        <span className="text-[10px] text-slate-500">{pet.power} PWR</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: INVENTORY GEAR */}
          {wallet.inventory && wallet.inventory.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                <span>SAFARI GEAR & INVENTORY</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {wallet.inventory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div className="truncate">
                      <span className="font-bold text-xs text-white block truncate">{item.name}</span>
                      <span className="text-[10px] text-amber-400 font-mono">Owned: {item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Firebase Firestore Persistent Session</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
