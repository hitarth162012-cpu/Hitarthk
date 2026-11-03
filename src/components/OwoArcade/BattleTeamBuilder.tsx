import React from 'react';
import { PetAnimal, WalletState } from '../../types';
import { sound } from '../../utils/audioSynth';
import { formatINR } from '../../utils/economy';
import { Shield, Zap, Swords, Plus, Trash2, Check, Sparkles } from 'lucide-react';

interface BattleTeamBuilderProps {
  wallet: WalletState;
  onUpdateWallet: (newWallet: WalletState) => void;
  onProceedToBattle?: () => void;
}

export const BattleTeamBuilder: React.FC<BattleTeamBuilderProps> = ({
  wallet,
  onUpdateWallet,
  onProceedToBattle,
}) => {
  const currentTeam = wallet.pets.filter((p) => (wallet.teamPetIds || []).includes(p.id));
  const maxTeamSize = 3;

  const totalTeamPower = currentTeam.reduce((sum, p) => sum + p.power, 0);
  const totalTeamHp = 300 + currentTeam.reduce((sum, p) => sum + p.power * 2, 0);

  const handleTogglePet = (petId: string) => {
    sound.playSlotTick();
    const existing = wallet.teamPetIds || [];
    if (existing.includes(petId)) {
      // Cannot remove last pet
      if (existing.length <= 1) {
        return;
      }
      onUpdateWallet({
        ...wallet,
        teamPetIds: existing.filter((id) => id !== petId),
      });
    } else {
      if (existing.length >= maxTeamSize) {
        // Replace last slot
        const replaced = [...existing.slice(0, maxTeamSize - 1), petId];
        onUpdateWallet({
          ...wallet,
          teamPetIds: replaced,
        });
      } else {
        onUpdateWallet({
          ...wallet,
          teamPetIds: [...existing, petId],
        });
      }
    }
  };

  const slotLabels = [
    { title: 'Leader (Vanguard)', role: 'Core Attacker', icon: '⚔️' },
    { title: 'Flanker (Assault)', role: 'Critical Strikes', icon: '⚡' },
    { title: 'Mystic (Support)', role: 'Defense & HP Guard', icon: '🛡️' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>🛡️</span>
              <span>Battle Team Squad</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {currentTeam.length}/{maxTeamSize} Chosen
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Select up to 3 animal companions from your Zoo to fight bosses and duel friends online!
            </p>
          </div>

          {/* Quick Team Stats Pill */}
          <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 self-start sm:self-auto font-mono text-xs">
            <div>
              <span className="text-slate-400 text-[10px] block">TEAM POWER</span>
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                {totalTeamPower} PWR
              </span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400 text-[10px] block">SQUAD HP</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 fill-emerald-400" />
                {totalTeamHp} HP
              </span>
            </div>
          </div>
        </div>

        {/* 3 Active Team Slots */}
        <div className="py-6">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
            Active Battle Formation
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((slotIdx) => {
              const pet = currentTeam[slotIdx];
              const slotMeta = slotLabels[slotIdx];
              return (
                <div
                  key={slotIdx}
                  className={`p-4 rounded-xl border-2 flex flex-col justify-between min-h-[140px] transition-all relative ${
                    pet
                      ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border-cyan-500/50 shadow-lg'
                      : 'bg-slate-950/50 border-dashed border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-slate-300 flex items-center gap-1">
                      <span>{slotMeta.icon}</span> {slotMeta.title}
                    </span>
                    <span className="text-[10px] text-cyan-400/80 font-mono">Slot {slotIdx + 1}</span>
                  </div>

                  {pet ? (
                    <div className="flex items-center gap-3 my-2">
                      <span className="text-4xl">{pet.emoji}</span>
                      <div>
                        <div className="font-extrabold text-sm text-white">{pet.name}</div>
                        <div className="text-xs text-amber-400 font-mono font-semibold">
                          ⚡ {pet.power} PWR • {pet.rarity.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
                      <Plus className="w-5 h-5 text-slate-600" />
                      <span>Assign from Zoo Below</span>
                    </div>
                  )}

                  {pet && currentTeam.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleTogglePet(pet.id)}
                      className="self-end text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 pt-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {onProceedToBattle && (
          <button
            type="button"
            onClick={onProceedToBattle}
            className="w-full py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Swords className="w-4 h-4" />
            <span>ENTER BATTLE WITH THIS TEAM</span>
          </button>
        )}
      </div>

      {/* Available Zoo Pets Roster */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🐾</span>
            <span>Your Zoo Animals ({wallet.pets.length})</span>
          </h3>
          <span className="text-xs text-slate-400">Tap any pet to add or swap into your team</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
          {wallet.pets.map((p) => {
            const isInTeam = (wallet.teamPetIds || []).includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleTogglePet(p.id)}
                className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all ${
                  isInTeam
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/40'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">{p.emoji}</span>
                  <div>
                    <div className="font-bold text-xs text-white">{p.name}</div>
                    <div className="text-[11px] text-amber-400 font-mono">⚡ {p.power} Power</div>
                  </div>
                </div>

                {isInTeam ? (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black flex items-center gap-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                    IN TEAM
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                    + ADD
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
