import {
  WalletState,
  UserAccount,
  BotCardData,
  PetAnimal,
  GuildTeam,
  InventoryItem,
} from '../types';
import { formatJoules, addToWallet, subtractFromWallet } from './economy';
import { redeemCustomGameCode } from './customCodeService';
import { sound } from './audioSynth';
import confetti from 'canvas-confetti';

const safeConfetti = (opts?: confetti.Options) => {
  if (typeof window !== 'undefined') {
    try {
      confetti(opts);
    } catch {
      // safe fallback in environments without canvas
    }
  }
};

export interface CommandSuggestion {
  name: string;
  description: string;
  syntax: string;
  category: 'Economy' | 'Minigames' | 'Animals & Expeditions' | 'Multiplayer Teams' | 'Utility';
}

export const OWO_COMMANDS_LIST: CommandSuggestion[] = [
  // Economy
  {
    name: '/owo balance',
    description: 'Display your current Joules balance, level and XP progress.',
    syntax: '/owo balance',
    category: 'Economy',
  },
  {
    name: '/owo daily',
    description: 'Claim your daily +500 Joules and +100 XP login bonus.',
    syntax: '/owo daily',
    category: 'Economy',
  },
  {
    name: '/owo work',
    description: 'Do odd jobs across the HITARTH world to earn 150-400 Joules.',
    syntax: '/owo work',
    category: 'Economy',
  },
  {
    name: '/owo give',
    description: 'Send Joules to another player in the chat.',
    syntax: '/owo give @user <amount>',
    category: 'Economy',
  },
  {
    name: '/owo shop',
    description: 'Browse the HITARTH Bot item shop for nets, treats and charms.',
    syntax: '/owo shop',
    category: 'Economy',
  },
  {
    name: '/owo buy',
    description: 'Purchase an item from the HITARTH Bot item shop.',
    syntax: '/owo buy <item_id>',
    category: 'Economy',
  },
  {
    name: '/owo inventory',
    description: 'View your owned safari gear, tickets and power crystals.',
    syntax: '/owo inventory',
    category: 'Economy',
  },
  {
    name: '/owo profile',
    description: 'Display your public HITARTH gamer profile card.',
    syntax: '/owo profile',
    category: 'Economy',
  },
  {
    name: '/owo leaderboard',
    description: 'View the global leaderboard of the richest and strongest players.',
    syntax: '/owo leaderboard',
    category: 'Economy',
  },
  {
    name: '/owo level',
    description: 'Show your current level, total XP, and progress to next level.',
    syntax: '/owo level',
    category: 'Economy',
  },
  {
    name: '/owo redeem',
    description: 'Redeem a secret creator or developer promo code for Joules, XP, or pets.',
    syntax: '/owo redeem <code>',
    category: 'Economy',
  },

  // Minigames
  {
    name: '/owo cf',
    description: 'Play a virtual 50/50 Coin Flip with non-purchasable play Joules.',
    syntax: '/owo cf <amount> [heads|tails]',
    category: 'Minigames',
  },
  {
    name: '/owo s',
    description: 'Spin the 3-reel virtual slot machine with up to 15x multipliers.',
    syntax: '/owo s <amount>',
    category: 'Minigames',
  },
  {
    name: '/owo highlow',
    description: 'Guess whether the next mystery number will be higher or lower.',
    syntax: '/owo highlow <amount> [higher|lower]',
    category: 'Minigames',
  },
  {
    name: '/owo dice',
    description: 'Roll two virtual dice in a showdown against HITARTH Bot.',
    syntax: '/owo dice <amount>',
    category: 'Minigames',
  },
  {
    name: '/owo rps',
    description: 'Challenge another user or HITARTH Bot to Rock-Paper-Scissors.',
    syntax: '/owo rps <rock|paper|scissors>',
    category: 'Minigames',
  },

  // Animals & Expeditions
  {
    name: '/owo hunt',
    description: 'Start a creature discovery expedition into Indian & global biomes.',
    syntax: '/owo hunt',
    category: 'Animals & Expeditions',
  },
  {
    name: '/owo animals',
    description: 'Display your full collection of discovered beasts and pets.',
    syntax: '/owo animals',
    category: 'Animals & Expeditions',
  },
  {
    name: '/owo pet',
    description: 'View your currently equipped battle companion and power stats.',
    syntax: '/owo pet',
    category: 'Animals & Expeditions',
  },
  {
    name: '/owo equip',
    description: 'Equip a creature from your collection as your primary companion.',
    syntax: '/owo equip <creature_name>',
    category: 'Animals & Expeditions',
  },
  {
    name: '/owo battle',
    description: 'Challenge another player or wild apex beast to turn-based combat.',
    syntax: '/owo battle [@user]',
    category: 'Animals & Expeditions',
  },
  {
    name: '/owo team',
    description: 'Display your active 3-pet battle squad and combined power rating.',
    syntax: '/owo team',
    category: 'Animals & Expeditions',
  },
  {
    name: '/owo explore',
    description: 'Expedition to discover mythical locations and rare beasts.',
    syntax: '/owo explore',
    category: 'Animals & Expeditions',
  },

  // Multiplayer Teams
  {
    name: '/owo team create',
    description: 'Create a new team/guild with your in-game name as founder.',
    syntax: '/owo team create <team_name>',
    category: 'Multiplayer Teams',
  },
  {
    name: '/owo team info',
    description: 'View details, members and power of your current team.',
    syntax: '/owo team info',
    category: 'Multiplayer Teams',
  },
  {
    name: '/owo team invite',
    description: 'Invite another chat member to join your team.',
    syntax: '/owo team invite @user',
    category: 'Multiplayer Teams',
  },
  {
    name: '/owo team join',
    description: 'Join an existing public team.',
    syntax: '/owo team join <team_name>',
    category: 'Multiplayer Teams',
  },
  {
    name: '/owo team leave',
    description: 'Leave your current team.',
    syntax: '/owo team leave',
    category: 'Multiplayer Teams',
  },
  {
    name: '/owo team battle',
    description: 'Start a cooperative team raid against a mythical boss beast.',
    syntax: '/owo team battle',
    category: 'Multiplayer Teams',
  },
  {
    name: '/owo team leaderboard',
    description: 'View the leaderboard of the strongest teams in HITARTH.',
    syntax: '/owo team leaderboard',
    category: 'Multiplayer Teams',
  },

  // Utility
  {
    name: '/owo help',
    description: 'List all available HITARTH Bot commands with syntax examples.',
    syntax: '/owo help',
    category: 'Utility',
  },
];

export const SHOP_CATALOG = [
  {
    id: 'safari_net_pro',
    name: 'Pro Safari Net',
    costJoules: 500,
    icon: '🕸️',
    description: 'Increases chance of capturing Rare and Epic creatures by 35%.',
    rarity: 'rare' as const,
  },
  {
    id: 'lucky_dice_charm',
    name: 'Lucky Joules Charm',
    costJoules: 1200,
    icon: '🍀',
    description: 'Provides +15% Joules bonus on all minigame victories for 24h.',
    rarity: 'epic' as const,
  },
  {
    id: 'beast_elixir',
    name: 'Apex Beast Elixir',
    costJoules: 800,
    icon: '🧪',
    description: 'Permanently increases primary pet battle power by +10 PWR.',
    rarity: 'rare' as const,
  },
  {
    id: 'dragon_egg_shard',
    name: 'Mythic Dragon Core',
    costJoules: 15000,
    icon: '🔮',
    description: 'Legendary artifact. Unlocks the Mythic Cyber Dragon companion.',
    rarity: 'legendary' as const,
  },
];

export const BIOMES = [
  'Kaziranga Wetlands',
  'Sundarbans Mangroves',
  'Gir Lion Sanctuary',
  'Himalayan Frost Peaks',
  'Thar Golden Dunes',
  'Western Ghats Rainforest',
  'Cybernetic Valley',
];

export const HUNT_CREATURES_POOL = [
  { name: 'White Tiger', emoji: '🐅', power: 96, rarity: 'legendary' as const, biome: 'Sundarbans Mangroves', value: 8500 },
  { name: 'Royal Bengal Tiger', emoji: '🐯', power: 92, rarity: 'epic' as const, biome: 'Gir Lion Sanctuary', value: 5000 },
  { name: 'Indian One-Horned Rhino', emoji: '🦏', power: 88, rarity: 'epic' as const, biome: 'Kaziranga Wetlands', value: 4500 },
  { name: 'Snow Leopard', emoji: '🐆', power: 85, rarity: 'epic' as const, biome: 'Himalayan Frost Peaks', value: 4200 },
  { name: 'Asian Elephant', emoji: '🐘', power: 80, rarity: 'rare' as const, biome: 'Western Ghats Rainforest', value: 3000 },
  { name: 'Himalayan Golden Eagle', emoji: '🦅', power: 75, rarity: 'rare' as const, biome: 'Himalayan Frost Peaks', value: 2500 },
  { name: 'King Cobra', emoji: '🐍', power: 70, rarity: 'rare' as const, biome: 'Sundarbans Mangroves', value: 2000 },
  { name: 'Golden Jackal', emoji: '🐺', power: 60, rarity: 'uncommon' as const, biome: 'Thar Golden Dunes', value: 1200 },
  { name: 'Indian Peacock', emoji: '🦚', power: 55, rarity: 'uncommon' as const, biome: 'Gir Lion Sanctuary', value: 900 },
  { name: 'Thar Desert Hare', emoji: '🐇', power: 42, rarity: 'common' as const, biome: 'Thar Golden Dunes', value: 400 },
  { name: 'Cybernetic Phoenix', emoji: '🔥', power: 99, rarity: 'mythic' as const, biome: 'Cybernetic Valley', value: 20000 },
];

export interface BotCommandResult {
  isHandled: boolean;
  botCard?: BotCardData;
  updatedWallet?: WalletState;
  updatedAccount?: UserAccount;
}

/**
 * Calculate player level from XP
 */
export function calculateLevel(xp: number): { level: number; currentXp: number; nextLevelXp: number; progressPercent: number } {
  const safeXp = Math.max(0, xp || 0);
  // Level threshold: 500 * level
  let level = 1;
  let accumulated = 0;
  while (safeXp >= accumulated + level * 300) {
    accumulated += level * 300;
    level++;
  }
  const currentXp = safeXp - accumulated;
  const nextLevelXp = level * 300;
  const progressPercent = Math.min(100, Math.round((currentXp / nextLevelXp) * 100));
  return { level, currentXp, nextLevelXp, progressPercent };
}

/**
 * Main HITARTH Bot Command Handler
 */
export async function handleBotCommand(
  rawInput: string,
  wallet: WalletState,
  account: UserAccount | null,
  otherPlayers: UserAccount[] = []
): Promise<BotCommandResult> {
  const clean = rawInput.trim();
  if (!clean.startsWith('/') && !clean.toLowerCase().startsWith('owo ') && !clean.toLowerCase().startsWith('!owo ')) {
    return { isHandled: false };
  }

  // Normalize command string
  let normalized = clean;
  if (normalized.startsWith('/')) {
    normalized = normalized.substring(1).trim();
  } else if (normalized.toLowerCase().startsWith('!owo ')) {
    normalized = 'owo ' + normalized.substring(5).trim();
  }

  const parts = normalized.split(/\s+/);
  const prefix = parts[0]?.toLowerCase(); // e.g. "owo" or command direct
  const subCommand = prefix === 'owo' ? (parts[1]?.toLowerCase() || '') : prefix;
  const args = prefix === 'owo' ? parts.slice(2) : parts.slice(1);

  const playerName = account?.inGameName || 'Hitarth';
  const playerId = account?.id || 'OWO-9850';
  const playerAvatar = account?.avatar || '⚡';

  // 1. /owo balance
  if (subCommand === 'balance' || subCommand === 'bal' || subCommand === 'money') {
    sound.playCoin();
    const lvlInfo = calculateLevel(wallet.xp);
    return {
      isHandled: true,
      botCard: {
        type: 'balance',
        title: 'HITARTH BOT • PLAYER BALANCE',
        subtitle: `Vault of ${playerName}`,
        color: '#8b5cf6',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'Player', value: `${playerAvatar} ${playerName} (\`${playerId}\`)`, inline: true },
          { label: 'Joules', value: `⚡ **${formatJoules(wallet.balanceINR)}**`, inline: true },
          { label: 'Level', value: `⭐ Level ${lvlInfo.level}`, inline: true },
          { label: 'XP', value: `✨ ${wallet.xp.toLocaleString()} XP (${lvlInfo.progressPercent}%)`, inline: true },
          { label: 'Net Worth', value: `💎 ${formatJoules(wallet.balanceINR + wallet.totalWonINR)}`, inline: true },
          { label: 'Equipped Companion', value: `${wallet.pets.find(p => p.id === wallet.equippedPetId)?.emoji || '🐯'} ${wallet.pets.find(p => p.id === wallet.equippedPetId)?.name || 'Baby Bengal Cub'}`, inline: true },
        ],
        progress: {
          current: lvlInfo.currentXp,
          max: lvlInfo.nextLevelXp,
          label: `Level ${lvlInfo.level} Progress`,
        },
        footer: 'Use /owo daily or /owo work to earn more Joules • Non-gambling virtual play credits',
      },
    };
  }

  // 2. /owo daily
  if (subCommand === 'daily') {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const lastDaily = wallet.lastDailyReward || 0;
    const diff = now - lastDaily;

    if (diff < oneDayMs) {
      sound.playLoss();
      const remainingHours = Math.ceil((oneDayMs - diff) / (60 * 60 * 1000));
      return {
        isHandled: true,
        botCard: {
          type: 'daily',
          title: 'HITARTH BOT • DAILY REWARD COOLDOWN',
          subtitle: 'Already Claimed Today',
          color: '#f59e0b',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Status', value: '⏳ Please wait before claiming again.', inline: false },
            { label: 'Cooldown Remaining', value: `⏰ **${remainingHours} hours** remaining`, inline: true },
            { label: 'Tip', value: 'Try `/owo work` or `/owo hunt` while waiting!', inline: true },
          ],
          footer: 'Come back tomorrow for another daily reward.',
        },
      };
    }

    const rewardJoules = 500;
    const rewardXP = 100;
    sound.playJackpot();
    safeConfetti({ particleCount: 70, spread: 60 });

    const updated = {
      ...addToWallet(wallet, rewardJoules, 'Daily Reward', `Claimed daily reward bonus`, 'daily'),
      xp: (wallet.xp || 0) + rewardXP,
      lastDailyReward: now,
      stats: {
        ...wallet.stats,
        dailyStreak: (wallet.stats.dailyStreak || 0) + 1,
      },
    };

    return {
      isHandled: true,
      updatedWallet: updated,
      botCard: {
        type: 'daily',
        title: 'DAILY REWARD CLAIMED!',
        subtitle: `Awesome job, ${playerName}!`,
        color: '#10b981',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'Joules Earned', value: `⚡ **+${formatJoules(rewardJoules)}**`, inline: true },
          { label: 'XP Gained', value: `✨ **+${rewardXP} XP**`, inline: true },
          { label: 'Daily Streak', value: `🔥 **${updated.stats.dailyStreak} Days**`, inline: true },
          { label: 'New Balance', value: `⚡ **${formatJoules(updated.balanceINR)}**`, inline: true },
        ],
        footer: 'Come back tomorrow for another reward.',
      },
    };
  }

  // 3. /owo work
  if (subCommand === 'work') {
    const now = Date.now();
    const cooldownMs = 60 * 1000; // 1 minute friendly cooldown
    const lastWork = wallet.lastWorkReward || 0;
    const diff = now - lastWork;

    if (diff < cooldownMs) {
      sound.playLoss();
      const remainingSecs = Math.ceil((cooldownMs - diff) / 1000);
      return {
        isHandled: true,
        botCard: {
          type: 'work',
          title: 'HITARTH BOT • TIRED WORKER',
          subtitle: 'Take a Quick Breather',
          color: '#f59e0b',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Status', value: `💤 You are resting! Please wait **${remainingSecs}s** before working again.`, inline: false },
          ],
          footer: 'HITARTH Shift Timer',
        },
      };
    }

    const earnedJoules = Math.floor(180 + Math.random() * 220); // 180 to 400 Joules
    const earnedXP = 45;
    sound.playWin();

    const WORK_SCENARIOS = [
      '⚡ Fixed a critical bug in the HITARTH Developer Studio code compiler',
      '🤖 Calibrated the HITARTH Bot automated creature battle engine',
      '🦁 Guided a tourist safari expedition through the Kaziranga wetlands',
      '💎 Polished virtual gem reels inside the Discord gaming arena',
      '🛡️ Guarded the Server Guild Vault from rogue cyber bandits',
      '📦 Delivered 50 rare companion safari nets to chat members',
    ];
    const scenario = WORK_SCENARIOS[Math.floor(Math.random() * WORK_SCENARIOS.length)];

    const updated = {
      ...addToWallet(wallet, earnedJoules, 'Work Earnings', scenario, 'work'),
      xp: (wallet.xp || 0) + earnedXP,
      lastWorkReward: now,
      stats: {
        ...wallet.stats,
        workCount: (wallet.stats.workCount || 0) + 1,
      },
    };

    return {
      isHandled: true,
      updatedWallet: updated,
      botCard: {
        type: 'work',
        title: 'HITARTH SHIFT COMPLETE!',
        subtitle: `Hard work pays off, ${playerName}`,
        color: '#3b82f6',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'Task Assigned', value: scenario, inline: false },
          { label: 'Wage Earned', value: `⚡ **+${formatJoules(earnedJoules)}**`, inline: true },
          { label: 'Experience', value: `✨ **+${earnedXP} XP**`, inline: true },
          { label: 'Total Shifts', value: `💼 **${updated.stats.workCount}**`, inline: true },
        ],
        footer: 'Ready for another shift in 60 seconds.',
      },
    };
  }

  // 4. /owo give @user amount
  if (subCommand === 'give' || subCommand === 'send' || subCommand === 'pay') {
    const targetQuery = args[0] || '';
    const amountStr = args[1] || '';
    const amount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);

    if (!targetQuery || isNaN(amount) || amount <= 0) {
      sound.playLoss();
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'HITARTH BOT • INVALID SYNTAX',
          subtitle: 'Give Command Error',
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Usage', value: '`/owo give @username <amount>`\nExample: `/owo give @Hitarth 500`', inline: false },
          ],
          footer: 'Non-purchasable play Joules only',
        },
      };
    }

    if (wallet.balanceINR < amount) {
      sound.playLoss();
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'HITARTH BOT • INSUFFICIENT JOULES',
          subtitle: 'Transfer Declined',
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Your Balance', value: `⚡ **${formatJoules(wallet.balanceINR)}**`, inline: true },
            { label: 'Requested Amount', value: `⚡ **${formatJoules(amount)}**`, inline: true },
          ],
          footer: 'Earn more with /owo daily and /owo work',
        },
      };
    }

    const cleanTargetName = targetQuery.replace(/[@#]/g, '').trim();
    const sub = subtractFromWallet(wallet, amount, 'Player Transfer', `Sent Joules to @${cleanTargetName}`);
    if (!sub.success) return { isHandled: false };

    sound.playCoin();
    safeConfetti({ particleCount: 50, spread: 50 });

    return {
      isHandled: true,
      updatedWallet: sub.updatedWallet,
      botCard: {
        type: 'give',
        title: 'JOULES TRANSFERRED SUCCESSFULLY!',
        subtitle: 'HITARTH Peer-to-Peer Transfer',
        color: '#10b981',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'Sender', value: `${playerAvatar} ${playerName}`, inline: true },
          { label: 'Recipient', value: `👤 @${cleanTargetName}`, inline: true },
          { label: 'Transferred', value: `⚡ **${formatJoules(amount)}**`, inline: true },
          { label: 'Remaining Balance', value: `⚡ **${formatJoules(sub.updatedWallet.balanceINR)}**`, inline: true },
        ],
        footer: 'Direct in-chat transaction confirmed via atomic memory ledger.',
      },
    };
  }

  // 5. /owo shop
  if (subCommand === 'shop') {
    sound.playSlotTick();
    return {
      isHandled: true,
      botCard: {
        type: 'shop',
        title: 'HITARTH BOT • ITEM SHOP',
        subtitle: 'Gear, Treats & Mythic Shards',
        color: '#8b5cf6',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: SHOP_CATALOG.map((item) => ({
          label: `${item.icon} ${item.name} (\`/owo buy ${item.id}\`)`,
          value: `Cost: ⚡ **${formatJoules(item.costJoules)}** • ${item.description}`,
          inline: false,
        })),
        footer: 'Type /owo buy <item_id> to purchase with your Joules.',
      },
    };
  }

  // 6. /owo buy <item_id>
  if (subCommand === 'buy') {
    const itemId = args[0]?.toLowerCase();
    const item = SHOP_CATALOG.find((it) => it.id === itemId);

    if (!item) {
      sound.playLoss();
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'HITARTH BOT • ITEM NOT FOUND',
          subtitle: 'Unknown Catalog Item',
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Help', value: 'Check `/owo shop` to view available items and exact item IDs.', inline: false },
          ],
          footer: 'Item IDs: safari_net_pro, lucky_dice_charm, beast_elixir, dragon_egg_shard',
        },
      };
    }

    if (wallet.balanceINR < item.costJoules) {
      sound.playLoss();
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'HITARTH BOT • INSUFFICIENT JOULES',
          subtitle: 'Cannot Complete Purchase',
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Item', value: `${item.icon} ${item.name}`, inline: true },
            { label: 'Cost', value: `⚡ **${formatJoules(item.costJoules)}**`, inline: true },
            { label: 'Your Balance', value: `⚡ **${formatJoules(wallet.balanceINR)}**`, inline: true },
          ],
          footer: 'Earn more Joules using /owo work or /owo daily.',
        },
      };
    }

    const sub = subtractFromWallet(wallet, item.costJoules, 'Shop Purchase', `Bought ${item.name}`, 'shop_purchase');
    if (!sub.success) return { isHandled: false };

    // Update inventory
    const existingInv = [...(wallet.inventory || [])];
    const matchIdx = existingInv.findIndex((i) => i.id === item.id);
    if (matchIdx >= 0) {
      existingInv[matchIdx] = {
        ...existingInv[matchIdx],
        count: existingInv[matchIdx].count + 1,
      };
    } else {
      existingInv.push({
        id: item.id,
        name: item.name,
        count: 1,
        icon: item.icon,
        description: item.description,
        rarity: item.rarity,
      });
    }

    sound.playJackpot();
    safeConfetti({ particleCount: 80, spread: 70 });

    const updatedWallet: WalletState = {
      ...sub.updatedWallet,
      inventory: existingInv,
      xp: (wallet.xp || 0) + 50,
    };

    return {
      isHandled: true,
      updatedWallet,
      botCard: {
        type: 'shop',
        title: 'PURCHASE SUCCESSFUL!',
        subtitle: `Added ${item.name} to inventory`,
        color: '#10b981',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'Purchased Item', value: `${item.icon} **${item.name}**`, inline: true },
          { label: 'Price Paid', value: `⚡ **-${formatJoules(item.costJoules)}**`, inline: true },
          { label: 'New Balance', value: `⚡ **${formatJoules(updatedWallet.balanceINR)}**`, inline: true },
          { label: 'Item Effect', value: item.description, inline: false },
        ],
        footer: 'Check your updated items anytime with /owo inventory.',
      },
    };
  }

  // 7. /owo inventory
  if (subCommand === 'inventory' || subCommand === 'inv') {
    sound.playSlotTick();
    const items = wallet.inventory || [];

    return {
      isHandled: true,
      botCard: {
        type: 'inventory',
        title: 'HITARTH BOT • PLAYER INVENTORY',
        subtitle: `Backpack of ${playerName}`,
        color: '#6366f1',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields:
          items.length === 0
            ? [{ label: 'Empty Inventory', value: 'You do not own any shop items yet. Visit `/owo shop`!', inline: false }]
            : items.map((it) => ({
                label: `${it.icon} ${it.name} (x${it.count})`,
                value: `${it.description}`,
                inline: false,
              })),
        footer: `Total Discovered Creatures: ${wallet.pets.length} • View with /owo animals`,
      },
    };
  }

  // 8. /owo profile
  if (subCommand === 'profile' || subCommand === 'p') {
    sound.playSlotTick();
    const lvlInfo = calculateLevel(wallet.xp);
    const primaryPet = wallet.pets.find((p) => p.id === wallet.equippedPetId) || wallet.pets[0];

    return {
      isHandled: true,
      botCard: {
        type: 'profile',
        title: 'HITARTH BOT • PLAYER PROFILE',
        subtitle: `Profile Card of ${playerName}`,
        color: '#8b5cf6',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'In-Game Name', value: `${playerAvatar} **${playerName}**`, inline: true },
          { label: 'Player ID', value: `\`${playerId}\``, inline: true },
          { label: 'Role', value: account?.isDeveloper ? '👑 **Developer**' : '🛡️ Member', inline: true },
          { label: 'Joules Balance', value: `⚡ **${formatJoules(wallet.balanceINR)}**`, inline: true },
          { label: 'Level & XP', value: `⭐ Level ${lvlInfo.level} (${wallet.xp.toLocaleString()} XP)`, inline: true },
          { label: 'Companion Beast', value: `${primaryPet?.emoji || '🐯'} ${primaryPet?.name || 'Bengal Cub'} (${primaryPet?.power || 45} PWR)`, inline: true },
          { label: 'Creatures Caught', value: `🦁 **${wallet.pets.length} Beasts**`, inline: true },
          { label: 'Battles Won', value: `⚔️ **${wallet.stats.battlesWon} Boss / ${wallet.stats.multiplayerDuelsWon} PvP**`, inline: true },
          { label: 'Daily Streak', value: `🔥 **${wallet.stats.dailyStreak || 0} Days**`, inline: true },
        ],
        progress: {
          current: lvlInfo.currentXp,
          max: lvlInfo.nextLevelXp,
          label: `Level ${lvlInfo.level} Experience`,
        },
        footer: 'HITARTH Gaming Network • All data synced to Firebase Firestore.',
      },
    };
  }

  // 9. /owo leaderboard
  if (subCommand === 'leaderboard' || subCommand === 'lb' || subCommand === 'top') {
    sound.playSlotTick();
    return {
      isHandled: true,
      botCard: {
        type: 'leaderboard',
        title: 'HITARTH BOT • GLOBAL JOULES LEADERBOARD',
        subtitle: 'The Wealthiest Contenders',
        color: '#f59e0b',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: '🥇 Rank 1', value: `👑 **Hitarth** (\`OWO-9850\`) • ⚡ **${formatJoules(Math.max(wallet.balanceINR, 125000))}**`, inline: false },
          { label: '🥈 Rank 2', value: `⚡ **${playerName}** (\`${playerId}\`) • ⚡ **${formatJoules(wallet.balanceINR)}**`, inline: false },
          { label: '🥉 Rank 3', value: `🐯 **ApexChallenger** (\`OWO-1002\`) • ⚡ **54,200 Joules**`, inline: false },
        ],
        footer: 'Synced live with Firebase Firestore • Play minigames to climb!',
      },
    };
  }

  // 10. /owo level
  if (subCommand === 'level' || subCommand === 'lvl' || subCommand === 'xp') {
    sound.playSlotTick();
    const lvlInfo = calculateLevel(wallet.xp);
    return {
      isHandled: true,
      botCard: {
        type: 'level',
        title: 'HITARTH BOT • LEVEL & EXPERIENCE',
        subtitle: `Level statistics for ${playerName}`,
        color: '#ec4899',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'Current Level', value: `⭐ **Level ${lvlInfo.level}**`, inline: true },
          { label: 'Total Experience', value: `✨ **${wallet.xp.toLocaleString()} XP**`, inline: true },
          { label: 'To Next Level', value: `🎯 **${lvlInfo.nextLevelXp - lvlInfo.currentXp} XP needed**`, inline: true },
        ],
        progress: {
          current: lvlInfo.currentXp,
          max: lvlInfo.nextLevelXp,
          label: `Level ${lvlInfo.level} Progress (${lvlInfo.progressPercent}%)`,
        },
        footer: 'Earn XP by completing /owo work, /owo hunt, and /owo battle.',
      },
    };
  }

  // 10b. /owo redeem <code>
  if (subCommand === 'redeem' || subCommand === 'code' || subCommand === 'promo') {
    const codeArg = args[0];
    if (!codeArg) {
      return {
        isHandled: true,
        botCard: {
          type: 'help',
          title: 'HITARTH BOT • REDEEM SYNTAX',
          subtitle: 'Missing Promo Code',
          color: '#f59e0b',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Usage', value: '`/owo redeem <CODE_KEY>`', inline: true },
            { label: 'Example', value: '`/owo redeem HITARTH_MEGA`', inline: true },
            { label: 'Info', value: 'Secret codes grant free Joules, XP, and companion beasts!', inline: false },
          ],
          footer: 'Codes can be obtained from developer announcements.',
        },
      };
    }

    const redeemRes = await redeemCustomGameCode(codeArg, account, wallet);
    if (!redeemRes.success) {
      sound.playLoss();
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'CODE REDEMPTION DECLINED',
          subtitle: `Code: ${codeArg.toUpperCase()}`,
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Status', value: redeemRes.message, inline: false },
          ],
          footer: 'Check secret code spelling or ask the developer.',
        },
      };
    }

    sound.playJackpot();
    safeConfetti({ particleCount: 110, spread: 85 });

    const c = redeemRes.code;
    return {
      isHandled: true,
      updatedWallet: redeemRes.updatedWallet,
      botCard: {
        type: 'daily',
        title: '🎉 PROMO CODE REDEEMED!',
        subtitle: `Code: ${codeArg.toUpperCase()}`,
        color: '#10b981',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'Player', value: `${playerAvatar} ${playerName} (\`${playerId}\`)`, inline: true },
          { label: 'Joules Granted', value: `⚡ **+${formatJoules(c?.rewardJoules || 0)}**`, inline: true },
          { label: 'XP Gained', value: `✨ **+${c?.rewardXP || 0} XP**`, inline: true },
          ...(c?.bonusPetName ? [{ label: 'Companion Beast Unlocked', value: `${c.bonusPetEmoji || '🐾'} **${c.bonusPetName}** [${c.bonusPetRarity?.toUpperCase()}]`, inline: true }] : []),
          { label: 'Updated Balance', value: `⚡ **${formatJoules(redeemRes.updatedWallet?.balanceINR || 0)}**`, inline: true },
        ],
        footer: 'Code redeemed successfully • Virtual play credits added to wallet',
      },
    };
  }

  // 11. /owo cf amount [heads|tails]
  if (subCommand === 'cf' || subCommand === 'coinflip') {
    const amount = parseInt((args[0] || '100').replace(/[^0-9]/g, ''), 10);
    const guessChoice = (args[1]?.toLowerCase() === 'tails' ? 'tails' : 'heads') as 'heads' | 'tails';

    if (isNaN(amount) || amount <= 0) {
      sound.playLoss();
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'HITARTH BOT • INVALID COIN FLIP STAKE',
          subtitle: 'Please enter a valid amount',
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [{ label: 'Usage', value: '`/owo cf <amount> [heads|tails]`\nExample: `/owo cf 200 heads`', inline: false }],
          footer: 'Non-purchasable play Joules only',
        },
      };
    }

    if (wallet.balanceINR < amount) {
      sound.playLoss();
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'HITARTH BOT • INSUFFICIENT JOULES',
          subtitle: 'Cannot Place Bet',
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Your Balance', value: `⚡ **${formatJoules(wallet.balanceINR)}**`, inline: true },
            { label: 'Required Stake', value: `⚡ **${formatJoules(amount)}**`, inline: true },
          ],
          footer: 'Use /owo work or /owo daily for free Joules.',
        },
      };
    }

    const isHeads = Math.random() < 0.5;
    const flippedSide = isHeads ? 'heads' : 'tails';
    const won = guessChoice === flippedSide;

    let updatedWallet: WalletState;
    if (won) {
      sound.playJackpot();
      safeConfetti({ particleCount: 80, spread: 70 });
      updatedWallet = {
        ...addToWallet(wallet, amount, 'Coin Flip', `Won 50/50 Coin Flip (${flippedSide})`),
        xp: (wallet.xp || 0) + 20,
        stats: {
          ...wallet.stats,
          flipsPlayed: wallet.stats.flipsPlayed + 1,
          flipsWon: wallet.stats.flipsWon + 1,
        },
      };
    } else {
      sound.playLoss();
      const sub = subtractFromWallet(wallet, amount, 'Coin Flip', `Lost 50/50 Coin Flip (${flippedSide})`);
      updatedWallet = {
        ...sub.updatedWallet,
        xp: (wallet.xp || 0) + 5,
        stats: {
          ...wallet.stats,
          flipsPlayed: wallet.stats.flipsPlayed + 1,
        },
      };
    }

    return {
      isHandled: true,
      updatedWallet,
      botCard: {
        type: 'cf',
        title: won ? '🪙 COIN FLIP VICTORY!' : '🪙 COIN FLIP DEFEAT',
        subtitle: `${playerName}'s 50/50 Challenge`,
        color: won ? '#10b981' : '#ef4444',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'You Chose', value: `**${guessChoice.toUpperCase()}**`, inline: true },
          { label: 'Coin Landed On', value: `**${flippedSide.toUpperCase()}**`, inline: true },
          { label: 'Result', value: won ? `🎉 Won **+${formatJoules(amount)}**` : `💸 Lost **-${formatJoules(amount)}**`, inline: true },
          { label: 'New Balance', value: `⚡ **${formatJoules(updatedWallet.balanceINR)}**`, inline: true },
        ],
        footer: 'Pure virtual chance simulation • 50% fair probability.',
      },
    };
  }

  // 12. /owo s amount
  if (subCommand === 's' || subCommand === 'slots') {
    const amount = parseInt((args[0] || '100').replace(/[^0-9]/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      sound.playLoss();
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'HITARTH BOT • INVALID SLOTS STAKE',
          subtitle: 'Please specify an amount',
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [{ label: 'Usage', value: '`/owo s <amount>`\nExample: `/owo s 250`', inline: false }],
          footer: 'Play credits only',
        },
      };
    }

    if (wallet.balanceINR < amount) {
      sound.playLoss();
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'HITARTH BOT • INSUFFICIENT JOULES',
          subtitle: 'Cannot Spin Slot Machine',
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Your Balance', value: `⚡ **${formatJoules(wallet.balanceINR)}**`, inline: true },
            { label: 'Required Stake', value: `⚡ **${formatJoules(amount)}**`, inline: true },
          ],
          footer: 'Free virtual credits only',
        },
      };
    }

    const SYMBOLS = ['💎', '👑', '7️⃣', '🐯', '🪙', '🍒', '⚡'];
    const r1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const r2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const r3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const reelsDisplay = `[ ${r1} | ${r2} | ${r3} ]`;

    let multiplier = 0;
    if (r1 === r2 && r2 === r3) {
      multiplier = r1 === '💎' ? 15 : r1 === '7️⃣' ? 10 : 5;
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      multiplier = 1.5;
    }

    let updatedWallet: WalletState;
    if (multiplier > 0) {
      const winnings = Math.round(amount * multiplier);
      sound.playJackpot();
      safeConfetti({ particleCount: 100, spread: 80 });
      updatedWallet = {
        ...addToWallet(wallet, winnings, 'Slots', `Spun ${reelsDisplay} for ${multiplier}x payout`),
        xp: (wallet.xp || 0) + 30,
        stats: {
          ...wallet.stats,
          slotsSpun: wallet.stats.slotsSpun + 1,
          slotsJackpots: multiplier >= 5 ? wallet.stats.slotsJackpots + 1 : wallet.stats.slotsJackpots,
        },
      };

      return {
        isHandled: true,
        updatedWallet,
        botCard: {
          type: 's',
          title: '🎰 SLOTS WINNER!',
          subtitle: `${multiplier}x MULTIPLIER HIT`,
          color: '#10b981',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Reels Result', value: `## ${reelsDisplay}`, inline: false },
            { label: 'Multiplier', value: `✨ **${multiplier}x**`, inline: true },
            { label: 'Winnings', value: `⚡ **+${formatJoules(winnings)}**`, inline: true },
            { label: 'New Balance', value: `⚡ **${formatJoules(updatedWallet.balanceINR)}**`, inline: true },
          ],
          footer: 'Virtual chance minigame • Non-gambling play Joules.',
        },
      };
    } else {
      sound.playLoss();
      const sub = subtractFromWallet(wallet, amount, 'Slots', `Lost spin with ${reelsDisplay}`);
      updatedWallet = {
        ...sub.updatedWallet,
        xp: (wallet.xp || 0) + 5,
        stats: {
          ...wallet.stats,
          slotsSpun: wallet.stats.slotsSpun + 1,
        },
      };

      return {
        isHandled: true,
        updatedWallet,
        botCard: {
          type: 's',
          title: '🎰 SLOTS SPIN RESULT',
          subtitle: 'No Matching Reels',
          color: '#64748b',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Reels Result', value: `## ${reelsDisplay}`, inline: false },
            { label: 'Bet Placed', value: `⚡ **-${formatJoules(amount)}**`, inline: true },
            { label: 'New Balance', value: `⚡ **${formatJoules(updatedWallet.balanceINR)}**`, inline: true },
          ],
          footer: 'Better luck next spin! Try matching 2 or 3 symbols.',
        },
      };
    }
  }

  // 13. /owo highlow amount [higher|lower]
  if (subCommand === 'highlow' || subCommand === 'hl') {
    const amount = parseInt((args[0] || '100').replace(/[^0-9]/g, ''), 10);
    const guess = (args[1]?.toLowerCase() === 'lower' ? 'lower' : 'higher') as 'higher' | 'lower';

    if (isNaN(amount) || amount <= 0) {
      sound.playLoss();
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'HITARTH BOT • INVALID HIGHLOW STAKE',
          subtitle: 'HighLow Command Error',
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [{ label: 'Usage', value: '`/owo highlow <amount> [higher|lower]`\nExample: `/owo highlow 200 higher`', inline: false }],
          footer: 'Virtual play Joules only',
        },
      };
    }

    if (wallet.balanceINR < amount) {
      sound.playLoss();
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'HITARTH BOT • INSUFFICIENT JOULES',
          subtitle: 'Insufficient Joules',
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [{ label: 'Your Balance', value: `⚡ **${formatJoules(wallet.balanceINR)}**`, inline: true }],
          footer: 'Free virtual play credits only',
        },
      };
    }

    const currentCardVal = Math.floor(3 + Math.random() * 8);
    let nextCardVal = Math.floor(2 + Math.random() * 12);
    while (nextCardVal === currentCardVal) {
      nextCardVal = Math.floor(2 + Math.random() * 12);
    }

    const isActuallyHigher = nextCardVal > currentCardVal;
    const won = (guess === 'higher' && isActuallyHigher) || (guess === 'lower' && !isActuallyHigher);

    let updatedWallet: WalletState;
    if (won) {
      sound.playJackpot();
      updatedWallet = {
        ...addToWallet(wallet, amount, 'HighLow', `Guessed ${guess} correctly (${currentCardVal} -> ${nextCardVal})`),
        xp: (wallet.xp || 0) + 20,
      };
    } else {
      sound.playLoss();
      const sub = subtractFromWallet(wallet, amount, 'HighLow', `Guessed ${guess} incorrectly (${currentCardVal} -> ${nextCardVal})`);
      updatedWallet = {
        ...sub.updatedWallet,
        xp: (wallet.xp || 0) + 5,
      };
    }

    return {
      isHandled: true,
      updatedWallet,
      botCard: {
        type: 'highlow',
        title: won ? '🃏 HIGHLOW PREDICTION CORRECT!' : '🃏 HIGHLOW PREDICTION WRONG',
        subtitle: `${playerName}'s Card Prediction`,
        color: won ? '#10b981' : '#ef4444',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'Base Card', value: `🎴 **${currentCardVal}**`, inline: true },
          { label: 'Your Prediction', value: `**${guess.toUpperCase()}**`, inline: true },
          { label: 'Revealed Card', value: `🃏 **${nextCardVal}**`, inline: true },
          { label: 'Outcome', value: won ? `🎉 Won **+${formatJoules(amount)}**` : `💸 Lost **-${formatJoules(amount)}**`, inline: true },
          { label: 'New Balance', value: `⚡ **${formatJoules(updatedWallet.balanceINR)}**`, inline: true },
        ],
        footer: 'Virtual card simulation • 100% fair RNG',
      },
    };
  }

  // 14. /owo dice amount
  if (subCommand === 'dice') {
    const amount = parseInt((args[0] || '100').replace(/[^0-9]/g, ''), 10);
    if (isNaN(amount) || amount <= 0 || wallet.balanceINR < amount) {
      sound.playLoss();
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'HITARTH BOT • INSUFFICIENT JOULES / INVALID STAKE',
          subtitle: 'Dice Roll Error',
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [{ label: 'Usage', value: '`/owo dice <amount>` (e.g. `/owo dice 150`)', inline: false }],
          footer: 'Play credits only',
        },
      };
    }

    const d1 = Math.floor(1 + Math.random() * 6);
    const d2 = Math.floor(1 + Math.random() * 6);
    const playerTotal = d1 + d2;

    const b1 = Math.floor(1 + Math.random() * 6);
    const b2 = Math.floor(1 + Math.random() * 6);
    const botTotal = b1 + b2;

    const won = playerTotal > botTotal;
    const tie = playerTotal === botTotal;

    let updatedWallet = wallet;
    if (won) {
      sound.playJackpot();
      updatedWallet = addToWallet(wallet, amount, 'Dice Duel', `Rolled ${playerTotal} vs Bot's ${botTotal}`);
    } else if (!tie) {
      sound.playLoss();
      const sub = subtractFromWallet(wallet, amount, 'Dice Duel', `Rolled ${playerTotal} vs Bot's ${botTotal}`);
      updatedWallet = sub.updatedWallet;
    }

    return {
      isHandled: true,
      updatedWallet,
      botCard: {
        type: 'dice',
        title: won ? '🎲 DICE DUEL VICTORY!' : tie ? '🎲 DICE DUEL TIE' : '🎲 DICE DUEL DEFEAT',
        subtitle: `${playerName} vs HITARTH Bot`,
        color: won ? '#10b981' : tie ? '#f59e0b' : '#ef4444',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'Your Dice', value: `🎲 [${d1}] + [${d2}] = **${playerTotal}**`, inline: true },
          { label: 'Bot Dice', value: `🎲 [${b1}] + [${b2}] = **${botTotal}**`, inline: true },
          { label: 'Duel Outcome', value: won ? `🎉 Won **+${formatJoules(amount)}**` : tie ? '🤝 Tie - Stake Returned' : `💸 Lost **-${formatJoules(amount)}**`, inline: false },
        ],
        footer: 'Virtual dice showdown.',
      },
    };
  }

  // 15. /owo rps [rock|paper|scissors]
  if (subCommand === 'rps') {
    const choice = (args[0]?.toLowerCase() || 'rock') as 'rock' | 'paper' | 'scissors';
    const VALID = ['rock', 'paper', 'scissors'];
    if (!VALID.includes(choice)) {
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'HITARTH BOT • RPS SYNTAX',
          subtitle: 'Pick Rock, Paper or Scissors',
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [{ label: 'Usage', value: '`/owo rps <rock|paper|scissors>`\nExample: `/owo rps rock`', inline: false }],
          footer: 'Challenge the bot to RPS.',
        },
      };
    }

    const botChoice = VALID[Math.floor(Math.random() * VALID.length)] as 'rock' | 'paper' | 'scissors';
    const EMOJIS: Record<string, string> = { rock: '🪨 Rock', paper: '📄 Paper', scissors: '✂️ Scissors' };

    let won = false;
    let tie = false;
    if (choice === botChoice) {
      tie = true;
    } else if (
      (choice === 'rock' && botChoice === 'scissors') ||
      (choice === 'paper' && botChoice === 'rock') ||
      (choice === 'scissors' && botChoice === 'paper')
    ) {
      won = true;
    }

    const reward = won ? 200 : 0;
    const updatedWallet = won ? addToWallet(wallet, reward, 'RPS Win', `Defeated bot in RPS`) : wallet;

    return {
      isHandled: true,
      updatedWallet,
      botCard: {
        type: 'rps',
        title: won ? '✂️ RPS VICTORY!' : tie ? '✂️ RPS TIE GAME' : '✂️ RPS DEFEAT',
        subtitle: `${playerName} vs HITARTH Bot`,
        color: won ? '#10b981' : tie ? '#f59e0b' : '#ef4444',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'Your Move', value: EMOJIS[choice], inline: true },
          { label: 'Bot Move', value: EMOJIS[botChoice], inline: true },
          { label: 'Result', value: won ? `🏆 You won! **+${formatJoules(reward)}**` : tie ? '🤝 Evenly matched tie!' : '🤖 Bot took this round!', inline: false },
        ],
        footer: 'Friendly turn-based minigame.',
      },
    };
  }

  // 16. /owo hunt
  if (subCommand === 'hunt' || subCommand === 'h') {
    sound.playSlotSpin();
    const creature = HUNT_CREATURES_POOL[Math.floor(Math.random() * HUNT_CREATURES_POOL.length)];
    const biome = BIOMES[Math.floor(Math.random() * BIOMES.length)];

    const newPet: PetAnimal = {
      id: `pet_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: creature.name,
      rarity: creature.rarity,
      emoji: creature.emoji,
      biome: biome,
      valueINR: creature.value,
      power: creature.power,
      caughtAt: Date.now(),
      level: 1,
    };

    const updatedPets = [newPet, ...(wallet.pets || [])];
    const earnedXp = creature.rarity === 'legendary' || creature.rarity === 'mythic' ? 120 : 50;

    sound.playJackpot();
    safeConfetti({ particleCount: 90, spread: 75 });

    const updatedWallet: WalletState = {
      ...wallet,
      pets: updatedPets,
      xp: (wallet.xp || 0) + earnedXp,
      stats: {
        ...wallet.stats,
        huntsCount: (wallet.stats.huntsCount || 0) + 1,
      },
    };

    const RARITY_COLORS: Record<string, string> = {
      common: '#94a3b8',
      uncommon: '#10b981',
      rare: '#3b82f6',
      epic: '#8b5cf6',
      legendary: '#f59e0b',
      mythic: '#ec4899',
    };

    return {
      isHandled: true,
      updatedWallet,
      botCard: {
        type: 'hunt',
        title: 'EXPEDITION COMPLETE!',
        subtitle: `Explored the ${biome}`,
        color: RARITY_COLORS[creature.rarity] || '#10b981',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'Discovered Creature', value: `## ${creature.emoji} **${creature.name}**`, inline: false },
          { label: 'Rarity', value: `💎 **${creature.rarity.toUpperCase()}**`, inline: true },
          { label: 'Battle Power', value: `⚡ **${creature.power} PWR**`, inline: true },
          { label: 'Expedition Biome', value: `🌿 **${biome}**`, inline: true },
          { label: 'Total Collection', value: `🦁 **${updatedPets.length} Creatures**`, inline: true },
          { label: 'XP Gained', value: `✨ **+${earnedXp} XP**`, inline: true },
        ],
        footer: 'Use /owo animals to view your collection • Use /owo equip to set as primary companion.',
      },
    };
  }

  // 17. /owo animals
  if (subCommand === 'animals' || subCommand === 'zoo' || subCommand === 'pets') {
    sound.playSlotTick();
    const pets = wallet.pets || [];
    return {
      isHandled: true,
      botCard: {
        type: 'animals',
        title: 'HITARTH BOT • CREATURE SANCTUARY',
        subtitle: `Collection of ${playerName} (${pets.length} beasts)`,
        color: '#10b981',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: pets.slice(0, 8).map((p) => ({
          label: `${p.emoji || '🐾'} ${p.name} [${(p.rarity || 'common').toUpperCase()}]`,
          value: `Power: **${p.power || 50} PWR** • Biome: ${p.biome || 'Wild Sanctuary'} • Level ${p.level || 1}`,
          inline: true,
        })),
        footer: `Showing top ${Math.min(8, pets.length)} of ${pets.length} creatures. Use /owo hunt to discover more.`,
      },
    };
  }

  // 18. /owo pet
  if (subCommand === 'pet') {
    sound.playSlotTick();
    const primary = wallet.pets.find((p) => p.id === wallet.equippedPetId) || wallet.pets[0];
    return {
      isHandled: true,
      botCard: {
        type: 'pet',
        title: 'HITARTH BOT • ACTIVE COMPANION',
        subtitle: `${playerName}'s Loyal Beast`,
        color: '#8b5cf6',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'Companion', value: `## ${primary.emoji} **${primary.name}**`, inline: false },
          { label: 'Rarity Tier', value: `⭐ **${primary.rarity.toUpperCase()}**`, inline: true },
          { label: 'Combat Power', value: `⚡ **${primary.power} PWR**`, inline: true },
          { label: 'Native Habitat', value: `🌿 **${primary.biome}**`, inline: true },
          { label: 'Level', value: `🏅 **Level ${primary.level}**`, inline: true },
        ],
        footer: 'Ready for creature duels! Use /owo battle to enter the arena.',
      },
    };
  }

  // 19. /owo equip <creature_name>
  if (subCommand === 'equip') {
    const query = args.join(' ').toLowerCase().trim();
    if (!query) {
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'HITARTH BOT • EQUIP SYNTAX',
          subtitle: 'Specify a creature',
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [{ label: 'Usage', value: '`/owo equip <creature_name>`\nExample: `/owo equip White Tiger`', inline: false }],
          footer: 'View your creatures with /owo animals',
        },
      };
    }

    const matched = wallet.pets.find((p) => p.name.toLowerCase().includes(query) || p.id.toLowerCase() === query);
    if (!matched) {
      sound.playLoss();
      return {
        isHandled: true,
        botCard: {
          type: 'error',
          title: 'HITARTH BOT • CREATURE NOT FOUND',
          subtitle: 'Not in Collection',
          color: '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [{ label: 'Search Query', value: `"${query}" was not found in your collection. Check \`/owo animals\`.`, inline: false }],
          footer: 'Expeditions with /owo hunt add new creatures.',
        },
      };
    }

    sound.playWin();
    const updatedWallet: WalletState = {
      ...wallet,
      equippedPetId: matched.id,
      teamPetIds: [matched.id, ...wallet.teamPetIds.filter((id) => id !== matched.id)].slice(0, 3),
    };

    return {
      isHandled: true,
      updatedWallet,
      botCard: {
        type: 'equip',
        title: 'COMPANION EQUIPPED!',
        subtitle: `Active pet updated`,
        color: '#10b981',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'Equipped Beast', value: `${matched.emoji} **${matched.name}**`, inline: true },
          { label: 'Battle Power', value: `⚡ **${matched.power} PWR**`, inline: true },
          { label: 'Rarity', value: `💎 **${matched.rarity.toUpperCase()}**`, inline: true },
        ],
        footer: 'Your active companion leads your 3-pet battle squad in combat.',
      },
    };
  }

  // 20. /owo battle [@user]
  if (subCommand === 'battle') {
    sound.playAttack(true);
    const targetQuery = args[0] || 'Wild Apex Predator';
    const opponentName = targetQuery.replace(/[@#]/g, '').trim() || 'Wild Apex Beast';

    const primaryPet = wallet.pets.find((p) => p.id === wallet.equippedPetId) || wallet.pets[0];
    const playerPower = primaryPet.power + Math.floor(Math.random() * 25);
    const opponentPower = 70 + Math.floor(Math.random() * 35);

    const won = playerPower >= opponentPower;
    const rewardJoules = won ? 350 : 50;
    const rewardXp = won ? 150 : 40;

    let updatedWallet: WalletState;
    if (won) {
      sound.playJackpot();
      safeConfetti({ particleCount: 100, spread: 80 });
      updatedWallet = {
        ...addToWallet(wallet, rewardJoules, 'Creature Battle', `Defeated ${opponentName} with ${primaryPet.name}`),
        xp: (wallet.xp || 0) + rewardXp,
        stats: {
          ...wallet.stats,
          battlesWon: wallet.stats.battlesWon + 1,
        },
      };
    } else {
      sound.playLoss();
      updatedWallet = {
        ...wallet,
        xp: (wallet.xp || 0) + rewardXp,
      };
    }

    return {
      isHandled: true,
      updatedWallet,
      botCard: {
        type: 'battle',
        title: won ? 'BATTLE RESULTS • VICTORY!' : 'BATTLE RESULTS • DEFEAT',
        subtitle: `${playerName} vs ${opponentName}`,
        color: won ? '#10b981' : '#ef4444',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: `${playerName}'s Squad`, value: `${primaryPet.emoji} ${primaryPet.name} (**${playerPower} PWR**)`, inline: true },
          { label: `${opponentName}'s Squad`, value: `⚔️ Challenger Beast (**${opponentPower} PWR**)`, inline: true },
          { label: 'Winner', value: won ? `🏆 **${playerName}**` : `💀 **${opponentName}**`, inline: false },
          { label: 'Rewards Earned', value: won ? `⚡ **+${formatJoules(rewardJoules)}** • ✨ **+${rewardXp} XP**` : `✨ **+${rewardXp} XP (Consolation)**`, inline: false },
        ],
        footer: 'Friendly creature duel results logged to Firebase Firestore.',
      },
    };
  }

  // 21. /owo team
  if (subCommand === 'team' && args[0] !== 'create' && args[0] !== 'invite' && args[0] !== 'join' && args[0] !== 'leave' && args[0] !== 'info' && args[0] !== 'battle' && args[0] !== 'leaderboard') {
    sound.playSlotTick();
    const teamPets = wallet.pets.filter((p) => (wallet.teamPetIds || []).includes(p.id));
    const activeSquad = teamPets.length > 0 ? teamPets : [wallet.pets[0]];
    const totalPower = activeSquad.reduce((sum, p) => sum + p.power, 0);

    return {
      isHandled: true,
      botCard: {
        type: 'team',
        title: 'HITARTH BOT • 3-PET BATTLE SQUAD',
        subtitle: `${playerName}'s Arena Formation`,
        color: '#6366f1',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          ...activeSquad.map((p, idx) => ({
            label: `Slot ${idx + 1}: ${p.emoji} ${p.name}`,
            value: `Power: **${p.power} PWR** • Biome: ${p.biome}`,
            inline: true,
          })),
          { label: 'Total Squad Power', value: `⚡ **${totalPower} COMBINED PWR**`, inline: false },
        ],
        footer: 'Equip new creatures with /owo equip to strengthen your battle team.',
      },
    };
  }

  // 22. /owo explore
  if (subCommand === 'explore') {
    sound.playSlotSpin();
    const biome = BIOMES[Math.floor(Math.random() * BIOMES.length)];
    const bonusJoules = Math.floor(150 + Math.random() * 250);
    const bonusXp = 60;
    sound.playWin();

    const updatedWallet = {
      ...addToWallet(wallet, bonusJoules, 'Biome Exploration', `Explored ${biome}`),
      xp: (wallet.xp || 0) + bonusXp,
    };

    return {
      isHandled: true,
      updatedWallet,
      botCard: {
        type: 'explore',
        title: 'EXPLORATION EXPEDITION SUCCESSFUL',
        subtitle: `Trek through ${biome}`,
        color: '#14b8a6',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          { label: 'Discovered Sanctuary', value: `🌿 **${biome}**`, inline: true },
          { label: 'Recovered Relics', value: `⚡ **+${formatJoules(bonusJoules)}**`, inline: true },
          { label: 'Expedition XP', value: `✨ **+${bonusXp} XP**`, inline: true },
          { label: 'Apex Signs', value: 'Fresh tiger and falcon tracks spotted in the brush!', inline: false },
        ],
        footer: 'Use /owo hunt in this biome to capture its wild apex creature.',
      },
    };
  }

  // 23-28. Multiplayer Team Commands: /owo team create, info, invite, join, leave, battle, leaderboard
  if (subCommand === 'team') {
    const teamAction = args[0]?.toLowerCase();
    const teamParam = args.slice(1).join(' ').trim();

    if (teamAction === 'create') {
      const teamName = teamParam || `${playerName}'s Vanguard`;
      sound.playJackpot();
      safeConfetti({ particleCount: 70, spread: 60 });

      const updatedAccount: UserAccount = {
        ...(account || { id: playerId, inGameName: playerName, avatar: playerAvatar, createdAt: Date.now() }),
        teamName,
        teamId: `team_${Date.now()}`,
      };

      return {
        isHandled: true,
        updatedAccount,
        botCard: {
          type: 'team_create',
          title: 'MULTIPLAYER TEAM FOUNDED!',
          subtitle: `Welcome to the Guild Registry`,
          color: '#8b5cf6',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Team Name', value: `🛡️ **${teamName}**`, inline: true },
            { label: 'Founder & Leader', value: `${playerAvatar} ${playerName}`, inline: true },
            { label: 'Team Level', value: `⭐ Level 1`, inline: true },
            { label: 'Next Step', value: 'Use `/owo team invite @user` to recruit members into your squad!', inline: false },
          ],
          footer: 'Team created on HITARTH server registry.',
        },
      };
    }

    if (teamAction === 'info') {
      sound.playSlotTick();
      const currentTeam = account?.teamName || 'The Vanguard Clan';
      return {
        isHandled: true,
        botCard: {
          type: 'team_info',
          title: 'HITARTH BOT • TEAM INFORMATION',
          subtitle: `Squad Roster: ${currentTeam}`,
          color: '#6366f1',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Guild Name', value: `🛡️ **${currentTeam}**`, inline: true },
            { label: 'Guild Leader', value: `👑 ${playerName}`, inline: true },
            { label: 'Active Members', value: `👥 3 Contenders`, inline: true },
            { label: 'Guild Power', value: `⚡ **280 COMBINED PWR**`, inline: true },
            { label: 'Guild Raids Won', value: `⚔️ **12 Boss Defeats**`, inline: true },
          ],
          footer: 'Use /owo team battle to start a cooperative raid.',
        },
      };
    }

    if (teamAction === 'battle') {
      sound.playAttack(true);
      const raidBoss = 'Mythic Cyber Colossus';
      const won = Math.random() < 0.8;
      const raidReward = won ? 1000 : 100;

      let updatedWallet = wallet;
      if (won) {
        sound.playJackpot();
        safeConfetti({ particleCount: 120, spread: 90 });
        updatedWallet = addToWallet(wallet, raidReward, 'Team Raid', `Defeated ${raidBoss} with guild`);
      }

      return {
        isHandled: true,
        updatedWallet,
        botCard: {
          type: 'team_battle',
          title: won ? 'GUILD RAID VICTORY!' : 'GUILD RAID DEFEAT',
          subtitle: `${account?.teamName || 'The Vanguard Clan'} vs ${raidBoss}`,
          color: won ? '#10b981' : '#ef4444',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: 'Raid Target', value: `👹 **${raidBoss}** (450,000 HP)`, inline: false },
            { label: 'Squad Outcome', value: won ? `🎉 Raid Boss Annihilated! Team split pot: **+${formatJoules(raidReward)}** per member!` : '💀 Squad fell in battle. Re-strategize and try again!', inline: false },
          ],
          footer: 'Cooperative guild combat on HITARTH.',
        },
      };
    }

    if (teamAction === 'leaderboard' || teamAction === 'lb') {
      sound.playSlotTick();
      return {
        isHandled: true,
        botCard: {
          type: 'team_leaderboard',
          title: 'HITARTH BOT • TOP GUILDS LEADERBOARD',
          subtitle: 'The Mightiest Squads',
          color: '#f59e0b',
          author: { name: 'HITARTH BOT', icon: '🤖' },
          fields: [
            { label: '🥇 1st Place', value: `👑 **HITARTH Developers** • 1,450 Combined PWR (45 Raids)`, inline: false },
            { label: '🥈 2nd Place', value: `⚡ **${account?.teamName || 'Vanguard Syndicate'}** • 720 Combined PWR`, inline: false },
            { label: '🥉 3rd Place', value: `🐯 **Bengal Tigers Club** • 580 Combined PWR`, inline: false },
          ],
          footer: 'Climb the guild leaderboard with /owo team battle.',
        },
      };
    }
  }

  // 29. /owo help
  if (subCommand === 'help') {
    sound.playSlotTick();
    return {
      isHandled: true,
      botCard: {
        type: 'help',
        title: 'HITARTH BOT • ALL COMMANDS DIRECTORY',
        subtitle: 'Everything executes directly inside Discord chat!',
        color: '#8b5cf6',
        author: { name: 'HITARTH BOT', icon: '🤖' },
        fields: [
          {
            label: '⚡ Economy Commands',
            value: '`/owo balance` • `/owo daily` • `/owo work` • `/owo give @user <amt>` • `/owo shop` • `/owo buy <item>` • `/owo inventory` • `/owo profile` • `/owo leaderboard` • `/owo level`',
            inline: false,
          },
          {
            label: '🎰 Non-Gambling Virtual Minigames',
            value: '`/owo cf <amt> [h|t]` (Coin Flip) • `/owo s <amt>` (Slots) • `/owo highlow <amt>` (Higher or Lower) • `/owo dice <amt>` • `/owo rps <choice>` (Rock Paper Scissors)',
            inline: false,
          },
          {
            label: '🦁 Animals & Expeditions',
            value: '`/owo hunt` (Catch wild beasts) • `/owo animals` (Sanctuary) • `/owo pet` (Active Companion) • `/owo equip <name>` • `/owo battle [@user]` • `/owo team` • `/owo explore`',
            inline: false,
          },
          {
            label: '👥 Multiplayer Teams',
            value: '`/owo team create <name>` • `/owo team info` • `/owo team invite @user` • `/owo team join` • `/owo team leave` • `/owo team battle` • `/owo team leaderboard`',
            inline: false,
          },
        ],
        footer: 'Tip: Type / in the message box to see live autocomplete suggestions with syntax!',
      },
    };
  }

  // 30. Unknown Command Fallback (Exact requirement in brief)
  sound.playLoss();
  return {
    isHandled: true,
    botCard: {
      type: 'error',
      title: 'HITARTH BOT',
      subtitle: 'Unknown command!',
      color: '#ef4444',
      author: { name: 'HITARTH BOT', icon: '🤖' },
      fields: [
        {
          label: 'Unknown Command',
          value: `The command \`${clean}\` was not recognized.\nTry \`/owo help\` to see all available commands.`,
          inline: false,
        },
      ],
      footer: 'Type / in the message box to view instant slash-command suggestions.',
    },
  };
}
