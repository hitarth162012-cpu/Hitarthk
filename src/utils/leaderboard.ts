import { LeaderboardEntry } from '../types';

export const LEADERBOARD_STORAGE_KEY = 'cinenova_owo_leaderboard_v1';
export const PROFILE_STORAGE_KEY = 'cinenova_owo_player_profile_v1';

export interface PlayerProfile {
  name: string;
  avatar: string;
}

export const DEFAULT_PLAYER_PROFILE: PlayerProfile = {
  name: 'You (Player)',
  avatar: '⚡',
};

export const BASE_RIVALS: Omit<LeaderboardEntry, 'rank' | 'isCurrentPlayer'>[] = [
  {
    id: 'rival_1',
    name: 'OwO_Overlord',
    avatar: '👑',
    accumulatedINR: 350000,
    title: 'Emperor of Wealth',
    petName: 'Golden Garuda Dragon',
    petEmoji: '🐉',
    lastActive: '5m ago',
  },
  {
    id: 'rival_2',
    name: 'RajaRupee77',
    avatar: '💎',
    accumulatedINR: 240000,
    title: 'Diamond Maharaja',
    petName: 'Airavata Divine Elephant',
    petEmoji: '🐘',
    lastActive: '12m ago',
  },
  {
    id: 'rival_3',
    name: 'CyberKitten_99',
    avatar: '😼',
    accumulatedINR: 175000,
    title: 'Grandmaster Gambler',
    petName: 'Royal Bengal Tiger',
    petEmoji: '🐯',
    lastActive: '18m ago',
  },
  {
    id: 'rival_4',
    name: 'Arjun_DragonTamer',
    avatar: '🔥',
    accumulatedINR: 120000,
    title: 'Beast Commander',
    petName: 'Golden Mountain Eagle',
    petEmoji: '🦅',
    lastActive: '32m ago',
  },
  {
    id: 'rival_5',
    name: 'LuckyPriya',
    avatar: '🎯',
    accumulatedINR: 95000,
    title: 'High-Low Tactician',
    petName: 'Snow Leopard',
    petEmoji: '🐆',
    lastActive: '45m ago',
  },
  {
    id: 'rival_6',
    name: 'ViperStrike',
    avatar: '🐍',
    accumulatedINR: 72000,
    title: 'Arena Gladiator',
    petName: 'Golden Cobra',
    petEmoji: '🐍',
    lastActive: '1h ago',
  },
  {
    id: 'rival_7',
    name: 'GoldenFalcon_Dev',
    avatar: '🌟',
    accumulatedINR: 58000,
    title: 'Coin Flip Prodigy',
    petName: 'Dancing Peacock',
    petEmoji: '🦚',
    lastActive: '2h ago',
  },
  {
    id: 'rival_8',
    name: 'BengalTigerKing',
    avatar: '🐯',
    accumulatedINR: 48000,
    title: 'Zoo Master',
    petName: 'Baby Bengal Cub',
    petEmoji: '🐯',
    lastActive: '3h ago',
  },
  {
    id: 'rival_9',
    name: 'MysticChariot',
    avatar: '🔮',
    accumulatedINR: 36000,
    title: 'Arcade Highroller',
    petName: 'Celestial White Stag',
    petEmoji: '🦌',
    lastActive: '4h ago',
  },
  {
    id: 'rival_10',
    name: 'PhoenixRider',
    avatar: '🪶',
    accumulatedINR: 25000,
    title: 'Rising Contender',
    petName: 'Desert Phoenix Falcon',
    petEmoji: '🪶',
    lastActive: '6h ago',
  },
];

/**
 * Loads stored player profile or default
 */
export function getStoredPlayerProfile(): PlayerProfile {
  if (typeof window === 'undefined') return DEFAULT_PLAYER_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.name === 'string' && parsed.name.trim()) {
        return {
          name: parsed.name.trim().substring(0, 20),
          avatar: parsed.avatar || DEFAULT_PLAYER_PROFILE.avatar,
        };
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_PLAYER_PROFILE;
}

/**
 * Saves stored player profile
 */
export function saveStoredPlayerProfile(profile: PlayerProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

/**
 * Loads persistent rivals list from localStorage, initializing if absent
 */
export function getStoredRivals(): Omit<LeaderboardEntry, 'rank' | 'isCurrentPlayer'>[] {
  if (typeof window === 'undefined') return [...BASE_RIVALS];
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 5) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return [...BASE_RIVALS];
}

/**
 * Saves persistent rivals list to localStorage
 */
export function saveStoredRivals(rivals: Omit<LeaderboardEntry, 'rank' | 'isCurrentPlayer'>[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(rivals));
  } catch {
    // ignore
  }
}

/**
 * Assigns a player title based on their accumulated INR wealth
 */
export function getTitleForINR(inr: number): string {
  if (inr >= 350000) return 'OwO Sovereign God';
  if (inr >= 200000) return 'Crorepati Tycoon';
  if (inr >= 100000) return 'Lakhpati Highroller';
  if (inr >= 50000) return 'Arcade Champion';
  if (inr >= 20000) return 'Rupee Tactician';
  if (inr >= 5000) return 'Rising Contender';
  return 'Arcade Rookie';
}

export interface LeaderboardResult {
  top10: LeaderboardEntry[];
  userRank: number;
  userEntry: LeaderboardEntry;
  deficitToTop10: number;
  allEntriesCount: number;
}

/**
 * Computes the unified leaderboard by blending rival entries with the active player
 * and sorts strictly descending by accumulated INR balance.
 */
export function computeLeaderboard(
  rivals: Omit<LeaderboardEntry, 'rank' | 'isCurrentPlayer'>[],
  player: {
    name: string;
    avatar: string;
    accumulatedINR: number;
    petName?: string;
    petEmoji?: string;
  }
): LeaderboardResult {
  const userEntry: LeaderboardEntry = {
    id: 'player_local_user',
    name: player.name || 'You (Player)',
    avatar: player.avatar || '⚡',
    accumulatedINR: Math.max(0, player.accumulatedINR),
    title: getTitleForINR(player.accumulatedINR),
    isCurrentPlayer: true,
    petName: player.petName || 'Baby Bengal Cub',
    petEmoji: player.petEmoji || '🐯',
    lastActive: 'Active Now',
  };

  // Filter out any stale player entries from rivals list just in case
  const filteredRivals = rivals.filter((r) => r.id !== 'player_local_user');

  // Combine and sort descending by accumulatedINR
  const combined: LeaderboardEntry[] = [...filteredRivals, userEntry].sort(
    (a, b) => b.accumulatedINR - a.accumulatedINR
  );

  // Assign ranks 1-based
  let userRank = -1;
  const ranked = combined.map((entry, idx) => {
    const rank = idx + 1;
    if (entry.isCurrentPlayer) {
      userRank = rank;
    }
    return {
      ...entry,
      rank,
    };
  });

  const top10 = ranked.slice(0, 10);

  // Calculate deficit needed to enter Top 10
  let deficitToTop10 = 0;
  if (userRank > 10) {
    const tenthPlace = ranked[9];
    if (tenthPlace) {
      deficitToTop10 = Math.max(0, tenthPlace.accumulatedINR - userEntry.accumulatedINR + 1);
    }
  }

  return {
    top10,
    userRank,
    userEntry: { ...userEntry, rank: userRank },
    deficitToTop10,
    allEntriesCount: ranked.length,
  };
}

/**
 * Reset local rival entries back to defaults
 */
export function resetRivalsToDefault(): Omit<LeaderboardEntry, 'rank' | 'isCurrentPlayer'>[] {
  saveStoredRivals(BASE_RIVALS);
  return [...BASE_RIVALS];
}
