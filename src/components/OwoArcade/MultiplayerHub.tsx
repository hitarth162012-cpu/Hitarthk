import React, { useState, useEffect, useCallback } from 'react';
import { MultiplayerPlayer, MultiplayerRoom, PetAnimal, WalletState } from '../../types';
import { multiplayer } from '../../utils/multiplayerEngine';
import { formatINR, subtractFromWallet, addToWallet } from '../../utils/economy';
import { sound } from '../../utils/audioSynth';
import confetti from 'canvas-confetti';
import {
  Users,
  Swords,
  Coins,
  Copy,
  Check,
  RotateCcw,
  Zap,
  Shield,
  Trophy,
  AlertTriangle,
  ArrowRight,
  Globe,
  Share2,
  Sparkles,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { recordBattleToFirestore } from '../../services/firebaseService';
import { UserAccount } from '../../types';

interface MultiplayerHubProps {
  wallet: WalletState;
  account?: UserAccount | null;
  onUpdateWallet: (newWallet: WalletState) => void;
  onOpenRedeem: () => void;
}

export const MultiplayerHub: React.FC<MultiplayerHubProps> = ({
  wallet,
  account,
  onUpdateWallet,
  onOpenRedeem,
}) => {
  const [playerName, setPlayerName] = useState<string>(account?.inGameName || 'Player 1');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [customHostCode, setCustomHostCode] = useState<string>('');
  const [activeRoom, setActiveRoom] = useState<MultiplayerRoom | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [gameStake, setGameStake] = useState<number>(1000);
  const [gameMode, setGameMode] = useState<'flip' | 'slots' | 'highlow' | 'hunt' | 'battle'>('flip');
  const [isFlippingDuel, setIsFlippingDuel] = useState<boolean>(false);
  const [isSpinningSlots, setIsSpinningSlots] = useState<boolean>(false);
  const [isDealingHighLow, setIsDealingHighLow] = useState<boolean>(false);
  const [isHuntingDuel, setIsHuntingDuel] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [activeLobbies, setActiveLobbies] = useState<MultiplayerRoom[]>([]);
  const [isLoadingLobbies, setIsLoadingLobbies] = useState<boolean>(false);

  // User's active pet squad
  const userTeamPets = wallet.pets.filter((p) => (wallet.teamPetIds || []).includes(p.id));
  const activeSquad = userTeamPets.length > 0 ? userTeamPets : [wallet.pets[0]];
  const squadPower = activeSquad.reduce((acc, p) => acc + p.power, 0);

  // Load open lobbies from server
  const refreshLobbies = useCallback(async () => {
    setIsLoadingLobbies(true);
    try {
      const list = await multiplayer.listActiveRooms();
      setActiveLobbies(list);
    } catch {
      // ignore
    } finally {
      setIsLoadingLobbies(false);
    }
  }, []);

  useEffect(() => {
    refreshLobbies();
    const interval = setInterval(refreshLobbies, 4000);
    return () => clearInterval(interval);
  }, [refreshLobbies]);

  // Check URL query parameters for auto-joining room (e.g. ?room=1234)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('room');
      if (urlCode && urlCode.trim()) {
        setRoomCodeInput(urlCode.trim().toUpperCase());
      }
    } catch {
      // ignore
    }
  }, []);

  // Subscribe to room updates
  useEffect(() => {
    const unsub = multiplayer.subscribe((room) => {
      if (activeRoom && room.code === activeRoom.code) {
        setActiveRoom(room);
      }
    });
    return unsub;
  }, [activeRoom]);

  const createCurrentPlayer = (name: string): MultiplayerPlayer => {
    return {
      id: account?.id || `player_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: (account?.inGameName || name || 'Player').trim(),
      avatar: account?.avatar || activeSquad[0]?.emoji || '🐯',
      isReady: true,
      petTeam: activeSquad,
      betINR: gameStake,
      choice: 'heads',
      currentHp: 300 + squadPower * 2,
      maxHp: 300 + squadPower * 2,
    };
  };

  const handleCreateRoom = async (overrideCode?: string) => {
    if (wallet.balanceINR < gameStake) {
      setErrorMsg(`Insufficient balance for ₹${gameStake} stake! Redeem a secret code or claim daily bonus.`);
      sound.playLoss();
      return;
    }

    const sub = subtractFromWallet(wallet, gameStake, 'Multiplayer Duel', `Created Room Stake`);
    if (!sub.success) return;
    onUpdateWallet(sub.updatedWallet);

    const player = createCurrentPlayer(playerName || 'Host');
    const targetCode = overrideCode || (customHostCode.trim() ? customHostCode.trim() : undefined);
    const newRoom = await multiplayer.createRoom(player, gameMode, gameStake, targetCode);
    setActiveRoom(newRoom);
    sound.playWin();
    setErrorMsg(null);
    setInfoMsg(`Room #${newRoom.code} created! Tell your friend to join using code ${newRoom.code}.`);
    refreshLobbies();
  };

  const handleJoinRoom = async (codeToJoin?: string) => {
    const code = (codeToJoin || roomCodeInput).trim().toUpperCase();
    if (!code) {
      setErrorMsg('Enter a 4-digit room code to join.');
      return;
    }

    setIsJoining(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      // Check if wallet has stake
      const player = createCurrentPlayer(playerName === 'Player 1' ? 'Friend (Guest)' : playerName);
      player.choice = 'tails';

      // First peek at room to know required stake
      const existing = await multiplayer.getRoom(code);
      const requiredStake = existing ? existing.stakeINR : gameStake;

      if (wallet.balanceINR < requiredStake) {
        setErrorMsg(`You need ${formatINR(requiredStake)} to enter this duel! Current balance: ${formatINR(wallet.balanceINR)}.`);
        sound.playLoss();
        setIsJoining(false);
        return;
      }

      player.betINR = requiredStake;

      const sub = subtractFromWallet(wallet, requiredStake, 'Multiplayer Duel', `Room #${code} Stake`);
      if (!sub.success) {
        setErrorMsg(sub.error || 'Failed to deduct stake');
        setIsJoining(false);
        return;
      }
      onUpdateWallet(sub.updatedWallet);

      const result = await multiplayer.joinRoom(code, player);
      if (result.room) {
        setActiveRoom(result.room);
        sound.playWin();
        if (result.isHostNow) {
          setInfoMsg(`Room #${code} was waiting for a host! You are now hosting Room #${code}. Send the code to your friend to begin!`);
        } else {
          setInfoMsg(`Successfully connected to Room #${code}! Match ready.`);
        }
      } else {
        setErrorMsg(result.error || `Could not join room #${code}. Please try again.`);
        sound.playLoss();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error connecting to room');
    } finally {
      setIsJoining(false);
      refreshLobbies();
    }
  };

  const handleQuickMatch = async () => {
    // If there is an active waiting lobby, join it
    const openRoom = activeLobbies.find((r) => r.status === 'waiting');
    if (openRoom) {
      await handleJoinRoom(openRoom.code);
    } else {
      // Otherwise auto-create a match
      await handleCreateRoom();
    }
  };

  const copyRoomCode = () => {
    if (!activeRoom) return;
    navigator.clipboard.writeText(activeRoom.code);
    setCopied(true);
    sound.playSlotTick();
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRoomLink = () => {
    if (!activeRoom) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${activeRoom.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    sound.playSlotTick();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Add Sim Friend (for instant local multiplayer testing!)
  const handleSimulateFriendJoin = async () => {
    if (!activeRoom || activeRoom.guest) return;

    const friendPet: PetAnimal = {
      id: 'friend_falcon',
      name: 'Sky Falcon',
      rarity: 'rare',
      emoji: '🦅',
      biome: 'Himalayan Peaks',
      valueINR: 15000,
      power: 70,
      caughtAt: Date.now(),
      level: 1,
    };

    const simGuest: MultiplayerPlayer = {
      id: 'sim_friend_bot',
      name: 'Rival Challenger',
      avatar: '🦅',
      isReady: true,
      petTeam: [friendPet],
      betINR: activeRoom.stakeINR,
      choice: activeRoom.host.choice === 'heads' ? 'tails' : 'heads',
      currentHp: 440,
      maxHp: 440,
    };

    const result = await multiplayer.joinRoom(activeRoom.code, simGuest);
    if (result.room) {
      sound.playWin();
    }
  };

  // Run Coin Flip Duel
  const handleRunFlipDuel = () => {
    if (!activeRoom || !activeRoom.guest) return;
    setIsFlippingDuel(true);
    sound.playSlotSpin();

    setTimeout(() => {
      setIsFlippingDuel(false);
      const isHeads = Math.random() < 0.5;
      const coinSide = isHeads ? 'heads' : 'tails';

      const hostWins = activeRoom.host.choice === coinSide;
      const guestWins = activeRoom.guest?.choice === coinSide;

      let winnerId = activeRoom.host.id;
      let winnerName = activeRoom.host.name;
      let isHostWinner = true;

      if (!hostWins && guestWins) {
        winnerId = activeRoom.guest!.id;
        winnerName = activeRoom.guest!.name;
        isHostWinner = false;
      }

      const totalPot = activeRoom.stakeINR * 2;
      const resultMessage = `🪙 Coin landed on ${coinSide.toUpperCase()}! ${winnerName} won the ${formatINR(totalPot)} duel pot!`;

      const updatedRoom: MultiplayerRoom = {
        ...activeRoom,
        status: 'finished',
        winnerId,
        resultMessage,
        logs: [resultMessage, ...activeRoom.logs],
      };

      multiplayer.broadcast(updatedRoom);
      setActiveRoom(updatedRoom);

      sound.playJackpot();
      confetti({ particleCount: 150, spread: 80 });

      const updated = addToWallet(
        wallet,
        totalPot,
        'Multiplayer Duel',
        `Won 1v1 Coin Flip Duel vs ${isHostWinner ? activeRoom.guest?.name : activeRoom.host.name} (+${formatINR(totalPot)})!`,
        'multiplayer_duel'
      );
      onUpdateWallet({
        ...updated,
        stats: {
          ...updated.stats,
          multiplayerDuelsWon: updated.stats.multiplayerDuelsWon + 1,
        },
      });
    }, 1500);
  };

  // Run 1v1 Slots Showdown Duel
  const handleRunSlotsDuel = () => {
    if (!activeRoom || !activeRoom.guest) return;
    const guest = activeRoom.guest;
    const host = activeRoom.host;
    setIsSpinningSlots(true);
    sound.playSlotSpin();

    setTimeout(() => {
      setIsSpinningSlots(false);
      const SYMBOLS = ['💎', '👑', '7️⃣', '🐯', '🪙', '🍒', '⚡'];
      const SYMBOL_POINTS: Record<string, number> = {
        '💎': 100,
        '👑': 85,
        '7️⃣': 70,
        '🐯': 55,
        '🪙': 40,
        '🍒': 30,
        '⚡': 20,
      };

      const spin = () => [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ];

      const hostReels = spin();
      const guestReels = spin();

      const calcScore = (reels: string[]) => {
        let score = reels.reduce((sum, s) => sum + (SYMBOL_POINTS[s] || 10), 0);
        if (reels[0] === reels[1] && reels[1] === reels[2]) {
          score += 400; // 3 of a kind jackpot bonus
        } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
          score += 120; // 2 of a kind bonus
        }
        return score;
      };

      let hostScore = calcScore(hostReels);
      let guestScore = calcScore(guestReels);
      if (hostScore === guestScore) hostScore += 5; // tiebreaker

      const hostWon = hostScore > guestScore;
      const winnerId = hostWon ? host.id : guest.id;
      const winnerName = hostWon ? host.name : guest.name;
      const totalPot = activeRoom.stakeINR * 2;

      const resultMessage = `🎰 Slots: ${host.name} [${hostReels.join(' ')} = ${hostScore} pts] vs ${guest.name} [${guestReels.join(' ')} = ${guestScore} pts]! 🏆 ${winnerName} won the ${formatINR(totalPot)} pot!`;

      const updatedRoom: MultiplayerRoom = {
        ...activeRoom,
        status: 'finished',
        winnerId,
        resultMessage,
        extraData: {
          slotReelsHost: hostReels,
          slotReelsGuest: guestReels,
          slotScoreHost: hostScore,
          slotScoreGuest: guestScore,
        },
        logs: [resultMessage, ...activeRoom.logs],
      };

      multiplayer.broadcast(updatedRoom);
      setActiveRoom(updatedRoom);
      sound.playJackpot();
      confetti({ particleCount: 150, spread: 85 });

      const updated = addToWallet(
        wallet,
        totalPot,
        'Multiplayer Slots Duel',
        `Won 1v1 Slots Showdown pot vs ${hostWon ? guest.name : host.name} (+${formatINR(totalPot)})!`,
        'multiplayer_duel'
      );
      onUpdateWallet({
        ...updated,
        stats: {
          ...updated.stats,
          multiplayerDuelsWon: updated.stats.multiplayerDuelsWon + 1,
        },
      });

      if (account?.uid) {
        recordBattleToFirestore(account.uid, {
          type: 'pvp',
          playerName: host.name,
          opponentName: guest.name,
          result: hostWon ? 'win' : 'loss',
          rewardINR: totalPot,
          petsUsed: activeSquad.map((p) => p.name),
        }).catch(() => {});
      }
    }, 1600);
  };

  // Run 1v1 High-Low Cards Duel
  const handleRunHighLowDuel = (hostGuess: 'higher' | 'lower') => {
    if (!activeRoom || !activeRoom.guest) return;
    const guest = activeRoom.guest;
    const host = activeRoom.host;
    setIsDealingHighLow(true);
    sound.playSlotTick();

    setTimeout(() => {
      setIsDealingHighLow(false);
      const SUITS = ['♠️', '♥️', '♦️', '♣️'];
      const baseVal = activeRoom.extraData?.card?.value || Math.floor(4 + Math.random() * 8);
      const baseSuit = activeRoom.extraData?.card?.suit || SUITS[Math.floor(Math.random() * SUITS.length)];

      let nextVal = Math.floor(2 + Math.random() * 13);
      while (nextVal === baseVal) {
        nextVal = Math.floor(2 + Math.random() * 13);
      }
      const nextSuit = SUITS[Math.floor(Math.random() * SUITS.length)];

      const isActuallyHigher = nextVal > baseVal;
      const hostWon = hostGuess === (isActuallyHigher ? 'higher' : 'lower');
      const winnerId = hostWon ? host.id : guest.id;
      const winnerName = hostWon ? host.name : guest.name;
      const totalPot = activeRoom.stakeINR * 2;

      const rankNames: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
      const getCardName = (v: number) => rankNames[v] || v.toString();

      const resultMessage = `🃏 Next card was ${getCardName(nextVal)}${nextSuit} (Base was ${getCardName(baseVal)}${baseSuit}). It went ${isActuallyHigher ? 'HIGHER' : 'LOWER'}! ${winnerName} won ${formatINR(totalPot)}!`;

      const updatedRoom: MultiplayerRoom = {
        ...activeRoom,
        status: 'finished',
        winnerId,
        resultMessage,
        extraData: {
          card: { value: baseVal, suit: baseSuit },
          nextCard: { value: nextVal, suit: nextSuit },
        },
        logs: [resultMessage, ...activeRoom.logs],
      };

      multiplayer.broadcast(updatedRoom);
      setActiveRoom(updatedRoom);
      sound.playJackpot();
      confetti({ particleCount: 150, spread: 85 });

      const updated = addToWallet(
        wallet,
        totalPot,
        'Multiplayer High-Low Duel',
        `Won 1v1 High-Low Card Duel (+${formatINR(totalPot)})!`,
        'multiplayer_duel'
      );
      onUpdateWallet({
        ...updated,
        stats: {
          ...updated.stats,
          multiplayerDuelsWon: updated.stats.multiplayerDuelsWon + 1,
        },
      });
    }, 1400);
  };

  // Run 1v1 Animal Safari Hunt Duel
  const handleRunHuntDuel = () => {
    if (!activeRoom || !activeRoom.guest) return;
    const guest = activeRoom.guest;
    const host = activeRoom.host;
    setIsHuntingDuel(true);
    sound.playSlotSpin();

    setTimeout(() => {
      setIsHuntingDuel(false);
      const WILD_ANIMALS = [
        { name: 'Royal Bengal Tiger', emoji: '🐯', power: 98, rarity: 'Mythic' },
        { name: 'Indian One-Horned Rhino', emoji: '🦏', power: 92, rarity: 'Epic' },
        { name: 'Asian Elephant', emoji: '🐘', power: 88, rarity: 'Epic' },
        { name: 'Snow Leopard', emoji: '🐆', power: 84, rarity: 'Epic' },
        { name: 'King Cobra', emoji: '🐍', power: 78, rarity: 'Rare' },
        { name: 'Himalayan Golden Eagle', emoji: '🦅', power: 74, rarity: 'Rare' },
        { name: 'Golden Jackal', emoji: '🐺', power: 65, rarity: 'Uncommon' },
        { name: 'Indian Peacock', emoji: '🦚', power: 55, rarity: 'Uncommon' },
        { name: 'Thar Desert Hare', emoji: '🐇', power: 42, rarity: 'Common' },
      ];

      const hostCatch = WILD_ANIMALS[Math.floor(Math.random() * WILD_ANIMALS.length)];
      let guestCatch = WILD_ANIMALS[Math.floor(Math.random() * WILD_ANIMALS.length)];
      if (guestCatch.power === hostCatch.power) {
        guestCatch = WILD_ANIMALS[(WILD_ANIMALS.indexOf(guestCatch) + 1) % WILD_ANIMALS.length];
      }

      const hostWon = hostCatch.power > guestCatch.power;
      const winnerId = hostWon ? host.id : guest.id;
      const winnerName = hostWon ? host.name : guest.name;
      const totalPot = activeRoom.stakeINR * 2;

      const resultMessage = `🦁 Safari Hunt: ${host.name} captured ${hostCatch.emoji} ${hostCatch.name} (${hostCatch.power} PWR) vs ${guest.name}'s ${guestCatch.emoji} ${guestCatch.name} (${guestCatch.power} PWR)! 🏆 ${winnerName} won ${formatINR(totalPot)}!`;

      const updatedRoom: MultiplayerRoom = {
        ...activeRoom,
        status: 'finished',
        winnerId,
        resultMessage,
        extraData: {
          huntPetHost: hostCatch,
          huntPetGuest: guestCatch,
        },
        logs: [resultMessage, ...activeRoom.logs],
      };

      multiplayer.broadcast(updatedRoom);
      setActiveRoom(updatedRoom);
      sound.playJackpot();
      confetti({ particleCount: 150, spread: 85 });

      const updated = addToWallet(
        wallet,
        totalPot,
        'Multiplayer Safari Hunt',
        `Won 1v1 Safari Hunt pot (+${formatINR(totalPot)})!`,
        'multiplayer_duel'
      );
      onUpdateWallet({
        ...updated,
        stats: {
          ...updated.stats,
          multiplayerDuelsWon: updated.stats.multiplayerDuelsWon + 1,
        },
      });
    }, 1600);
  };

  // Run Pet Battle Duel Action
  const handleBattleDuelAction = (attackerIsHost: boolean, action: 'attack' | 'ultimate') => {
    if (!activeRoom || !activeRoom.guest) return;

    const attacker = attackerIsHost ? activeRoom.host : activeRoom.guest;
    const target = attackerIsHost ? activeRoom.guest : activeRoom.host;

    const baseDmg = action === 'ultimate' ? 95 : 55;
    const dmg = Math.floor(baseDmg + Math.random() * 30);
    const newTargetHp = Math.max(0, target.currentHp - dmg);

    sound.playAttack(action === 'ultimate');

    const updatedTarget: MultiplayerPlayer = {
      ...target,
      currentHp: newTargetHp,
    };

    const isOver = newTargetHp <= 0;
    const totalPot = activeRoom.stakeINR * 2;

    const updatedRoom: MultiplayerRoom = {
      ...activeRoom,
      host: attackerIsHost ? attacker : updatedTarget,
      guest: attackerIsHost ? updatedTarget : attacker,
      currentTurn: attackerIsHost ? activeRoom.guest.id : activeRoom.host.id,
      status: isOver ? 'finished' : 'in_progress',
      winnerId: isOver ? attacker.id : undefined,
      resultMessage: isOver
        ? `🏆 ${attacker.name} annihilated the opponent's squad and claimed the ${formatINR(totalPot)} pot!`
        : undefined,
      logs: [
        `${attacker.avatar} ${attacker.name}'s squad dealt ${dmg} damage to ${target.name}!`,
        ...activeRoom.logs,
      ],
    };

    multiplayer.broadcast(updatedRoom);
    setActiveRoom(updatedRoom);

    if (isOver) {
      sound.playJackpot();
      confetti({ particleCount: 150, spread: 90 });
      const updated = addToWallet(
        wallet,
        totalPot,
        'Multiplayer Battle Duel',
        `Squad victory in 1v1 PvP duel (+${formatINR(totalPot)})!`,
        'multiplayer_duel'
      );
      onUpdateWallet({
        ...updated,
        stats: {
          ...updated.stats,
          multiplayerDuelsWon: updated.stats.multiplayerDuelsWon + 1,
        },
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/40 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Firebase Firestore Online 1v1 Multiplayer</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>👥</span>
              <span>OwO 1v1 Online PvP Arena</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Play real-time duels with friends across different devices or tabs using 4-digit Room Codes!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Duels Won:</span>
              <span className="font-bold text-amber-400">{wallet.stats.multiplayerDuelsWon}</span>
            </div>
          </div>
        </div>

        {!activeRoom ? (
          /* Lobby / Create or Join Room */
          <div className="py-6 space-y-6">
            {/* Player Nickname */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Your Player Nickname
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={18}
                placeholder="Enter your name (e.g. Arjun)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>

            {/* Mode & Stake Setup */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Duel Game Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGameMode('flip')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      gameMode === 'flip'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-base">🪙</span>
                    <span>Coin Flip (50/50)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameMode('slots')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      gameMode === 'slots'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-base">🎰</span>
                    <span>Slots Showdown</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameMode('highlow')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      gameMode === 'highlow'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-base">🃏</span>
                    <span>High-Low Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameMode('hunt')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      gameMode === 'hunt'
                        ? 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-600/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-base">🦁</span>
                    <span>Safari Hunt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameMode('battle')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      gameMode === 'battle'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-base">⚔️</span>
                    <span>Squad Pet Duel</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Match Stake (₹ INR Pot)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[500, 1000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setGameStake(amt)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                        gameStake === amt
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/20'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {formatINR(amt)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Code Option */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Optional Custom Room Code (for you & friend)
              </label>
              <input
                type="text"
                maxLength={6}
                value={customHostCode}
                onChange={(e) => setCustomHostCode(e.target.value.toUpperCase())}
                placeholder="Leave blank for auto 4-digit code (or type e.g. 5555)"
                className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-400 uppercase"
              />
            </div>

            {/* Notifications / Alerts */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {infoMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{infoMsg}</span>
              </div>
            )}

            {/* Actions: Host or Join */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => handleCreateRoom()}
                className="py-4 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Users className="w-4 h-4" />
                <span>HOST DUEL ROOM ({formatINR(gameStake)})</span>
              </button>

              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter Room Code (e.g. 1234)"
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-center font-bold tracking-widest text-base focus:outline-none focus:border-indigo-400 uppercase"
                />
                <button
                  type="button"
                  disabled={isJoining}
                  onClick={() => handleJoinRoom()}
                  className="px-6 py-3 rounded-2xl font-black text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isJoining ? 'JOINING...' : 'JOIN ROOM'}
                </button>
              </div>
            </div>

            {/* Quick Match CTA */}
            <div className="flex items-center justify-center pt-1">
              <button
                type="button"
                onClick={handleQuickMatch}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 border border-slate-700 transition-all hover:scale-105"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Quick Match / Find Any Available Opponent</span>
              </button>
            </div>

            {/* Open Lobbies List */}
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-extrabold text-sm text-white">Live Open Lobbies</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                    ONLINE
                  </span>
                </div>
                <button
                  onClick={refreshLobbies}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  title="Refresh Lobbies"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLobbies ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {activeLobbies.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/60 text-center text-xs text-slate-500">
                  No open lobbies right now. Click "HOST DUEL ROOM" to start one!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeLobbies.slice(0, 4).map((lobby) => (
                    <div
                      key={lobby.code}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-2 transition-all"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-amber-400 text-sm">
                            #{lobby.code}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {lobby.host.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{lobby.gameMode === 'flip' ? '🪙 Coin Flip' : '⚔️ Squad Battle'}</span>
                          <span>•</span>
                          <span className="font-mono text-emerald-400">{formatINR(lobby.stakeINR)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoinRoom(lobby.code)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95 transition-all"
                      >
                        Join Room
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Active Room Screen */
          <div className="py-6 space-y-6">
            {/* Room Info Bar */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">
                  ROOM CODE (SHARE WITH FRIEND)
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-2xl font-black font-mono text-amber-400 tracking-wider">
                    {activeRoom.code}
                  </span>
                  <button
                    onClick={copyRoomCode}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-xs"
                    title="Copy Code"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={copyRoomLink}
                    className="p-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 transition-colors flex items-center gap-1 text-xs border border-indigo-700"
                    title="Copy Direct Link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copiedLink ? 'Link Copied!' : 'Share Link'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-indigo-950/60 text-indigo-300 border border-indigo-800">
                  Total Pot: {formatINR(activeRoom.stakeINR * 2)}
                </span>
                <button
                  onClick={() => {
                    multiplayer.leaveRoom(activeRoom.code);
                    setActiveRoom(null);
                    refreshLobbies();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                >
                  Leave Room
                </button>
              </div>
            </div>

            {/* Players Roster */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Host */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl">{activeRoom.host.avatar}</span>
                    <div>
                      <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                        {activeRoom.host.name}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                          HOST
                        </span>
                      </div>
                      <div className="text-xs text-amber-400 font-mono">
                        Bet: {formatINR(activeRoom.host.betINR)} ({activeRoom.host.choice?.toUpperCase()})
                      </div>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>

              {/* Guest */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                {activeRoom.guest ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl">{activeRoom.guest.avatar}</span>
                      <div>
                        <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                          {activeRoom.guest.name}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                            OPPONENT
                          </span>
                        </div>
                        <div className="text-xs text-amber-400 font-mono">
                          Bet: {formatINR(activeRoom.guest.betINR)} ({activeRoom.guest.choice?.toUpperCase()})
                        </div>
                      </div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                ) : (
                  <div className="py-2 flex flex-col items-center justify-center text-center space-y-2">
                    <span className="text-xs text-slate-400">Waiting for friend to enter code <strong>{activeRoom.code}</strong>...</span>
                    <button
                      onClick={handleSimulateFriendJoin}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-colors"
                    >
                      + Quick Play / Add Companion
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Duel Play Zone */}
            {activeRoom.guest && (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 border border-indigo-500/40 text-center space-y-4">
                {activeRoom.gameMode === 'flip' ? (
                  /* 1v1 Coin Flip Duel */
                  <div className="space-y-4">
                    <div className="text-base font-black text-white">
                      1v1 COIN FLIP DUEL FOR {formatINR(activeRoom.stakeINR * 2)}
                    </div>
                    <div className="text-xs text-slate-300">
                      {activeRoom.host.name} picked <strong className="text-amber-400">HEADS</strong> vs{' '}
                      {activeRoom.guest.name} on <strong className="text-amber-400">TAILS</strong>!
                    </div>

                    <button
                      type="button"
                      disabled={isFlippingDuel || activeRoom.status === 'finished'}
                      onClick={handleRunFlipDuel}
                      className="py-3.5 px-8 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-xl shadow-amber-500/30 active:scale-95 transition-all inline-flex items-center gap-2"
                    >
                      {isFlippingDuel ? 'Flipping Coin...' : 'FLIP COIN TO DECIDE WINNER'}
                    </button>
                  </div>
                ) : (
                  /* 1v1 Squad Pet Battle */
                  <div className="space-y-4">
                    <div className="text-base font-black text-white">
                      1v1 SQUAD PET DUEL FOR {formatINR(activeRoom.stakeINR * 2)}
                    </div>

                    {/* Battle HP Gauges */}
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{activeRoom.host.name}</span>
                          <span className="font-mono text-emerald-400">
                            {activeRoom.host.currentHp} / {activeRoom.host.maxHp} HP
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${(activeRoom.host.currentHp / activeRoom.host.maxHp) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{activeRoom.guest.name}</span>
                          <span className="font-mono text-rose-400">
                            {activeRoom.guest.currentHp} / {activeRoom.guest.maxHp} HP
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-500 transition-all duration-300"
                            style={{ width: `${(activeRoom.guest.currentHp / activeRoom.guest.maxHp) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {activeRoom.status !== 'finished' && (
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => handleBattleDuelAction(true, 'attack')}
                          className="px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-md active:scale-95"
                        >
                          ⚔️ {activeRoom.host.name} Strike
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBattleDuelAction(true, 'ultimate')}
                          className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md active:scale-95"
                        >
                          ⚡ {activeRoom.host.name} Squad Ultimate
                        </button>
                        <div className="w-px h-6 bg-slate-800 hidden sm:block" />
                        <button
                          type="button"
                          onClick={() => handleBattleDuelAction(false, 'attack')}
                          className="px-5 py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-md active:scale-95"
                        >
                          ⚔️ {activeRoom.guest.name} Strike
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Outcome Banner */}
                {activeRoom.resultMessage && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-extrabold text-sm animate-in zoom-in-95 duration-200">
                    {activeRoom.resultMessage}
                  </div>
                )}
              </div>
            )}

            {/* Match Logs */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 max-h-36 overflow-y-auto text-xs font-mono">
              {activeRoom.logs.map((log, i) => (
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
