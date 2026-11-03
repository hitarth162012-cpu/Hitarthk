import { CustomGameCode, UserAccount, WalletState, PetAnimal } from '../types';
import { addToWallet } from './economy';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const STORAGE_KEY = 'cinenova_custom_codes_v2';
const memoryStore: Record<string, string> = {};

// Safe storage helper with in-memory fallback for SSR/tests
function safeGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // fallback
  }
  return memoryStore[key] || null;
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // fallback
  }
  memoryStore[key] = value;
}

function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = cleanForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

// Default initial secret codes created by developer
export const DEFAULT_SECRET_CODES: CustomGameCode[] = [
  {
    id: 'code_hitarth_mega',
    code: 'HITARTH_MEGA',
    createdAt: Date.now() - 86400000,
    createdBy: 'Hitarth (OWO-9850)',
    rewardJoules: 50000,
    rewardXP: 500,
    bonusPetName: 'Royal Bengal Tiger',
    bonusPetEmoji: '🐯',
    bonusPetRarity: 'legendary',
    bonusPetPower: 95,
    maxUses: 0, // unlimited
    redeemedCount: 3,
    redeemedUserIds: [],
    isActive: true,
    notes: 'Developer Master Promo Code for the HITARTH Community',
  },
  {
    id: 'code_cyber_phoenix',
    code: 'CYBER_PHOENIX',
    createdAt: Date.now() - 43200000,
    createdBy: 'Hitarth (OWO-9850)',
    rewardJoules: 100000,
    rewardXP: 1000,
    bonusPetName: 'Cybernetic Phoenix',
    bonusPetEmoji: '🔥',
    bonusPetRarity: 'mythic',
    bonusPetPower: 120,
    maxUses: 500,
    redeemedCount: 1,
    redeemedUserIds: [],
    isActive: true,
    notes: 'Exclusive Mythic Beast Developer Code',
  },
  {
    id: 'code_joules_boost',
    code: 'JOULES_BOOST_2026',
    createdAt: Date.now() - 20000000,
    createdBy: 'Hitarth (OWO-9850)',
    rewardJoules: 25000,
    rewardXP: 250,
    maxUses: 0,
    redeemedCount: 0,
    redeemedUserIds: [],
    isActive: true,
    notes: 'General Public Joules Grant from Hitarth',
  },
];

/**
 * Get internal codes list from local storage
 */
export function getAllCustomCodesInternal(): CustomGameCode[] {
  const raw = safeGet(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fallback
    }
  }
  safeSet(STORAGE_KEY, JSON.stringify(DEFAULT_SECRET_CODES));
  return DEFAULT_SECRET_CODES;
}

/**
 * Save internal codes list
 */
function saveAllCustomCodesInternal(codes: CustomGameCode[]): void {
  safeSet(STORAGE_KEY, JSON.stringify(codes));
}

/**
 * Developer check helper
 */
export function isUserDeveloper(account: UserAccount | null | undefined): boolean {
  if (!account) return false;
  return (
    account.isDeveloper === true ||
    account.id === 'OWO-9850' ||
    (account.inGameName && account.inGameName.toLowerCase() === 'hitarth') ||
    account.role === 'developer'
  );
}

/**
 * Get Developer Codes
 * STRICT REQUIREMENT: Only the developer can view codes list!
 * For all regular users, this returns an empty list.
 */
export function getDeveloperCodes(isDeveloper: boolean): CustomGameCode[] {
  if (!isDeveloper) {
    return [];
  }
  return getAllCustomCodesInternal();
}

/**
 * Generate a new Custom Game Code (Developer Only)
 */
export async function generateDeveloperCode(
  data: {
    code: string;
    rewardJoules: number;
    rewardXP?: number;
    bonusPetName?: string;
    bonusPetEmoji?: string;
    bonusPetRarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
    bonusPetPower?: number;
    maxUses?: number;
    notes?: string;
  },
  account: UserAccount | null
): Promise<{ success: boolean; code?: CustomGameCode; error?: string }> {
  if (!isUserDeveloper(account)) {
    return {
      success: false,
      error: 'Permission Denied: Only the Developer (Hitarth OWO-9850) can generate custom game codes.',
    };
  }

  const cleanCode = data.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!cleanCode || cleanCode.length < 3) {
    return { success: false, error: 'Code name must be at least 3 alphanumeric characters.' };
  }

  if (typeof data.rewardJoules !== 'number' || data.rewardJoules < 0) {
    return { success: false, error: 'Joules reward amount must be 0 or higher.' };
  }

  const existing = getAllCustomCodesInternal();
  if (existing.some((c) => c.code.toUpperCase() === cleanCode)) {
    return { success: false, error: `Code "${cleanCode}" already exists. Please choose a unique code name or edit the existing one.` };
  }

  const newCode: CustomGameCode = {
    id: `code_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    code: cleanCode,
    createdAt: Date.now(),
    createdBy: `${account?.inGameName || 'Hitarth'} (${account?.id || 'OWO-9850'})`,
    rewardJoules: Math.round(data.rewardJoules),
    rewardXP: Math.round(data.rewardXP || 0),
    bonusPetName: data.bonusPetName ? data.bonusPetName.trim() : undefined,
    bonusPetEmoji: data.bonusPetEmoji || '🐾',
    bonusPetRarity: data.bonusPetRarity || 'rare',
    bonusPetPower: data.bonusPetPower || 60,
    maxUses: data.maxUses && data.maxUses > 0 ? Math.round(data.maxUses) : 0,
    redeemedCount: 0,
    redeemedUserIds: [],
    isActive: true,
    notes: data.notes?.trim() || 'Custom code generated by Developer',
  };

  const updated = [newCode, ...existing];
  saveAllCustomCodesInternal(updated);

  // Sync to Firestore
  try {
    const codeRef = doc(db, 'custom_codes', newCode.id);
    await setDoc(codeRef, cleanForFirestore(newCode));
  } catch (err) {
    console.warn('Firestore code sync fallback:', err);
  }

  return { success: true, code: newCode };
}

/**
 * Update an existing Custom Game Code (Developer Only)
 */
export async function updateDeveloperCode(
  codeId: string,
  updates: Partial<CustomGameCode>,
  account: UserAccount | null
): Promise<{ success: boolean; code?: CustomGameCode; error?: string }> {
  if (!isUserDeveloper(account)) {
    return {
      success: false,
      error: 'Permission Denied: Only the Developer can edit custom game codes.',
    };
  }

  const all = getAllCustomCodesInternal();
  const index = all.findIndex((c) => c.id === codeId);
  if (index === -1) {
    return { success: false, error: 'Code not found.' };
  }

  const updatedCode: CustomGameCode = {
    ...all[index],
    ...updates,
    id: all[index].id, // protect id
    code: updates.code ? updates.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') : all[index].code,
  };

  all[index] = updatedCode;
  saveAllCustomCodesInternal(all);

  try {
    const codeRef = doc(db, 'custom_codes', codeId);
    await setDoc(codeRef, cleanForFirestore(updatedCode));
  } catch (err) {
    console.warn('Firestore code update fallback:', err);
  }

  return { success: true, code: updatedCode };
}

/**
 * Delete a Custom Game Code (Developer Only)
 */
export async function deleteDeveloperCode(
  codeId: string,
  account: UserAccount | null
): Promise<{ success: boolean; error?: string }> {
  if (!isUserDeveloper(account)) {
    return {
      success: false,
      error: 'Permission Denied: Only the Developer can delete custom game codes.',
    };
  }

  const all = getAllCustomCodesInternal();
  const filtered = all.filter((c) => c.id !== codeId);
  saveAllCustomCodesInternal(filtered);

  try {
    const codeRef = doc(db, 'custom_codes', codeId);
    await deleteDoc(codeRef);
  } catch (err) {
    console.warn('Firestore code delete fallback:', err);
  }

  return { success: true };
}

/**
 * Redeem Custom Game Code
 * ACCESSIBLE BY ALL PEOPLE / PLAYERS!
 * Users type in the code; codes are hidden from public view.
 */
export async function redeemCustomGameCode(
  inputCode: string,
  account: UserAccount | null,
  wallet: WalletState
): Promise<{
  success: boolean;
  message: string;
  updatedWallet?: WalletState;
  code?: CustomGameCode;
}> {
  const clean = inputCode.trim().toUpperCase();
  if (!clean) {
    return { success: false, message: 'Please enter a valid code.' };
  }

  const playerId = account?.id || 'OWO-ANON';

  // 1. Check if user already redeemed this code
  if (wallet.redeemedCodes && wallet.redeemedCodes.includes(clean)) {
    return { success: false, message: `You have already redeemed code "${clean}". Codes can only be claimed once per player.` };
  }

  // 2. Lookup in custom codes registry
  const allCodes = getAllCustomCodesInternal();
  const matched = allCodes.find((c) => c.code.toUpperCase() === clean);

  // Fallback check for legacy built-in secret codes
  if (!matched) {
    if (clean === 'HITARTH50000' || clean === 'HITARTH') {
      const grantAmount = 50000;
      const updated = {
        ...addToWallet(wallet, grantAmount, 'Secret Hitarth Code', 'Redeemed secret Hitarth grant', 'redeem'),
        redeemedCodes: [...(wallet.redeemedCodes || []), clean],
        xp: (wallet.xp || 0) + 500,
      };
      return {
        success: true,
        message: `👑 Secret Developer Code Redeemed! Granted +${grantAmount.toLocaleString()} Joules and +500 XP!`,
        updatedWallet: updated,
      };
    }
    return {
      success: false,
      message: `Invalid or expired code "${clean}". Please verify the code with the developer or announcement channel.`,
    };
  }

  // 3. Check active state
  if (!matched.isActive) {
    return { success: false, message: `Code "${clean}" is currently deactivated by the developer.` };
  }

  // 4. Check max uses limit
  if (matched.maxUses && matched.maxUses > 0 && matched.redeemedCount >= matched.maxUses) {
    return { success: false, message: `Code "${clean}" has reached its maximum redemption limit of ${matched.maxUses} players.` };
  }

  // 5. Build updated wallet with Joules, XP, and optional bonus companion pet
  let newWallet = addToWallet(
    wallet,
    matched.rewardJoules,
    `Code: ${clean}`,
    `Redeemed custom developer code ${clean}`,
    'redeem'
  );

  newWallet = {
    ...newWallet,
    redeemedCodes: [...(newWallet.redeemedCodes || []), clean],
    xp: (newWallet.xp || 0) + (matched.rewardXP || 0),
  };

  // Add bonus companion pet if defined
  let petRewardNote = '';
  if (matched.bonusPetName) {
    const newPet: PetAnimal = {
      id: `pet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: matched.bonusPetName,
      emoji: matched.bonusPetEmoji || '🐾',
      rarity: matched.bonusPetRarity || 'rare',
      power: matched.bonusPetPower || 75,
      biome: 'Developer Vault',
      valueINR: Math.round(matched.rewardJoules / 2) || 5000,
      level: 1,
      caughtAt: Date.now(),
    };
    newWallet.pets = [...(newWallet.pets || []), newPet];
    petRewardNote = ` plus companion ${newPet.emoji} ${newPet.name}!`;
  }

  // 6. Increment redemption counter on the code
  matched.redeemedCount = (matched.redeemedCount || 0) + 1;
  if (!matched.redeemedUserIds.includes(playerId)) {
    matched.redeemedUserIds.push(playerId);
  }
  saveAllCustomCodesInternal(allCodes);

  // Try syncing to Firestore (non-blocking)
  try {
    const codeRef = doc(db, 'custom_codes', matched.id);
    setDoc(codeRef, {
      redeemedCount: matched.redeemedCount,
      redeemedUserIds: matched.redeemedUserIds,
    }, { merge: true }).catch((err) => {
      console.warn('Firestore code redemption update fallback:', err);
    });
  } catch (err) {
    console.warn('Firestore code redemption update fallback:', err);
  }

  return {
    success: true,
    message: `🎉 Code "${clean}" Successfully Redeemed! Received +${matched.rewardJoules.toLocaleString()} Joules, +${matched.rewardXP || 0} XP${petRewardNote}`,
    updatedWallet: newWallet,
    code: matched,
  };
}
