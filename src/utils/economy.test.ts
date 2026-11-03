import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_WALLET,
  formatINR,
  redeemCode,
  addToWallet,
  subtractFromWallet,
  playCoinFlip,
  playSlots,
  checkHighLowGuess,
  performHunt,
  SLOT_SYMBOLS,
  PUBLIC_DISCOVERABLE_CODES,
} from './economy';

test('initial wallet starts at exactly 0 Indian Rupees (INR) and has teamPetIds initialized', () => {
  assert.equal(INITIAL_WALLET.balanceINR, 0);
  assert.ok(INITIAL_WALLET.teamPetIds.length > 0);
});

test('public discoverable codes never expose the secret hitarth code', () => {
  const publicKeys = Object.keys(PUBLIC_DISCOVERABLE_CODES).map((k) => k.toLowerCase());
  assert.equal(publicKeys.includes('hitarth'), false);
});

test('secret code "hitarth" works secretly and grants ₹50,000 Indian Rupees (50% reduced)', () => {
  const { updatedWallet, result } = redeemCode(INITIAL_WALLET, 'hitarth');
  assert.equal(result.success, true);
  assert.equal(result.amount, 50000);
  assert.equal(updatedWallet.balanceINR, 50000);
  assert.ok(updatedWallet.redeemedCodes.includes('hitarth'));
});

test('slot machine lose percentage is set to 70% (30% win rate)', () => {
  let lossCount = 0;
  const iterations = 1000;

  for (let i = 0; i < iterations; i++) {
    const outcome = playSlots(100);
    if (!outcome.isWin) {
      lossCount++;
    }
  }

  const lossPercentage = (lossCount / iterations) * 100;
  // With 1000 trials, 70% expected rate typically falls within 64% to 76%
  assert.ok(
    lossPercentage >= 63 && lossPercentage <= 77,
    `Expected ~70% losses, got ${lossPercentage}%`
  );
});

test('coin flip: heads outcome pays 2x bet on correct guess and 0 on incorrect guess (50/50 fair odds)', () => {
  const win = playCoinFlip(1000, 'heads', 'heads');
  assert.equal(win.isWin, true);
  assert.equal(win.payoutINR, 2000);
  assert.equal(win.netChangeINR, 1000);

  const loss = playCoinFlip(1000, 'heads', 'tails');
  assert.equal(loss.isWin, false);
  assert.equal(loss.payoutINR, 0);
  assert.equal(loss.netChangeINR, -1000);
});

test('addToWallet and subtractFromWallet work correctly', () => {
  const updated = addToWallet(INITIAL_WALLET, 5000, 'Coin Flip', 'Heads win!');
  assert.equal(updated.balanceINR, 5000);

  const spent = subtractFromWallet(updated, 1000, 'Video Studio', '15s video');
  assert.equal(spent.success, true);
  assert.equal(spent.updatedWallet.balanceINR, 4000);
});

test('high-low guess returns accurate outcome', () => {
  assert.equal(checkHighLowGuess(5, 10, 'higher'), 'win');
  assert.equal(checkHighLowGuess(10, 4, 'higher'), 'loss');
  assert.equal(checkHighLowGuess(8, 2, 'lower'), 'win');
  assert.equal(checkHighLowGuess(7, 7, 'higher'), 'tie');
});

test('hunting awards a valid pet', () => {
  const pet = performHunt('Indian Jungle');
  assert.ok(pet.name.length > 0);
  assert.ok(pet.valueINR > 0);
  assert.ok(pet.power > 0);
});
