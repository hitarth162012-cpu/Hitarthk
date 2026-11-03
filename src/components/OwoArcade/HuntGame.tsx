import React, { useState } from 'react';
import { PetAnimal, WalletState } from '../../types';
import { BIOMES, formatINR, performHunt, subtractFromWallet, addToWallet } from '../../utils/economy';
import { sound } from '../../utils/audioSynth';
import confetti from 'canvas-confetti';
import { Compass, Sparkles, Shield, DollarSign, Check, AlertTriangle } from 'lucide-react';

interface HuntGameProps {
  wallet: WalletState;
  onUpdateWallet: (newWallet: WalletState) => void;
  onOpenRedeem: () => void;
}

export const HuntGame: React.FC<HuntGameProps> = ({ wallet, onUpdateWallet, onOpenRedeem }) => {
  const [selectedBiome, setSelectedBiome] = useState<string>(BIOMES[0].name);
  const [isHunting, setIsHunting] = useState<boolean>(false);
  const [caughtPet, setCaughtPet] = useState<PetAnimal | null>(null);
  const [activeTab, setActiveTab] = useState<'hunt' | 'zoo'>('hunt');

  const huntCostINR = 200;

  const handleHunt = () => {
    if (isHunting) return;
    if (wallet.balanceINR < huntCostINR) {
      sound.playLoss();
      return;
    }

    const sub = subtractFromWallet(wallet, huntCostINR, 'Animal Hunt', `Safari expedition in ${selectedBiome}`);
    if (!sub.success) return;

    setIsHunting(true);
    setCaughtPet(null);
    sound.playSlotTick();

    setTimeout(() => {
      const pet = performHunt(selectedBiome);
      setIsHunting(false);
      setCaughtPet(pet);

      sound.playCatch();
      if (pet.rarity === 'epic' || pet.rarity === 'mythic') {
        confetti({ particleCount: 100, spread: 80 });
      }

      const updated: WalletState = {
        ...sub.updatedWallet,
        pets: [pet, ...sub.updatedWallet.pets],
        stats: {
          ...sub.updatedWallet.stats,
          huntsCount: sub.updatedWallet.stats.huntsCount + 1,
        },
      };

      onUpdateWallet(updated);
    }, 1200);
  };

  const handleSellPet = (pet: PetAnimal) => {
    sound.playWin();
    const remainingPets = wallet.pets.filter((p) => p.id !== pet.id);
    const updated = addToWallet(
      wallet,
      pet.valueINR,
      'Pet Market',
      `Sold ${pet.emoji} ${pet.name} for ${formatINR(pet.valueINR)}!`,
      'hunt_sell'
    );

    onUpdateWallet({
      ...updated,
      pets: remainingPets,
      equippedPetId: wallet.equippedPetId === pet.id ? remainingPets[0]?.id : wallet.equippedPetId,
    });
  };

  const handleEquipPet = (petId: string) => {
    sound.playSlotTick();
    onUpdateWallet({
      ...wallet,
      equippedPetId: petId,
    });
  };

  const getRarityBadge = (rarity: PetAnimal['rarity']) => {
    const colors = {
      common: 'bg-slate-800 text-slate-300 border-slate-700',
      uncommon: 'bg-emerald-950 text-emerald-300 border-emerald-800',
      rare: 'bg-blue-950 text-blue-300 border-blue-800',
      epic: 'bg-purple-950 text-purple-300 border-purple-800',
      legendary: 'bg-amber-950 text-amber-300 border-amber-600',
      mythic: 'bg-amber-950 text-amber-300 border-amber-500 animate-pulse',
    };
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${colors[rarity]}`}>
        {rarity}
      </span>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>🏹</span>
              <span>OwO Animal Hunt</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Collect & Sell for ₹
              </span>
            </h2>
            <p className="text-xs text-slate-400">Hunt mythical beasts across Indian biomes or view your zoo collection!</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('hunt')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'hunt'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Expedition
            </button>
            <button
              onClick={() => setActiveTab('zoo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'zoo'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>My Zoo</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-emerald-300 font-mono text-[10px]">
                {wallet.pets.length}
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'hunt' ? (
          <div className="space-y-6 py-4">
            {/* Biome Selection */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Select Safari Biome
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BIOMES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    disabled={isHunting}
                    onClick={() => {
                      sound.playSlotTick();
                      setSelectedBiome(b.name);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                      selectedBiome === b.name
                        ? 'border-emerald-400 bg-gradient-to-r from-emerald-950/60 to-slate-900 shadow-lg shadow-emerald-950/50'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm text-white">{b.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{b.desc}</div>
                    {selectedBiome === b.name && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Hunting Arena Visual */}
            <div className="py-8 flex flex-col items-center justify-center rounded-2xl bg-slate-950 border border-slate-800/80 relative overflow-hidden">
              <div className="text-center">
                {isHunting ? (
                  <div className="space-y-3">
                    <div className="text-5xl animate-bounce">🌿 🐾 🌿</div>
                    <p className="text-sm font-bold text-emerald-400">Tracking wildlife in {selectedBiome}...</p>
                  </div>
                ) : caughtPet ? (
                  <div className="space-y-3 animate-in zoom-in-95 duration-200">
                    <div className="text-6xl">{caughtPet.emoji}</div>
                    <div>
                      <div className="text-lg font-black text-white">{caughtPet.name}</div>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        {getRarityBadge(caughtPet.rarity)}
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-cyan-400" />
                          Power {caughtPet.power}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          Value: {formatINR(caughtPet.valueINR)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-slate-400">
                    <div className="text-5xl">🏕️</div>
                    <p className="text-xs">Ready to explore. Tap Hunt to track wildlife!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Insufficient Funds Warning */}
            {wallet.balanceINR < huntCostINR && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Need safari pass funds? Claim your daily bonus or redeem secret codes!
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

            {/* Action */}
            <button
              type="button"
              disabled={isHunting || wallet.balanceINR < huntCostINR}
              onClick={handleHunt}
              className={`w-full py-4 rounded-xl font-extrabold text-base tracking-wide flex items-center justify-center gap-2 shadow-xl transition-all ${
                isHunting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : wallet.balanceINR < huntCostINR
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30 active:scale-[0.99]'
              }`}
            >
              {isHunting ? 'Hunting Wildlife...' : `HUNT IN ${selectedBiome.toUpperCase()} (${formatINR(huntCostINR)})`}
            </button>
          </div>
        ) : (
          /* Zoo Tab */
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Your Animal Companions ({wallet.pets.length})</span>
              <span>Total Zoo Value: <strong className="text-amber-400 font-mono">{formatINR(wallet.pets.reduce((acc, p) => acc + p.valueINR, 0))}</strong></span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {wallet.pets.map((pet) => {
                const isEquipped = wallet.equippedPetId === pet.id;
                return (
                  <div
                    key={pet.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      isEquipped
                        ? 'bg-emerald-950/30 border-emerald-500/50'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl sm:text-4xl">{pet.emoji}</div>
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          {pet.name}
                          {isEquipped && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-bold">
                              EQUIPPED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {getRarityBadge(pet.rarity)}
                          <span className="text-[11px] text-slate-400">⚡ {pet.power} PWR</span>
                        </div>
                        <div className="text-xs font-mono font-bold text-amber-400 mt-1">
                          {formatINR(pet.valueINR)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {!isEquipped && (
                        <button
                          onClick={() => handleEquipPet(pet.id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        >
                          Equip
                        </button>
                      )}
                      <button
                        onClick={() => handleSellPet(pet)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1"
                      >
                        <DollarSign className="w-3 h-3" />
                        <span>Sell</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
