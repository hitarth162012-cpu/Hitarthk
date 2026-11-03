import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDeveloperCodes,
  generateDeveloperCode,
  updateDeveloperCode,
  deleteDeveloperCode,
  redeemCustomGameCode,
  isUserDeveloper,
} from './customCodeService';
import { INITIAL_WALLET } from './economy';
import { UserAccount } from '../types';

const devAccount: UserAccount = {
  id: 'OWO-9850',
  inGameName: 'Hitarth',
  password: 'hashed',
  createdAt: Date.now(),
  role: 'developer',
  isDeveloper: true,
  avatar: '👑',
};

const regularAccount: UserAccount = {
  id: 'OWO-1234',
  inGameName: 'RohanPlayer',
  password: 'hashed',
  createdAt: Date.now(),
  role: 'player',
  isDeveloper: false,
  avatar: '⚡',
};

test('customCodeService: regular users cannot see the hidden code list', () => {
  const codesForRegular = getDeveloperCodes(false);
  assert.equal(codesForRegular.length, 0);

  const codesForDev = getDeveloperCodes(true);
  assert.ok(codesForDev.length > 0);
});

test('customCodeService: regular users cannot generate custom codes', async () => {
  const res = await generateDeveloperCode(
    { code: 'HACKED_CODE', rewardJoules: 99999 },
    regularAccount
  );
  assert.equal(res.success, false);
  assert.ok(res.error?.includes('Permission Denied'));
});

test('customCodeService: developer can generate custom code with customizable amounts and text', async () => {
  const customCodeName = `TEST_CODE_${Date.now().toString(36).toUpperCase()}`;
  const res = await generateDeveloperCode(
    {
      code: customCodeName,
      rewardJoules: 15000,
      rewardXP: 300,
      bonusPetName: 'Mystic Leopard',
      bonusPetEmoji: '🐆',
      bonusPetRarity: 'epic',
      bonusPetPower: 90,
      maxUses: 10,
      notes: 'Custom tournament prize code',
    },
    devAccount
  );

  assert.equal(res.success, true);
  assert.ok(res.code);
  assert.equal(res.code.rewardJoules, 15000);
  assert.equal(res.code.rewardXP, 300);
  assert.equal(res.code.bonusPetName, 'Mystic Leopard');
  assert.equal(res.code.maxUses, 10);
});

test('customCodeService: regular players can redeem valid custom code and receive rewards', async () => {
  const codeName = `PLAYER_BONUS_${Date.now().toString(36).toUpperCase()}`;
  await generateDeveloperCode(
    {
      code: codeName,
      rewardJoules: 7500,
      rewardXP: 150,
      bonusPetName: 'Golden Tiger',
      bonusPetEmoji: '🐯',
      bonusPetRarity: 'legendary',
      bonusPetPower: 92,
      maxUses: 100,
    },
    devAccount
  );

  const initialWallet = { ...INITIAL_WALLET, balanceINR: 1000 };
  const redeemRes = await redeemCustomGameCode(codeName, regularAccount, initialWallet);

  assert.equal(redeemRes.success, true);
  assert.ok(redeemRes.updatedWallet);
  assert.equal(redeemRes.updatedWallet.balanceINR, 1000 + 7500);
  assert.equal(redeemRes.updatedWallet.xp, 150);
  assert.ok(redeemRes.updatedWallet.pets.some((p) => p.name === 'Golden Tiger'));
  assert.ok(redeemRes.updatedWallet.redeemedCodes.includes(codeName));

  // Second redemption by same user must be blocked
  const secondRedeem = await redeemCustomGameCode(codeName, regularAccount, redeemRes.updatedWallet);
  assert.equal(secondRedeem.success, false);
  assert.ok(secondRedeem.message.includes('already redeemed'));
});

test('customCodeService: developer can update reward numbers and toggle active status', async () => {
  const codeName = `EDIT_TEST_${Date.now().toString(36).toUpperCase()}`;
  const created = await generateDeveloperCode(
    { code: codeName, rewardJoules: 2000, rewardXP: 50 },
    devAccount
  );
  assert.ok(created.code);

  // Update amount to 50,000 Joules
  const updated = await updateDeveloperCode(
    created.code.id,
    { rewardJoules: 50000, rewardXP: 500, isActive: false },
    devAccount
  );

  assert.equal(updated.success, true);
  assert.equal(updated.code?.rewardJoules, 50000);
  assert.equal(updated.code?.rewardXP, 500);
  assert.equal(updated.code?.isActive, false);

  // When inactive, redemption fails
  const res = await redeemCustomGameCode(codeName, regularAccount, INITIAL_WALLET);
  assert.equal(res.success, false);
  assert.ok(res.message.includes('deactivated'));
});
