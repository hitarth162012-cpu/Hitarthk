import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ChatChannel, ChatMessage, ChatServer, UserAccount } from '../types';

export const DEFAULT_CHANNELS: ChatChannel[] = [
  {
    id: 'announcements',
    serverId: 'hitarth_official',
    name: 'announcements',
    topic: 'Official updates, releases and news from Hitarth and HITARTH Bot.',
    category: 'TEXT CHANNELS',
    isLocked: true,
  },
  {
    id: 'general',
    serverId: 'hitarth_official',
    name: 'general',
    topic: 'General conversation, hangout, and community chat.',
    category: 'TEXT CHANNELS',
  },
  {
    id: 'bot-commands',
    serverId: 'hitarth_official',
    name: 'bot-commands',
    topic: 'Primary playground for /owo commands: /owo balance, /owo daily, /owo work, /owo help.',
    category: 'BOT COMMANDS',
  },
  {
    id: 'games',
    serverId: 'hitarth_official',
    name: 'games',
    topic: 'Virtual minigames arena: /owo cf, /owo s, /owo highlow, /owo dice, /owo rps.',
    category: 'GAMES & EXPEDITIONS',
  },
  {
    id: 'hunting',
    serverId: 'hitarth_official',
    name: 'hunting',
    topic: 'Safari creature expeditions: /owo hunt, /owo animals, /owo explore.',
    category: 'GAMES & EXPEDITIONS',
  },
  {
    id: 'battles',
    serverId: 'hitarth_official',
    name: 'battles',
    topic: 'Creature combat & duels: /owo battle @user, /owo pet, /owo equip, /owo team.',
    category: 'CREATURE BATTLES',
  },
  {
    id: 'team-chat',
    serverId: 'hitarth_official',
    name: 'team-chat',
    topic: 'Multiplayer guilds & squad raids: /owo team create, /owo team battle.',
    category: 'CREATURE BATTLES',
  },
  {
    id: 'leaderboard',
    serverId: 'hitarth_official',
    name: 'leaderboard',
    topic: 'Richest and most legendary players: /owo leaderboard, /owo level.',
    category: 'BOT COMMANDS',
  },
];

export const DEFAULT_SERVERS: ChatServer[] = [
  {
    id: 'hitarth_official',
    name: 'HITARTH Official',
    icon: '⚡',
    description: 'The flagship community server for Discord chat, bot gaming & developer studio.',
    ownerId: 'OWO-9850',
    channels: DEFAULT_CHANNELS,
  },
  {
    id: 'arcade_arena',
    name: 'Arcade Arena',
    icon: '🎰',
    description: 'High-stakes bot minigames, coin flips, slots tourneys and dice showdowns.',
    ownerId: 'OWO-9850',
    channels: [
      { id: 'arcade-general', serverId: 'arcade_arena', name: 'arcade-general', category: 'TEXT CHANNELS' },
      { id: 'high-stakes', serverId: 'arcade_arena', name: 'high-stakes', category: 'GAMES & EXPEDITIONS' },
      { id: 'slots-hall', serverId: 'arcade_arena', name: 'slots-hall', category: 'GAMES & EXPEDITIONS' },
    ],
  },
  {
    id: 'safari_guild',
    name: 'Safari Hunters Guild',
    icon: '🦁',
    description: 'Expeditions into Indian wetlands & peaks to discover mythical beasts.',
    ownerId: 'OWO-9850',
    channels: [
      { id: 'hunters-lounge', serverId: 'safari_guild', name: 'hunters-lounge', category: 'TEXT CHANNELS' },
      { id: 'beast-sightings', serverId: 'safari_guild', name: 'beast-sightings', category: 'GAMES & EXPEDITIONS' },
      { id: 'trade-market', serverId: 'safari_guild', name: 'trade-market', category: 'BOT COMMANDS' },
    ],
  },
];

const STORAGE_CHANNELS_KEY = 'hitarth_custom_channels_v2';
const STORAGE_MESSAGES_KEY_PREFIX = 'hitarth_cached_messages_';

/**
 * Get channels for a server (merging default + user-created channels)
 */
export function getStoredChannels(serverId: string): ChatChannel[] {
  if (typeof window === 'undefined') return DEFAULT_CHANNELS;
  try {
    const raw = localStorage.getItem(`${STORAGE_CHANNELS_KEY}_${serverId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  const s = DEFAULT_SERVERS.find((srv) => srv.id === serverId);
  return s ? s.channels : DEFAULT_CHANNELS;
}

export function saveStoredChannels(serverId: string, channels: ChatChannel[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_CHANNELS_KEY}_${serverId}`, JSON.stringify(channels));
  } catch {
    // ignore
  }
}

/**
 * Add a new channel to a server
 */
export function addChannel(serverId: string, newChannel: ChatChannel): ChatChannel[] {
  const current = getStoredChannels(serverId);
  const updated = [...current, newChannel];
  saveStoredChannels(serverId, updated);
  return updated;
}

/**
 * Seed initial welcoming messages if a channel is fresh
 */
export function getInitialSeedMessages(channelId: string): ChatMessage[] {
  const now = Date.now();
  if (channelId === 'announcements') {
    return [
      {
        id: 'seed_announcement_1',
        channelId,
        serverId: 'hitarth_official',
        senderId: 'OWO-9850',
        senderName: 'Hitarth',
        senderAvatar: '👑',
        isDeveloper: true,
        role: 'developer',
        content: '🎉 **Welcome to the brand new HITARTH Discord-Style Chat & Game Bot System!**\nAll bot games are now integrated directly inside the chat channels. Try `/owo help` or `/owo balance` to get started!',
        timestamp: now - 3600000,
        isPinned: true,
        reactions: { '❤️': ['OWO-9850'], '🚀': ['OWO-9850'] },
      },
    ];
  }

  if (channelId === 'bot-commands' || channelId === 'general') {
    return [
      {
        id: 'seed_bot_intro',
        channelId,
        serverId: 'hitarth_official',
        senderId: 'hitarth_bot',
        senderName: 'HITARTH BOT',
        senderAvatar: '🤖',
        isBot: true,
        role: 'bot',
        content: '🤖 Hello everyone! I am the **HITARTH Chat Game Bot**.\nType `/owo help` to explore economy, minigames, creature safari hunting, and multiplayer team commands directly in this channel.',
        timestamp: now - 1800000,
        isPinned: true,
        botCard: {
          type: 'info',
          title: 'HITARTH BOT READY',
          subtitle: 'Discord-Integrated Game System',
          color: '#8b5cf6',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Slash Commands', value: 'Type `/` in the box below to see instant interactive suggestions.', inline: true },
            { label: 'Virtual Currency', value: '⚡ **Joules** (100% free virtual play credits)', inline: true },
            { label: 'Quick Start', value: '`/owo daily` • `/owo work` • `/owo hunt` • `/owo cf 200`', inline: false },
          ],
          footer: 'Non-gambling entertainment • Preserves all player data across sessions.',
        },
      },
    ];
  }

  return [];
}

/**
 * Get cached messages from localStorage
 */
export function getCachedMessages(channelId: string): ChatMessage[] {
  if (typeof window === 'undefined') return getInitialSeedMessages(channelId);
  try {
    const raw = localStorage.getItem(`${STORAGE_MESSAGES_KEY_PREFIX}${channelId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return getInitialSeedMessages(channelId);
}

/**
 * Save cached messages to localStorage
 */
export function saveCachedMessages(channelId: string, msgs: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${STORAGE_MESSAGES_KEY_PREFIX}${channelId}`,
      JSON.stringify(msgs.slice(-100))
    );
  } catch {
    // ignore
  }
}

// Reactive channel subscribers for instant local and multi-tab responsiveness
const channelSubscribers = new Map<string, Set<(msgs: ChatMessage[]) => void>>();

function notifyChannelSubscribers(channelId: string, messages: ChatMessage[]) {
  const listeners = channelSubscribers.get(channelId);
  if (listeners) {
    listeners.forEach((listener) => {
      try {
        listener(messages);
      } catch (err) {
        console.error('Subscriber notification error:', err);
      }
    });
  }
}

// Strip undefined fields recursively to prevent Firestore unsupported field value errors
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

/**
 * Send a message to Firestore & local cache
 */
export async function sendChatMessage(
  channelId: string,
  serverId: string,
  msg: Omit<ChatMessage, 'id' | 'timestamp' | 'channelId' | 'serverId'>
): Promise<ChatMessage> {
  const newMsg: ChatMessage = {
    ...msg,
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    channelId,
    serverId,
    timestamp: Date.now(),
    reactions: msg.reactions || {},
  };

  // 1. Optimistic local cache update and instant subscriber notification
  const current = getCachedMessages(channelId);
  const updated = [...current, newMsg];
  saveCachedMessages(channelId, updated);
  notifyChannelSubscribers(channelId, updated);

  // 2. Sync to Firebase Firestore in background without blocking instant chat response
  try {
    const channelDocRef = doc(db, 'channels', channelId);
    const msgsCol = collection(channelDocRef, 'messages');
    const safeData = cleanForFirestore(newMsg);
    setDoc(doc(msgsCol, newMsg.id), safeData).catch((err) => {
      console.warn('Firestore message sync fallback to local:', err);
    });
  } catch (err) {
    console.warn('Firestore message sync fallback to local:', err);
  }

  return newMsg;
}

/**
 * Subscribe to real-time messages for a channel
 */
export function subscribeChannelMessages(
  channelId: string,
  onUpdate: (messages: ChatMessage[]) => void
): Unsubscribe {
  // Register local memory subscriber
  if (!channelSubscribers.has(channelId)) {
    channelSubscribers.set(channelId, new Set());
  }
  channelSubscribers.get(channelId)!.add(onUpdate);

  // Emit initial local cache immediately
  onUpdate(getCachedMessages(channelId));

  // Firestore real-time listener
  let cloudUnsub: Unsubscribe = () => {};
  try {
    const channelDocRef = doc(db, 'channels', channelId);
    const msgsCol = collection(channelDocRef, 'messages');
    const q = query(msgsCol, orderBy('timestamp', 'asc'), limit(60));

    cloudUnsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudMsgs: ChatMessage[] = [];
          snapshot.forEach((snap) => {
            cloudMsgs.push(snap.data() as ChatMessage);
          });
          // Merge with local cached messages and seed pinned messages
          const seed = getInitialSeedMessages(channelId);
          const currentLocal = getCachedMessages(channelId);
          const map = new Map<string, ChatMessage>();
          seed.forEach((m) => map.set(m.id, m));
          currentLocal.forEach((m) => map.set(m.id, m));
          cloudMsgs.forEach((m) => map.set(m.id, m));
          const list = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
          saveCachedMessages(channelId, list);
          notifyChannelSubscribers(channelId, list);
        }
      },
      (error) => {
        console.warn('Firestore channel subscription fallback:', error);
      }
    );
  } catch (err) {
    console.warn('Firestore subscription init error:', err);
  }

  return () => {
    cloudUnsub();
    const subs = channelSubscribers.get(channelId);
    if (subs) {
      subs.delete(onUpdate);
      if (subs.size === 0) {
        channelSubscribers.delete(channelId);
      }
    }
  };
}

/**
 * Add / Toggle a reaction on a message
 */
export async function toggleMessageReaction(
  channelId: string,
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  const current = getCachedMessages(channelId);
  const updated = current.map((m) => {
    if (m.id === messageId) {
      const reactions = { ...(m.reactions || {}) };
      const users = reactions[emoji] || [];
      if (users.includes(userId)) {
        reactions[emoji] = users.filter((u) => u !== userId);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...users, userId];
      }
      return { ...m, reactions };
    }
    return m;
  });
  saveCachedMessages(channelId, updated);
  notifyChannelSubscribers(channelId, updated);

  try {
    const msgRef = doc(db, 'channels', channelId, 'messages', messageId);
    const target = updated.find((m) => m.id === messageId);
    if (target) {
      await updateDoc(msgRef, { reactions: target.reactions || {} });
    }
  } catch {
    // fallback
  }
}

/**
 * Pin or Unpin a message
 */
export async function togglePinMessage(
  channelId: string,
  messageId: string
): Promise<void> {
  const current = getCachedMessages(channelId);
  const updated = current.map((m) => {
    if (m.id === messageId) {
      return { ...m, isPinned: !m.isPinned };
    }
    return m;
  });
  saveCachedMessages(channelId, updated);
  notifyChannelSubscribers(channelId, updated);

  try {
    const msgRef = doc(db, 'channels', channelId, 'messages', messageId);
    const target = updated.find((m) => m.id === messageId);
    if (target) {
      await updateDoc(msgRef, { isPinned: target.isPinned || false });
    }
  } catch {
    // fallback
  }
}
