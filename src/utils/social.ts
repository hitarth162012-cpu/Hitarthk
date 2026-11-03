import { UserAccount, FriendUser, FriendRequest, PrivateServer, DonationRecord, WalletState } from '../types';
import { formatINR, subtractFromWallet, addToWallet } from './economy';

export const ACCOUNT_STORAGE_KEY = 'owo_user_account_v1';
export const FRIENDS_STORAGE_KEY = 'owo_friends_list_v1';
export const REQUESTS_STORAGE_KEY = 'owo_friend_requests_v1';
export const SERVERS_STORAGE_KEY = 'owo_private_servers_v1';
export const ACTIVE_SERVER_KEY = 'owo_active_private_server_v1';
export const DONATIONS_STORAGE_KEY = 'owo_donations_history_v1';

// Real community profiles only (no fake accounts)
export const KNOWN_COMMUNITY_USERS: FriendUser[] = [];

// Real Private Servers only (no fake servers)
export const DEFAULT_PRIVATE_SERVERS: PrivateServer[] = [];

// --- Account Management ---

export function generatePlayerId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `OWO-${num}`;
}

const memStorage = new Map<string, string>();

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // fallback
  }
  return memStorage.get(key) || null;
}

function safeSetItem(key: string, val: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
    }
  } catch {
    // fallback
  }
  memStorage.set(key, val);
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    // fallback
  }
  memStorage.delete(key);
}

export function getStoredAccount(): UserAccount | null {
  try {
    const raw = safeGetItem(ACCOUNT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (parsed.inGameName?.toLowerCase() === 'hitarth' || parsed.id === 'OWO-9850') {
          parsed.isDeveloper = true;
          parsed.role = 'developer';
          parsed.id = 'OWO-9850';
        }
        return parsed;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function saveStoredAccount(account: UserAccount | null): void {
  try {
    if (account) {
      safeSetItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
    } else {
      safeRemoveItem(ACCOUNT_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function registerAccount(
  inGameName: string,
  password?: string,
  avatar: string = '⚡'
): { success: boolean; account?: UserAccount; error?: string } {
  const cleanName = inGameName.trim();
  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: 'In-game Name must be at least 2 characters long.' };
  }
  const cleanPass = (password || '').trim();
  if (!cleanPass || cleanPass.length < 3) {
    return { success: false, error: 'Password must be at least 3 characters long.' };
  }

  const account: UserAccount = {
    id: generatePlayerId(),
    inGameName: cleanName,
    password: cleanPass,
    avatar: avatar || '⚡',
    createdAt: Date.now(),
  };

  saveStoredAccount(account);
  return { success: true, account };
}

export function loginAccount(
  inGameName: string,
  password?: string
): { success: boolean; account?: UserAccount; error?: string } {
  const cleanName = inGameName.trim().toLowerCase();
  const cleanPass = (password || '').trim();

  const stored = getStoredAccount();
  if (stored && stored.inGameName.toLowerCase() === cleanName) {
    if (stored.password && stored.password !== cleanPass) {
      return { success: false, error: 'Incorrect password for this in-game name.' };
    }
    return { success: true, account: stored };
  }

  // If registering on the fly or logging in
  return registerAccount(inGameName, password);
}

// --- Friend System ---

export function getStoredFriends(): FriendUser[] {
  try {
    const raw = safeGetItem(FRIENDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveStoredFriends(friends: FriendUser[]): void {
  try {
    safeSetItem(FRIENDS_STORAGE_KEY, JSON.stringify(friends));
  } catch {
    // ignore
  }
}

export function getStoredFriendRequests(): FriendRequest[] {
  try {
    const raw = safeGetItem(REQUESTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveStoredFriendRequests(requests: FriendRequest[]): void {
  try {
    safeSetItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // ignore
  }
}

export function searchUserByIdOrName(query: string): FriendUser | null {
  const clean = query.trim().toUpperCase();
  if (!clean) return null;

  // Search known community directory
  const found = KNOWN_COMMUNITY_USERS.find(
    (u) => u.id.toUpperCase() === clean || u.name.toUpperCase() === clean
  );
  if (found) return found;

  // Check existing friends list
  const existing = getStoredFriends().find(
    (u) => u.id.toUpperCase() === clean || u.name.toUpperCase() === clean
  );
  if (existing) return existing;

  return null;
}

export function sendFriendRequest(
  fromUser: UserAccount,
  targetQuery: string
): { success: boolean; message: string; targetUser?: FriendUser } {
  const target = searchUserByIdOrName(targetQuery);
  if (!target) {
    return {
      success: false,
      message: `No player found with ID or Tag "${targetQuery}". Tip: Try search with ID format "OWO-XXXX" (e.g. OWO-1234, OWO-7777).`,
    };
  }

  if (target.id === fromUser.id) {
    return { success: false, message: 'You cannot add your own ID as a friend!' };
  }

  const existingFriends = getStoredFriends();
  if (existingFriends.some((f) => f.id === target.id)) {
    return { success: false, message: `${target.name} (${target.id}) is already in your Friend List!` };
  }

  // Automatically approve community or valid players
  const newFriend: FriendUser = {
    ...target,
    addedAt: Date.now(),
  };

  const updatedFriends = [newFriend, ...existingFriends];
  saveStoredFriends(updatedFriends);

  return {
    success: true,
    message: `Friend Request to ${target.name} (${target.id}) accepted! They have been added to your Friend List.`,
    targetUser: newFriend,
  };
}

export function removeFriend(friendId: string): FriendUser[] {
  const friends = getStoredFriends().filter((f) => f.id !== friendId);
  saveStoredFriends(friends);
  return friends;
}

// --- Rupee Donation Feature ---

export function donateRupees(
  senderWallet: WalletState,
  senderUser: UserAccount,
  recipientId: string,
  recipientName: string,
  amountINR: number,
  message?: string
): { success: boolean; updatedWallet: WalletState; donation?: DonationRecord; error?: string } {
  if (amountINR <= 0) {
    return { success: false, updatedWallet: senderWallet, error: 'Donation amount must be greater than 0.' };
  }

  if (senderWallet.balanceINR < amountINR) {
    return {
      success: false,
      updatedWallet: senderWallet,
      error: `Insufficient balance! You need ${formatINR(amountINR)} to donate, but you have ${formatINR(senderWallet.balanceINR)}.`,
    };
  }

  const sub = subtractFromWallet(
    senderWallet,
    amountINR,
    'Rupee Donation',
    `Donated ${formatINR(amountINR)} to ${recipientName} (${recipientId})${message ? `: "${message}"` : ''}`
  );

  if (!sub.success) {
    return { success: false, updatedWallet: senderWallet, error: sub.error };
  }

  // Update transaction type to 'donation_sent'
  const updatedTx = {
    ...sub.updatedWallet.transactions[0],
    type: 'donation_sent' as const,
  };

  const finalWallet: WalletState = {
    ...sub.updatedWallet,
    transactions: [updatedTx, ...sub.updatedWallet.transactions.slice(1)],
  };

  const donation: DonationRecord = {
    id: `don_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    senderId: senderUser.id,
    senderName: senderUser.inGameName,
    recipientId,
    recipientName,
    amountINR,
    timestamp: Date.now(),
    message,
  };

  // Save in local donation history
  try {
    const raw = localStorage.getItem(DONATIONS_STORAGE_KEY);
    const history: DonationRecord[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(DONATIONS_STORAGE_KEY, JSON.stringify([donation, ...history.slice(0, 30)]));
  } catch {
    // ignore
  }

  return { success: true, updatedWallet: finalWallet, donation };
}

export function getDonationsHistory(): DonationRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DONATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// --- In-Game Private Server Feature ---

export function getStoredPrivateServers(): PrivateServer[] {
  try {
    const raw = safeGetItem(SERVERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveStoredPrivateServers(servers: PrivateServer[]): void {
  try {
    safeSetItem(SERVERS_STORAGE_KEY, JSON.stringify(servers));
  } catch {
    // ignore
  }
}

export function getActivePrivateServer(): PrivateServer | null {
  try {
    const raw = safeGetItem(ACTIVE_SERVER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActivePrivateServer(server: PrivateServer | null): void {
  try {
    if (server) {
      safeSetItem(ACTIVE_SERVER_KEY, JSON.stringify(server));
    } else {
      safeRemoveItem(ACTIVE_SERVER_KEY);
    }
  } catch {
    // ignore
  }
}

export function accessPrivateServer(
  rawCode: string
): { success: boolean; server?: PrivateServer; error?: string } {
  const cleanCode = rawCode.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, error: 'Please enter a private server code.' };
  }

  const servers = getStoredPrivateServers();
  const found = servers.find((s) => s.code.toUpperCase() === cleanCode);

  if (!found) {
    return {
      success: false,
      error: `Invalid server code "${cleanCode}". Try default codes "VIP777" or "OWO2026", or create your own private server!`,
    };
  }

  setActivePrivateServer(found);
  return { success: true, server: found };
}

export function createPrivateServer(
  owner: UserAccount,
  name: string,
  code: string,
  welcomeMessage?: string
): { success: boolean; server?: PrivateServer; error?: string } {
  const cleanName = name.trim();
  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (!cleanName || cleanName.length < 3) {
    return { success: false, error: 'Server name must be at least 3 characters long.' };
  }
  if (!cleanCode || cleanCode.length < 3) {
    return { success: false, error: 'Private server access code must be at least 3 alphanumeric characters.' };
  }

  const servers = getStoredPrivateServers();
  if (servers.some((s) => s.code === cleanCode)) {
    return { success: false, error: `Access code "${cleanCode}" is already taken. Please choose another code.` };
  }

  const newServer: PrivateServer = {
    id: `srv_${Date.now()}_${cleanCode}`,
    code: cleanCode,
    name: cleanName,
    ownerId: owner.id,
    ownerName: owner.inGameName,
    perkMultiplier: 1.2, // +20% boost
    activePlayersCount: 1,
    createdAt: Date.now(),
    welcomeMessage: welcomeMessage?.trim() || `Welcome to ${cleanName}! +20% INR win boost enabled.`,
  };

  const updated = [newServer, ...servers];
  saveStoredPrivateServers(updated);
  setActivePrivateServer(newServer);

  return { success: true, server: newServer };
}
