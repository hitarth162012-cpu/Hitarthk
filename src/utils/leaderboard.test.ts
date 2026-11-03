import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_RIVALS,
  computeLeaderboard,
  getTitleForINR,
  DEFAULT_PLAYER_PROFILE,
} from './leaderboard';

test('BASE_RIVALS contains 10 competitors sorted descending by accumulated INR', () => {
  assert.equal(BASE_RIVALS.length, 10);
  for (let i = 0; i < BASE_RIVALS.length - 1; i++) {
    assert.ok(
      BASE_RIVALS[i].accumulatedINR >= BASE_RIVALS[i + 1].accumulatedINR,
      `Rivals should be sorted: ${BASE_RIVALS[i].name} (${BASE_RIVALS[i].accumulatedINR}) vs ${BASE_RIVALS[i + 1].name} (${BASE_RIVALS[i + 1].accumulatedINR})`
    );
  }
});

test('getTitleForINR assigns correct titles', () => {
  assert.equal(getTitleForINR(0), 'Arcade Rookie');
  assert.equal(getTitleForINR(1000), 'Arcade Rookie');
  assert.equal(getTitleForINR(5000), 'Rising Contender');
  assert.equal(getTitleForINR(20000), 'Rupee Tactician');
  assert.equal(getTitleForINR(50000), 'Arcade Champion');
  assert.equal(getTitleForINR(100000), 'Lakhpati Highroller');
  assert.equal(getTitleForINR(200000), 'Crorepati Tycoon');
  assert.equal(getTitleForINR(350000), 'OwO Sovereign God');
  assert.equal(getTitleForINR(1000000), 'OwO Sovereign God');
});

test('computeLeaderboard places 0 INR player at rank 11 with accurate deficit to 10th place', () => {
  const result = computeLeaderboard(BASE_RIVALS, {
    name: 'TestRookie',
    avatar: '⚡',
    accumulatedINR: 0,
    petName: 'Baby Bengal Cub',
    petEmoji: '🐯',
  });

  assert.equal(result.userRank, 11);
  assert.equal(result.top10.length, 10);
  // 10th place has 25,000, so deficit to beat it is 25,001
  assert.equal(result.deficitToTop10, 25001);
  // Verify top 10 does not include player when at rank 11
  assert.equal(result.top10.some((e) => e.isCurrentPlayer), false);
});

test('computeLeaderboard places player with 50,000 INR into top 10 at rank 8', () => {
  const result = computeLeaderboard(BASE_RIVALS, {
    name: 'HitarthMaster',
    avatar: '👑',
    accumulatedINR: 50000,
  });

  // #7 GoldenFalcon_Dev has 58,000; #8 BengalTigerKing has 48,000
  // So 50,000 puts player between #7 and #8 -> player becomes rank 8!
  assert.equal(result.userRank, 8);
  assert.equal(result.top10.length, 10);
  assert.equal(result.top10[7].isCurrentPlayer, true);
  assert.equal(result.top10[7].accumulatedINR, 50000);
  assert.equal(result.deficitToTop10, 0); // Already in top 10!
});

test('computeLeaderboard places player with 400,000 INR at rank 1 (Crown spot)', () => {
  const result = computeLeaderboard(BASE_RIVALS, {
    name: 'SupremeKing',
    avatar: '👑',
    accumulatedINR: 400000,
  });

  assert.equal(result.userRank, 1);
  assert.equal(result.top10[0].isCurrentPlayer, true);
  assert.equal(result.top10[0].name, 'SupremeKing');
  assert.equal(result.top10[0].rank, 1);
  assert.equal(result.top10.length, 10);
});

test('DEFAULT_PLAYER_PROFILE is configured', () => {
  assert.ok(DEFAULT_PLAYER_PROFILE.name.length > 0);
  assert.ok(DEFAULT_PLAYER_PROFILE.avatar.length > 0);
});
