import React, { useState, useEffect } from 'react';
import { PetAnimal, WalletState, UserAccount, CloudBattleRecord } from '../../types';
import { MONSTERS, MonsterBoss, formatINR, addToWallet } from '../../utils/economy';
import { sound } from '../../utils/audioSynth';
import {
  recordBattleToFirestore,
  subscribeUserBattles,
  saveWalletToFirestore,
} from '../../services/firebaseService';
import confetti from 'canvas-confetti';
import {
  Swords,
  Shield,
  Zap,
  Trophy,
  Skull,
  Users,
  ArrowRight,
  Cloud,
  History,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface BattleGameProps {
  wallet: WalletState;
  account?: UserAccount | null;
  onUpdateWallet: (newWallet: WalletState) => void;
  onOpenTeamBuilder: () => void;
  onOpenRedeem: () => void;
}

export const BattleGame: React.FC<BattleGameProps> = ({
  wallet,
  account,
  onUpdateWallet,
  onOpenTeamBuilder,
  onOpenRedeem,
}) => {
  // Get active team pets
  const teamPets: PetAnimal[] = wallet.pets.filter((p) =>
    (wallet.teamPetIds || []).includes(p.id)
  );
  const activeTeam = teamPets.length > 0 ? teamPets : [wallet.pets[0]];

  const totalTeamPower = activeTeam.reduce((sum, p) => sum + p.power, 0);
  const totalTeamMaxHp = 300 + activeTeam.reduce((sum, p) => sum + p.power * 2, 0);

  const [selectedMonster, setSelectedMonster] = useState<MonsterBoss>(MONSTERS[0]);
  const [inBattle, setInBattle] = useState<boolean>(false);
  const [playerHp, setPlayerHp] = useState<number>(totalTeamMaxHp);
  const [playerMaxHp, setPlayerMaxHp] = useState<number>(totalTeamMaxHp);
  const [monsterHp, setMonsterHp] = useState<number>(MONSTERS[0].maxHp);
  const [isParrying, setIsParrying] = useState<boolean>(false);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [battleResult, setBattleResult] = useState<'victory' | 'defeat' | null>(null);

  // Cloud battle history
  const [cloudBattles, setCloudBattles] = useState<CloudBattleRecord[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const userId = account?.uid || account?.id || 'guest_local';
  const playerName = account?.inGameName || 'PlayerSquad';

  // Subscribe to real Firestore battles
  useEffect(() => {
    const unsub = subscribeUserBattles(userId, (battles) => {
      setCloudBattles(battles);
    }, 10);
    return () => unsub();
  }, [userId]);

  const startBattle = (monster: MonsterBoss) => {
    setSelectedMonster(monster);
    const maxHp = 300 + activeTeam.reduce((sum, p) => sum + p.power * 2, 0);
    setPlayerMaxHp(maxHp);
    setPlayerHp(maxHp);
    setMonsterHp(monster.maxHp);
    setIsParrying(false);
    setBattleResult(null);

    const teamNames = activeTeam.map((p) => `${p.emoji} ${p.name}`).join(', ');
    setBattleLog([
      `Battle commenced against ${monster.name}! Your squad [${teamNames}] entered the arena with ${totalTeamPower} combined power!`,
    ]);
    setInBattle(true);
    sound.playSlotTick();
  };

  const handlePlayerAction = (action: 'attack' | 'parry' | 'ultimate', petIdx: number = 0) => {
    if (!inBattle || battleResult) return;

    const actingPet = activeTeam[petIdx % activeTeam.length];
    let playerDamage = 0;
    let logMessage = '';

    if (action === 'attack') {
      playerDamage = Math.floor(35 + Math.random() * 25 + totalTeamPower * 0.4);
      sound.playAttack(false);
      logMessage = `${actingPet.emoji} ${actingPet.name} led a squad charge against ${selectedMonster.name} for ${playerDamage} damage!`;
    } else if (action === 'ultimate') {
      playerDamage = Math.floor(70 + Math.random() * 50 + totalTeamPower * 1.3);
      sound.playAttack(true);
      logMessage = `⚡ ULTIMATE STRIKE! ${actingPet.emoji} ${actingPet.name} channeled team synergy for ${playerDamage} CRITICAL damage!`;
    } else {
      setIsParrying(true);
      sound.playSlotTick();
      logMessage = `🛡️ Squad raised a combined defensive bulwark! Incoming damage reduced by 70%.`;
    }

    const newMonsterHp = Math.max(0, monsterHp - playerDamage);
    setMonsterHp(newMonsterHp);

    if (newMonsterHp <= 0) {
      sound.playJackpot();
      confetti({ particleCount: 120, spread: 80 });
      setBattleResult('victory');
      setBattleLog((prev) => [
        `🏆 VICTORY! Your pet team defeated ${selectedMonster.name} and claimed ${formatINR(selectedMonster.rewardINR)}!`,
        logMessage,
        ...prev,
      ]);

      const updated = addToWallet(
        wallet,
        selectedMonster.rewardINR,
        'OwO Battle',
        `Squad victory over ${selectedMonster.name} (+${formatINR(selectedMonster.rewardINR)})!`,
        'battle_reward'
      );

      const nextWallet: WalletState = {
        ...updated,
        stats: {
          ...updated.stats,
          battlesWon: (updated.stats.battlesWon || 0) + 1,
        },
      };

      onUpdateWallet(nextWallet);

      // Persist battle record to Firestore
      recordBattleToFirestore(userId, {
        type: 'boss',
        playerName,
        opponentName: selectedMonster.name,
        result: 'win',
        rewardINR: selectedMonster.rewardINR,
        petsUsed: activeTeam.map((p) => p.id),
      });

      // Sync wallet & stats to Firestore
      if (account) {
        saveWalletToFirestore(userId, nextWallet, account);
      }
      return;
    }

    // Monster counter-attack
    setTimeout(() => {
      const baseMonsterDmg = Math.floor(selectedMonster.attackPower * (0.8 + Math.random() * 0.4));
      const actualDmg = action === 'parry' ? Math.floor(baseMonsterDmg * 0.3) : baseMonsterDmg;
      const newPlayerHp = Math.max(0, playerHp - actualDmg);
      setPlayerHp(newPlayerHp);

      const monsterLog = `${selectedMonster.avatar} ${selectedMonster.name} attacked your squad for ${actualDmg} damage${
        action === 'parry' ? ' (shielded by team!)' : ''
      }!`;

      if (newPlayerHp <= 0) {
        sound.playLoss();
        setBattleResult('defeat');
        setBattleLog((prev) => [
          `💀 DEFEAT! Your pet squad was exhausted by ${selectedMonster.name}.`,
          monsterLog,
          logMessage,
          ...prev,
        ]);

        // Persist defeat record to Firestore
        recordBattleToFirestore(userId, {
          type: 'boss',
          playerName,
          opponentName: selectedMonster.name,
          result: 'loss',
          rewardINR: 0,
          petsUsed: activeTeam.map((p) => p.id),
        });
      } else {
        setBattleLog((prev) => [monsterLog, logMessage, ...prev]);
      }
    }, 400);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header & Cloud Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 font-bold">
                <Swords className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">OwO Boss Battle Arena</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/40 flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                <span>Firestore Cloud</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Field your 3-animal squad to defeat fearsome mythical beasts and claim huge Indian Rupee rewards!
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>{showHistory ? 'Hide History' : 'Cloud Battle History'}</span>
            </button>
            <button
              onClick={onOpenTeamBuilder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Change Squad ({activeTeam.length}/3)</span>
            </button>
          </div>
        </div>

        {/* Persistent Cloud Battles History View */}
        {showHistory && (
          <div className="my-5 p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                <span>Firestore Persisted Battle Records ({cloudBattles.length})</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">Live synced across devices</span>
            </div>

            {cloudBattles.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2 text-center">
                No battles recorded yet in Firestore. Defeat a boss to save your first cloud victory!
              </p>
            ) : (
              <div className="divide-y divide-slate-800/80 max-h-48 overflow-y-auto">
                {cloudBattles.map((b) => (
                  <div key={b.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                          b.result === 'win'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {b.result.toUpperCase()}
                      </span>
                      <span className="font-bold text-white">vs {b.opponentName}</span>
                      <span className="text-slate-500 text-[10px]">({b.type.toUpperCase()})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-amber-300">
                        {b.rewardINR > 0 ? `+${formatINR(b.rewardINR)}` : '₹0'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Squad Preview Card */}
        <div className="mt-5 p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {activeTeam.map((pet, idx) => (
                <div
                  key={pet.id + idx}
                  className="w-10 h-10 rounded-xl bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-xl shadow"
                  title={`${pet.name} (Power: ${pet.power})`}
                >
                  {pet.emoji}
                </div>
              ))}
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Your Squad: {activeTeam.map((p) => p.name).join(', ')}
              </span>
              <span className="text-[11px] text-slate-400">
                Squad Power: <strong className="text-amber-400">{totalTeamPower}</strong> • Base HP: <strong className="text-emerald-400">{totalTeamMaxHp}</strong>
              </span>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Total Battles Won: <strong className="text-amber-400">{wallet.stats.battlesWon || 0}</strong>
          </div>
        </div>

        {/* Boss Selection / Arena State */}
        {!inBattle ? (
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Choose Boss Encounter
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MONSTERS.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMonster(m)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedMonster.id === m.id
                      ? 'bg-rose-950/40 border-rose-500/80 shadow-lg shadow-rose-950/50 scale-[1.02]'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{m.avatar}</span>
                    <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                      Reward: {formatINR(m.rewardINR)}
                    </span>
                  </div>
                  <div className="mt-2 font-bold text-white text-base">{m.name}</div>
                  <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs font-mono text-slate-300">
                    <span>❤️ {m.maxHp} HP</span>
                    <span>⚔️ {m.attackPower} ATK</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => startBattle(selectedMonster)}
              className="w-full py-4 rounded-xl font-black text-sm bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-xl shadow-rose-950/60 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Swords className="w-5 h-5" />
              <span>Engage {selectedMonster.name} (Reward: {formatINR(selectedMonster.rewardINR)})</span>
            </button>
          </div>
        ) : (
          /* Active Combat Arena */
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Squad HP */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>🐾 Your Squad HP</span>
                  <span className="font-mono text-emerald-400">
                    {playerHp} / {playerMaxHp}
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.max(0, (playerHp / playerMaxHp) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {activeTeam.map((p) => (
                    <span key={p.id} className="text-base" title={p.name}>
                      {p.emoji}
                    </span>
                  ))}
                  <span>Squad ready for orders</span>
                </div>
              </div>

              {/* Boss HP */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>{selectedMonster.avatar} {selectedMonster.name}</span>
                  <span className="font-mono text-rose-400">
                    {monsterHp} / {selectedMonster.maxHp}
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${Math.max(0, (monsterHp / selectedMonster.maxHp) * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Reward on defeat: <span className="text-amber-300">{formatINR(selectedMonster.rewardINR)}</span>
                </div>
              </div>
            </div>

            {/* Combat Actions */}
            {!battleResult ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => handlePlayerAction('attack')}
                    className="py-3.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-2 shadow-lg shadow-rose-950/60 active:scale-95 transition-all cursor-pointer"
                  >
                    <Swords className="w-4 h-4" />
                    <span>Squad Attack</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlayerAction('parry')}
                    className="py-3.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-2 border border-slate-700 active:scale-95 transition-all cursor-pointer"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Defend & Parry</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlayerAction('ultimate')}
                    className="py-3.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-2 shadow-lg shadow-amber-950/60 active:scale-95 transition-all cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>Team Ultimate</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
                <div className="text-base font-extrabold text-white">
                  {battleResult === 'victory' ? '🎉 SQUAD VICTORY!' : '💀 SQUAD WAS DEFEATED!'}
                </div>
                <div className="text-xs text-emerald-400 font-mono flex items-center justify-center gap-1">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Battle outcome successfully recorded to Firebase Firestore</span>
                </div>
                <button
                  onClick={() => setInBattle(false)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                >
                  Return to Boss Selection
                </button>
              </div>
            )}

            {/* Combat Log */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 max-h-40 overflow-y-auto text-xs font-mono">
              {battleLog.map((log, i) => (
                <div key={i} className={i === 0 ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
