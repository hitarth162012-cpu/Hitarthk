import { PetAnimal, Transaction, WalletState } from '../types';

export const INITIAL_WALLET: WalletState = {
  balanceINR: 0, // Starting balance is strictly 0 INR
  totalWonINR: 0,
  totalLostINR: 0,
  redeemedCodes: [],
  pets: [
    {
      id: 'starter_cub',
      name: 'Baby Bengal Cub',
      rarity: 'rare',
      emoji: '🐯',
      biome: 'Indian Jungle',
      valueINR: 5000,
      power: 45,
      caughtAt: Date.now(),
      level: 1,
    },
  ],
  equippedPetId: 'starter_cub',
  teamPetIds: ['starter_cub'],
  transactions: [
    {
      id: 'tx_init',
      type: 'daily',
      game: 'Wallet Setup',
      amount: 0,
      timestamp: Date.now(),
      note: 'Wallet initialized with ₹0 INR. Ready for OwO Arcade games & secret codes.',
    },
  ],
  inventory: [
    {
      id: 'safari_net_basic',
      name: 'Explorer Safari Net',
      count: 3,
      icon: '🕸️',
      description: 'Standard expedition net for capturing wild beasts.',
      rarity: 'common',
    },
  ],
  level: 1,
  xp: 0,
  stats: {
    flipsPlayed: 0,
    flipsWon: 0,
    slotsSpun: 0,
    slotsJackpots: 0,
    huntsCount: 0,
    battlesWon: 0,
    multiplayerDuelsWon: 0,
    workCount: 0,
    dailyStreak: 0,
  },
};

/**
 * Format Joules currency
 */
export function formatJoules(val: number): string {
  const rounded = Math.round(val);
  return `${rounded.toLocaleString()} Joules`;
}

/**
 * Format Indian Rupees with proper Lakh/Crore comma notation:
 * e.g. 50000 -> "₹50,000"
 */
export function formatINR(val: number): string {
  const rounded = Math.round(val);
  const isNegative = rounded < 0;
  const absStr = Math.abs(rounded).toString();

  if (absStr.length <= 3) {
    return `${isNegative ? '-' : ''}₹${absStr}`;
  }

  const lastThree = absStr.substring(absStr.length - 3);
  const otherNumbers = absStr.substring(0, absStr.length - 3);
  const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

  return `${isNegative ? '-' : ''}₹${formattedOther},${lastThree}`;
}

/**
 * Add Indian Rupees to wallet
 */
export function addToWallet(
  wallet: WalletState,
  amountINR: number,
  game: string,
  note: string,
  type: Transaction['type'] = 'win'
): WalletState {
  if (amountINR <= 0) return wallet;

  const tx: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    game,
    amount: amountINR,
    timestamp: Date.now(),
    note,
  };

  return {
    ...wallet,
    balanceINR: wallet.balanceINR + amountINR,
    totalWonINR: wallet.totalWonINR + amountINR,
    transactions: [tx, ...wallet.transactions.slice(0, 49)],
  };
}

/**
 * Subtract Indian Rupees from wallet
 */
export function subtractFromWallet(
  wallet: WalletState,
  amountINR: number,
  game: string,
  note: string,
  type: Transaction['type'] = 'loss'
): { success: boolean; updatedWallet: WalletState; error?: string } {
  if (amountINR <= 0) {
    return { success: false, updatedWallet: wallet, error: 'Amount must be greater than 0' };
  }

  if (wallet.balanceINR < amountINR) {
    return {
      success: false,
      updatedWallet: wallet,
      error: `Insufficient balance! You need ${formatINR(amountINR)}, but you have ${formatINR(wallet.balanceINR)}. Claim your daily reward or redeem a secret code!`,
    };
  }

  const tx: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    game,
    amount: -amountINR,
    timestamp: Date.now(),
    note,
  };

  return {
    success: true,
    updatedWallet: {
      ...wallet,
      balanceINR: wallet.balanceINR - amountINR,
      totalLostINR: wallet.totalLostINR + amountINR,
      transactions: [tx, ...wallet.transactions.slice(0, 49)],
    },
  };
}

// Secret & Promo Code Registry
// All codes reduced by 50% as requested!
// "hitarth" is a hidden secret code — NEVER displayed or listed publicly in UI text!
export const ALL_REDEEM_CODES: Record<string, { amount: number; description: string; isSecret: boolean }> = {
  hitarth: {
    amount: 50000, // 50% less amount (was 100,000, now 50,000)
    description: 'Secret Master Key Unlocked! +₹50,000 Indian Rupees added directly to your wallet!',
    isSecret: true, // Hidden from all public UI listings!
  },
  welcome: {
    amount: 2500, // 50% less amount (was 5,000, now 2,500)
    description: 'Welcome Bonus code! +₹2,500 added.',
    isSecret: false,
  },
  owo2026: {
    amount: 12500, // 50% less amount (was 25,000, now 12,500)
    description: 'OwO 2026 Celebration! +₹12,500 added.',
    isSecret: false,
  },
  arcadeking: {
    amount: 25000, // 50% less amount (was 50,000, now 25,000)
    description: 'Arcade Champion Grant! +₹25,000 added.',
    isSecret: false,
  },
  jackpot777: {
    amount: 38888, // 50% less amount (was 77,777, now 38,888)
    description: 'Lucky 777 Jackpot Drop! +₹38,888 added.',
    isSecret: false,
  },
};

// Only public discoverable codes (never leaking "hitarth")
export const PUBLIC_DISCOVERABLE_CODES = Object.entries(ALL_REDEEM_CODES)
  .filter(([_, v]) => !v.isSecret)
  .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {} as Record<string, { amount: number; description: string }>);

export interface RedeemResult {
  success: boolean;
  amount: number;
  message: string;
  code: string;
}

export function redeemCode(wallet: WalletState, rawCode: string): { updatedWallet: WalletState; result: RedeemResult } {
  const cleanCode = rawCode.trim().toLowerCase();

  if (!cleanCode) {
    return {
      updatedWallet: wallet,
      result: { success: false, amount: 0, message: 'Please enter a redeem code.', code: cleanCode },
    };
  }

  if (wallet.redeemedCodes.map((c) => c.toLowerCase()).includes(cleanCode)) {
    return {
      updatedWallet: wallet,
      result: { success: false, amount: 0, message: `Code has already been redeemed!`, code: cleanCode },
    };
  }

  const promo = ALL_REDEEM_CODES[cleanCode];
  if (!promo) {
    return {
      updatedWallet: wallet,
      result: {
        success: false,
        amount: 0,
        message: `Invalid code. Enter a valid creator or secret promo code.`,
        code: cleanCode,
      },
    };
  }

  const tx: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: 'redeem',
    game: 'Code Redeem',
    amount: promo.amount,
    timestamp: Date.now(),
    note: promo.description,
  };

  const updatedWallet: WalletState = {
    ...wallet,
    balanceINR: wallet.balanceINR + promo.amount,
    totalWonINR: wallet.totalWonINR + promo.amount,
    redeemedCodes: [...wallet.redeemedCodes, cleanCode],
    transactions: [tx, ...wallet.transactions.slice(0, 49)],
  };

  return {
    updatedWallet,
    result: {
      success: true,
      amount: promo.amount,
      message: promo.description,
      code: cleanCode,
    },
  };
}

// --- Coin Flip Game Logic ---
// Rule: Exactly 50% Heads / 50% Tails
export interface FlipOutcome {
  resultSide: 'heads' | 'tails';
  isWin: boolean;
  payoutINR: number;
  netChangeINR: number;
}

export function playCoinFlip(betINR: number, chosenSide: 'heads' | 'tails', forcedOutcome?: 'heads' | 'tails'): FlipOutcome {
  const outcome: 'heads' | 'tails' = forcedOutcome ?? (Math.random() < 0.5 ? 'heads' : 'tails');
  const isWin = outcome === chosenSide;
  const payoutINR = isWin ? betINR * 2 : 0;
  const netChangeINR = isWin ? betINR : -betINR;

  return {
    resultSide: outcome,
    isWin,
    payoutINR,
    netChangeINR,
  };
}

// --- Slot Machine Game Logic ---
// Rule: Exact 70% lose rate (30% win rate)
export interface SlotSymbol {
  id: string;
  emoji: string;
  label: string;
  weight: number;
  payout3x: number;
}

export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: 'seven', emoji: '7️⃣', label: 'Jackpot 7', weight: 4, payout3x: 50 },
  { id: 'diamond', emoji: '💎', label: 'Diamond', weight: 8, payout3x: 30 },
  { id: 'crown', emoji: '👑', label: 'Crown', weight: 12, payout3x: 20 },
  { id: 'rupee', emoji: '🪙', label: 'Rupee Coin', weight: 18, payout3x: 12 },
  { id: 'grape', emoji: '🍇', label: 'Grape', weight: 26, payout3x: 6 },
  { id: 'cherry', emoji: '🍒', label: 'Cherry', weight: 32, payout3x: 3 },
];

export interface SlotSpinOutcome {
  reels: [SlotSymbol, SlotSymbol, SlotSymbol];
  multiplier: number;
  payoutINR: number;
  isWin: boolean;
  isJackpot: boolean;
}

export function getRandomSlotSymbol(): SlotSymbol {
  const idx = Math.floor(Math.random() * SLOT_SYMBOLS.length);
  return SLOT_SYMBOLS[idx];
}

export function playSlots(betINR: number, forcedReels?: [SlotSymbol, SlotSymbol, SlotSymbol]): SlotSpinOutcome {
  if (forcedReels) {
    const [s1, s2, s3] = forcedReels;
    let multiplier = 0;
    let isJackpot = false;
    if (s1.id === s2.id && s2.id === s3.id) {
      multiplier = s1.payout3x;
      isJackpot = s1.id === 'seven' || s1.id === 'diamond';
    } else if (s1.id === s2.id || s2.id === s3.id || s1.id === s3.id) {
      multiplier = 1.8;
    }
    return {
      reels: forcedReels,
      multiplier,
      payoutINR: Math.round(betINR * multiplier),
      isWin: multiplier > 0,
      isJackpot,
    };
  }

  // Exact 70% lose probability (random >= 0.30 means 70% of rolls are losses)
  const isWinRoll = Math.random() < 0.30; // 30% win, 70% lose

  if (!isWinRoll) {
    const shuffled = [...SLOT_SYMBOLS].sort(() => 0.5 - Math.random());
    const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = [shuffled[0], shuffled[1], shuffled[2]];
    return {
      reels,
      multiplier: 0,
      payoutINR: 0,
      isWin: false,
      isJackpot: false,
    };
  }

  // Winning spin (30% of total)
  const is3Matching = Math.random() < 0.25;

  if (is3Matching) {
    const sym = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
    const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = [sym, sym, sym];
    const isJackpot = sym.id === 'seven' || sym.id === 'diamond';
    return {
      reels,
      multiplier: sym.payout3x,
      payoutINR: Math.round(betINR * sym.payout3x),
      isWin: true,
      isJackpot,
    };
  } else {
    const sym1 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
    const otherSymbols = SLOT_SYMBOLS.filter((s) => s.id !== sym1.id);
    const sym2 = otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
    const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = [sym1, sym1, sym2];
    return {
      reels,
      multiplier: 1.8,
      payoutINR: Math.round(betINR * 1.8),
      isWin: true,
      isJackpot: false,
    };
  }
}

// --- High-Low Game Logic ---
export interface CardItem {
  value: number; // 1 to 13
  name: string;
  suit: '♠' | '♥' | '♦' | '♣';
}

export function drawCard(): CardItem {
  const suits: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
  const value = Math.floor(Math.random() * 13) + 1;
  const names: Record<number, string> = {
    1: 'Ace',
    11: 'Jack',
    12: 'Queen',
    13: 'King',
  };
  const name = names[value] || value.toString();
  const suit = suits[Math.floor(Math.random() * suits.length)];
  return { value, name, suit };
}

export const HIGH_LOW_STREAK_MULTIPLIERS = [1.3, 1.8, 2.6, 4.0, 6.5, 11.0, 20.0, 35.0];

export function checkHighLowGuess(currentVal: number, nextVal: number, guess: 'higher' | 'lower'): 'win' | 'loss' | 'tie' {
  if (nextVal === currentVal) return 'tie';
  if (guess === 'higher') {
    return nextVal > currentVal ? 'win' : 'loss';
  } else {
    return nextVal < currentVal ? 'win' : 'loss';
  }
}

// --- Hunt Animal Logic ---
export const BIOMES = [
  { id: 'jungle', name: 'Indian Jungle', desc: 'Dense rainforest teeming with Tigers & Peacocks', color: 'from-emerald-900 to-green-950' },
  { id: 'himalayas', name: 'Himalayan Peaks', desc: 'Snowy ridges where Snow Leopards & Eagles roam', color: 'from-cyan-900 to-blue-950' },
  { id: 'desert', name: 'Thar Golden Dunes', desc: 'Sun-drenched sands hiding Desert Foxes & Vultures', color: 'from-amber-900 to-yellow-950' },
  { id: 'mystic', name: 'Mystic Airavata Forest', desc: 'Legendary realm of Dragons and Celestial Elephants', color: 'from-purple-900 to-fuchsia-950' },
];

export const HUNT_ANIMALS_POOL: Omit<PetAnimal, 'id' | 'caughtAt' | 'level'>[] = [
  // Jungle
  { name: 'Jungle Hare', rarity: 'common', emoji: '🐇', biome: 'Indian Jungle', valueINR: 350, power: 12 },
  { name: 'Spotted Deer', rarity: 'uncommon', emoji: '🦌', biome: 'Indian Jungle', valueINR: 1200, power: 25 },
  { name: 'Dancing Peacock', rarity: 'uncommon', emoji: '🦚', biome: 'Indian Jungle', valueINR: 2400, power: 34 },
  { name: 'Royal Bengal Tiger', rarity: 'rare', emoji: '🐯', biome: 'Indian Jungle', valueINR: 16000, power: 75 },
  { name: 'Majestic Tusker', rarity: 'epic', emoji: '🐘', biome: 'Indian Jungle', valueINR: 42000, power: 120 },

  // Himalayas
  { name: 'Snow Hare', rarity: 'common', emoji: '🐇', biome: 'Himalayan Peaks', valueINR: 400, power: 14 },
  { name: 'Mountain Ibex', rarity: 'uncommon', emoji: '🐐', biome: 'Himalayan Peaks', valueINR: 1500, power: 28 },
  { name: 'Snow Leopard', rarity: 'rare', emoji: '🐆', biome: 'Himalayan Peaks', valueINR: 18000, power: 80 },
  { name: 'Golden Mountain Eagle', rarity: 'epic', emoji: '🦅', biome: 'Himalayan Peaks', valueINR: 48000, power: 130 },

  // Desert
  { name: 'Desert Fennec Fox', rarity: 'common', emoji: '🦊', biome: 'Thar Golden Dunes', valueINR: 500, power: 16 },
  { name: 'Royal Dromedary Camel', rarity: 'uncommon', emoji: '🐪', biome: 'Thar Golden Dunes', valueINR: 1800, power: 30 },
  { name: 'Golden Cobra', rarity: 'rare', emoji: '🐍', biome: 'Thar Golden Dunes', valueINR: 14000, power: 70 },
  { name: 'Desert Phoenix Falcon', rarity: 'epic', emoji: '🪶', biome: 'Thar Golden Dunes', valueINR: 52000, power: 135 },

  // Mystic
  { name: 'Luminous Firefly Spirit', rarity: 'uncommon', emoji: '✨', biome: 'Mystic Airavata Forest', valueINR: 3500, power: 40 },
  { name: 'Celestial White Stag', rarity: 'rare', emoji: '🦌', biome: 'Mystic Airavata Forest', valueINR: 22000, power: 90 },
  { name: 'Airavata Divine Elephant', rarity: 'epic', emoji: '🐘', biome: 'Mystic Airavata Forest', valueINR: 65000, power: 160 },
  { name: 'Golden Garuda Dragon', rarity: 'mythic', emoji: '🐉', biome: 'Mystic Airavata Forest', valueINR: 150000, power: 300 },
];

export function performHunt(biomeName: string): PetAnimal {
  const pool = HUNT_ANIMALS_POOL.filter((p) => p.biome === biomeName);
  const selectedPool = pool.length > 0 ? pool : HUNT_ANIMALS_POOL;

  const roll = Math.random() * 100;
  let targetRarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'mythic' = 'common';

  if (roll < 3) targetRarity = 'mythic';
  else if (roll < 15) targetRarity = 'epic';
  else if (roll < 40) targetRarity = 'rare';
  else if (roll < 75) targetRarity = 'uncommon';
  else targetRarity = 'common';

  const matching = selectedPool.filter((p) => p.rarity === targetRarity);
  const picked = matching.length > 0
    ? matching[Math.floor(Math.random() * matching.length)]
    : selectedPool[Math.floor(Math.random() * selectedPool.length)];

  return {
    ...picked,
    id: `pet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    caughtAt: Date.now(),
    level: 1,
  };
}

// --- Battle Monsters ---
export interface MonsterBoss {
  id: string;
  name: string;
  avatar: string;
  maxHp: number;
  currentHp: number;
  attackPower: number;
  rewardINR: number;
  description: string;
}

export const MONSTERS: MonsterBoss[] = [
  {
    id: 'goblin',
    name: 'Shadow Goblin Thief',
    avatar: '👺',
    maxHp: 200,
    currentHp: 200,
    attackPower: 25,
    rewardINR: 3500,
    description: 'A sneaky goblin who hoards stolen silver rupees.',
  },
  {
    id: 'worg',
    name: 'Cyber Worg Packleader',
    avatar: '🐺',
    maxHp: 450,
    currentHp: 450,
    attackPower: 45,
    rewardINR: 8500,
    description: 'Armored robotic beast prowling the cyber badlands.',
  },
  {
    id: 'golem',
    name: 'Ancient Stone Titan',
    avatar: '🗿',
    maxHp: 800,
    currentHp: 800,
    attackPower: 70,
    rewardINR: 20000,
    description: 'An ancient colossal monolith infused with mystic runes.',
  },
  {
    id: 'dragon',
    name: 'Crimson Dragon Lord',
    avatar: '🐲',
    maxHp: 1500,
    currentHp: 1500,
    attackPower: 110,
    rewardINR: 60000,
    description: 'The supreme beast guard of the volcanic rupee vaults.',
  },
];
