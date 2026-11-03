import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBotCommand, OWO_COMMANDS_LIST } from './botEngine';
import { INITIAL_WALLET } from './economy';
import { UserAccount } from '../types';

const mockUser: UserAccount = {
  id: 'OWO-9850',
  inGameName: 'hitarth',
  password: 'hashed',
  createdAt: Date.now(),
  role: 'developer',
  isDeveloper: true,
  avatar: '👑',
};

test('botEngine: command suggestions list has all core categories', () => {
  assert.ok(OWO_COMMANDS_LIST.length >= 20);
  const categories = new Set(OWO_COMMANDS_LIST.map(c => c.category));
  assert.ok(categories.has('Economy'));
  assert.ok(categories.has('Minigames'));
  assert.ok(categories.has('Animals & Expeditions'));
  assert.ok(categories.has('Multiplayer Teams'));
  assert.ok(categories.has('Utility'));
});

test('botEngine: /owo help returns full command directory', async () => {
  const result = await handleBotCommand('/owo help', INITIAL_WALLET, mockUser);
  assert.equal(result.isHandled, true);
  assert.ok(result.botCard);
  assert.ok(result.botCard.title.includes('ALL COMMANDS DIRECTORY'));
  assert.ok(result.botCard.fields && result.botCard.fields.length >= 4);
});

test('botEngine: /owo balance reports current Joules', async () => {
  const result = await handleBotCommand('/owo balance', { ...INITIAL_WALLET, balanceINR: 2500 }, mockUser);
  assert.equal(result.isHandled, true);
  assert.ok(result.botCard);
  assert.ok(result.botCard.title.includes('PLAYER BALANCE'));
  const joulesField = result.botCard.fields?.find(f => f.label === 'Joules');
  assert.ok(joulesField?.value.includes('2,500 Joules'));
});

test('botEngine: /owo daily grants daily Joules reward', async () => {
  const result = await handleBotCommand('/owo daily', { ...INITIAL_WALLET, lastDailyReward: 0 }, mockUser);
  assert.equal(result.isHandled, true);
  assert.ok(result.updatedWallet);
  assert.ok(result.updatedWallet.balanceINR > 0);
  assert.equal(result.updatedWallet.stats.dailyStreak, 1);
});

test('botEngine: /owo work earns Joules and increments workCount', async () => {
  const result = await handleBotCommand('/owo work', INITIAL_WALLET, mockUser);
  assert.equal(result.isHandled, true);
  assert.ok(result.updatedWallet);
  assert.ok(result.updatedWallet.balanceINR > 0);
  assert.equal(result.updatedWallet.stats.workCount, 1);
});

test('botEngine: /owo hunt discovers a creature and adds to wallet pets', async () => {
  const result = await handleBotCommand('/owo hunt', INITIAL_WALLET, mockUser);
  assert.equal(result.isHandled, true);
  assert.ok(result.updatedWallet);
  assert.ok(result.updatedWallet.pets.length >= 1);
  assert.ok(result.botCard?.title.includes('EXPEDITION COMPLETE'));
});

test('botEngine: /owo cf flips coin and calculates outcome', async () => {
  const fundedWallet = { ...INITIAL_WALLET, balanceINR: 1000 };
  const result = await handleBotCommand('/owo cf 100 heads', fundedWallet, mockUser);
  assert.equal(result.isHandled, true);
  assert.ok(result.updatedWallet);
  assert.ok(result.botCard?.title.includes('COIN FLIP'));
});

test('botEngine: /owo animals lists player safari creatures', async () => {
  const walletWithPets = {
    ...INITIAL_WALLET,
    pets: [{
      id: 'pet-1',
      name: 'Cyber Fox',
      emoji: '🦊',
      rarity: 'rare' as const,
      power: 120,
      caughtAt: Date.now(),
      biome: 'Himalayan Frost Peaks',
      valueINR: 2500,
      level: 1,
    }],
  };
  const result = await handleBotCommand('/owo animals', walletWithPets, mockUser);
  assert.equal(result.isHandled, true);
  assert.ok(result.botCard?.title.includes('CREATURE SANCTUARY'));
  const hasCyberFox = result.botCard?.fields?.some(f => f.label.includes('Cyber Fox'));
  assert.ok(hasCyberFox);
});

test('botEngine: /owo redeem grants rewards directly in chat', async () => {
  const initialWallet = { ...INITIAL_WALLET, balanceINR: 500, redeemedCodes: [] };
  const result = await handleBotCommand('/owo redeem HITARTH_MEGA', initialWallet, mockUser);
  assert.equal(result.isHandled, true);
  assert.ok(result.updatedWallet);
  assert.ok(result.updatedWallet.balanceINR > 500);
  assert.ok(result.botCard?.title.includes('PROMO CODE REDEEMED'));
});
