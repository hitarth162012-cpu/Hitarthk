export type ArcadeSubTab =
  | 'flip'
  | 'slots'
  | 'highlow'
  | 'hunt'
  | 'team'
  | 'battle'
  | 'multiplayer'
  | 'leaderboard'
  | 'friends'
  | 'private_server'
  | 'redeem'
  | 'chat'
  | 'dev_studio';

export interface InventoryItem {
  id: string;
  name: string;
  count: number;
  icon: string;
  description: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserAccount {
  id: string; // e.g. "OWO-9850"
  inGameName: string;
  password?: string;
  avatar: string;
  createdAt: number;
  uid?: string; // Firebase Auth UID
  email?: string;
  isCloudSynced?: boolean;
  isDeveloper?: boolean; // Hitarth OWO-9850
  role?: 'developer' | 'admin' | 'moderator' | 'player' | 'member';
  level?: number;
  xp?: number;
  inventory?: InventoryItem[];
  teamId?: string;
  teamName?: string;
  statusMessage?: string;
}

export interface CloudBattleRecord {
  id: string;
  type: 'boss' | 'pvp';
  userId: string;
  playerName: string;
  opponentName: string;
  result: 'win' | 'loss' | 'draw';
  rewardINR: number;
  petsUsed: string[];
  timestamp: string;
}

export interface FriendUser {
  id: string; // Player ID (e.g. OWO-XXXX)
  name: string;
  avatar: string;
  accumulatedINR: number;
  status: 'online' | 'in_game' | 'offline';
  petName?: string;
  petEmoji?: string;
  addedAt: number;
  isDeveloper?: boolean;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar: string;
  toId: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: number;
}

export interface PrivateServer {
  id: string;
  code: string; // Secret entry code e.g. "VIP777"
  name: string;
  ownerId: string;
  ownerName: string;
  perkMultiplier: number;
  activePlayersCount: number;
  createdAt: number;
  welcomeMessage: string;
}

export interface DonationRecord {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  amountINR: number;
  timestamp: number;
  message?: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  accumulatedINR: number;
  rank?: number;
  title: string;
  isCurrentPlayer?: boolean;
  petName?: string;
  petEmoji?: string;
  lastActive: string;
  level?: number;
}

// --- Economy & OwO Types ---
export interface Transaction {
  id: string;
  type:
    | 'win'
    | 'loss'
    | 'redeem'
    | 'hunt_sell'
    | 'daily'
    | 'work'
    | 'battle_reward'
    | 'multiplayer_duel'
    | 'donation_sent'
    | 'donation_received'
    | 'shop_purchase';
  game: string;
  amount: number; // positive or negative
  timestamp: number;
  note: string;
}

export interface PetAnimal {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  emoji: string;
  biome: string;
  valueINR: number; // value in Joules
  power: number;
  caughtAt: number;
  level: number;
  xp?: number;
}

export interface WalletState {
  balanceINR: number; // Joules balance (1:1 preservation)
  totalWonINR: number;
  totalLostINR: number;
  redeemedCodes: string[];
  lastDailyReward?: number;
  lastWorkReward?: number;
  pets: PetAnimal[];
  equippedPetId?: string;
  teamPetIds: string[]; // Up to 3 chosen battle pets
  inventory: InventoryItem[];
  level: number;
  xp: number;
  transactions: Transaction[];
  stats: {
    flipsPlayed: number;
    flipsWon: number;
    slotsSpun: number;
    slotsJackpots: number;
    huntsCount: number;
    battlesWon: number;
    multiplayerDuelsWon: number;
    workCount: number;
    dailyStreak: number;
  };
}

// --- Multiplayer Types ---
export interface MultiplayerPlayer {
  id: string;
  name: string;
  avatar: string;
  isReady: boolean;
  petTeam: PetAnimal[];
  betINR: number;
  choice?: string;
  currentHp: number;
  maxHp: number;
}

export interface MultiplayerRoom {
  id: string;
  code: string;
  gameMode: 'flip' | 'slots' | 'highlow' | 'hunt' | 'battle';
  status: 'waiting' | 'ready' | 'in_progress' | 'finished';
  stakeINR: number;
  host: MultiplayerPlayer;
  guest?: MultiplayerPlayer;
  currentTurn?: string;
  winnerId?: string;
  resultMessage?: string;
  logs: string[];
  lastUpdated: number;
  extraData?: {
    card?: { value: number; suit: string };
    nextCard?: { value: number; suit: string };
    slotReelsHost?: string[];
    slotReelsGuest?: string[];
    slotScoreHost?: number;
    slotScoreGuest?: number;
    huntPetHost?: { name: string; emoji: string; power: number };
    huntPetGuest?: { name: string; emoji: string; power: number };
  };
}

// ==========================================
// --- DISCORD-STYLE CHAT & BOT TYPES ---
// ==========================================

export interface BotCardField {
  label: string;
  value: string;
  inline?: boolean;
}

export interface BotCardAction {
  id: string;
  label: string;
  style?: 'primary' | 'secondary' | 'success' | 'danger';
  command?: string;
}

export interface BotCardData {
  type:
    | 'balance'
    | 'daily'
    | 'work'
    | 'give'
    | 'shop'
    | 'inventory'
    | 'profile'
    | 'leaderboard'
    | 'level'
    | 'cf'
    | 's'
    | 'highlow'
    | 'dice'
    | 'rps'
    | 'hunt'
    | 'animals'
    | 'pet'
    | 'battle'
    | 'team'
    | 'equip'
    | 'explore'
    | 'team_create'
    | 'team_info'
    | 'team_invite'
    | 'team_join'
    | 'team_leave'
    | 'team_battle'
    | 'team_leaderboard'
    | 'help'
    | 'error'
    | 'info';
  title: string;
  subtitle?: string;
  color: string; // e.g. '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'
  author?: {
    name: string;
    icon?: string;
  };
  fields?: BotCardField[];
  footer?: string;
  imageEmoji?: string;
  progress?: {
    current: number;
    max: number;
    label: string;
  };
  actions?: BotCardAction[];
  extra?: any;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  serverId: string;
  senderId: string; // player id or "hitarth_bot"
  senderName: string;
  senderAvatar: string;
  isBot?: boolean;
  isDeveloper?: boolean;
  role?: 'developer' | 'admin' | 'moderator' | 'bot' | 'member';
  content: string;
  timestamp: number;
  reactions?: Record<string, string[]>; // emoji -> [userId, ...]
  isPinned?: boolean;
  editedAt?: number;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  botCard?: BotCardData;
}

export interface ChatChannel {
  id: string;
  serverId: string;
  name: string;
  topic?: string;
  category: 'TEXT CHANNELS' | 'BOT COMMANDS' | 'GAMES & EXPEDITIONS' | 'CREATURE BATTLES';
  isLocked?: boolean;
  isPrivate?: boolean;
  unreadCount?: number;
}

export interface ChatServer {
  id: string;
  name: string;
  icon: string;
  description: string;
  ownerId: string;
  channels: ChatChannel[];
  isCustom?: boolean;
}

export interface GuildTeam {
  id: string;
  name: string;
  tag: string;
  leaderId: string;
  leaderName: string;
  memberIds: string[];
  members: { id: string; name: string; avatar: string; role: 'leader' | 'member' }[];
  power: number;
  battlesWon: number;
  joulesBank: number;
  createdAt: number;
  level: number;
}

// ==========================================
// --- HITARTH DEVELOPER STUDIO TYPES ---
// ==========================================

export interface DevStudioFile {
  id: string;
  path: string; // e.g. "HITARTH/frontend/chat/components/ChatArea.tsx"
  name: string;
  extension: 'ts' | 'tsx' | 'json' | 'rules' | 'css' | 'md' | 'js';
  content: string;
  isFolder?: boolean;
  parentId?: string;
  isReadOnly?: boolean;
  modified?: boolean;
}

export interface DevConsoleLog {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
  source?: string;
}

// ==========================================
// --- DEVELOPER CUSTOM GAME CODES ---
// ==========================================

export interface CustomGameCode {
  id: string;
  code: string; // The secret code string, e.g. "HITARTH_MEGA_2026"
  createdAt: number;
  createdBy: string; // "Hitarth" (OWO-9850)
  rewardJoules: number; // customizable number
  rewardXP: number; // customizable number
  bonusPetName?: string; // customizable pet name
  bonusPetEmoji?: string;
  bonusPetRarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  bonusPetPower?: number;
  maxUses?: number; // 0 or undefined for unlimited
  redeemedCount: number;
  redeemedUserIds: string[];
  isActive: boolean;
  notes?: string;
}
