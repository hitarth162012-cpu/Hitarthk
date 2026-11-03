import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePlayerId,
  registerAccount,
  getStoredAccount,
  saveStoredAccount,
  donateRupees,
  accessPrivateServer,
  createPrivateServer,
} from './social';
import { INITIAL_WALLET } from './economy';
import { UserAccount } from '../types';

test('generatePlayerId produces OWO-XXXX formatted string', () => {
  const id = generatePlayerId();
  assert.match(id, /^OWO-\d{4}$/);
});

test('registerAccount enforces validation and creates user account', () => {
  const short = registerAccount('A', 'pass');
  assert.equal(short.success, false);

  const shortPass = registerAccount('Raja', '12');
  assert.equal(shortPass.success, false);

  const good = registerAccount('TigerRider', 'secretPass', '🐯');
  assert.equal(good.success, true);
  assert.ok(good.account);
  assert.equal(good.account.inGameName, 'TigerRider');
  assert.equal(good.account.password, 'secretPass');
  assert.match(good.account.id, /^OWO-\d{4}$/);
});

test('Hitarth OWO-9850 account gets developer role', () => {
  const devAccount: UserAccount = {
    id: 'OWO-9850',
    inGameName: 'Hitarth',
    avatar: '👑',
    createdAt: Date.now(),
    isDeveloper: true,
    role: 'developer',
  };
  saveStoredAccount(devAccount);
  const loaded = getStoredAccount();
  assert.ok(loaded);
  assert.equal(loaded.inGameName, 'Hitarth');
  assert.equal(loaded.id, 'OWO-9850');
  assert.equal(loaded.isDeveloper, true);
  assert.equal(loaded.role, 'developer');
});

test('donateRupees handles transfers, validates balances, and creates records', () => {
  const sender: UserAccount = {
    id: 'OWO-9999',
    inGameName: 'DonorKing',
    avatar: '👑',
    createdAt: Date.now(),
  };

  // Wallet with 0 Joules should fail
  const emptyWallet = { ...INITIAL_WALLET, balanceINR: 0 };
  const failResult = donateRupees(emptyWallet, sender, 'OWO-1234', 'Friend', 1000);
  assert.equal(failResult.success, false);
  assert.ok(failResult.error?.includes('Insufficient balance'));

  // Wallet with 50,000 Joules should succeed
  const fundedWallet = { ...INITIAL_WALLET, balanceINR: 50000 };
  const successResult = donateRupees(fundedWallet, sender, 'OWO-1234', 'Friend', 5000, 'Keep up the good battles!');
  assert.equal(successResult.success, true);
  assert.equal(successResult.updatedWallet.balanceINR, 45000);
  assert.ok(successResult.donation);
  assert.equal(successResult.donation.amountINR, 5000);
  assert.equal(successResult.donation.recipientId, 'OWO-1234');
});

test('createPrivateServer creates and validates new private server', () => {
  const user: UserAccount = {
    id: 'OWO-7777',
    inGameName: 'HostPlayer',
    avatar: '💎',
    createdAt: Date.now(),
  };

  const fresh = createPrivateServer(user, 'Secret Clan Sanctum', 'CLAN88', 'Welcome to the Clan!');
  assert.equal(fresh.success, true);
  assert.ok(fresh.server);
  assert.equal(fresh.server.code, 'CLAN88');
  assert.equal(fresh.server.ownerName, 'HostPlayer');

  // Verify access with newly created code
  const accessed = accessPrivateServer('CLAN88');
  assert.equal(accessed.success, true);
  assert.ok(accessed.server);
  assert.equal(accessed.server.code, 'CLAN88');
});
