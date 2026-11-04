import {test} from 'vitest';
import {prisma} from '../src/lib/prisma';
import {scenario} from './fixtures/database';
import {preview} from './helpers/api';

// Explicit examples, not a second pricing implementation.
test.each([
  [0, 0, 0, 1, 200, 20000, 20000],
  [60, 0, 0, 1, 200, 20000, 20000],
  [61, 3000, 0, 1, 200, 20000, 23000],
  [120, 3000, 0, 1, 200, 20000, 23000],
  [121, 6000, 0, 1, 200, 20000, 26000],
  [360, 15000, 0, 1, 200, 20000, 35000],
  [361, 0, 1, 2, 400, 40000, 40000],
  [1440, 0, 1, 2, 400, 40000, 40000],
  [1441, 0, 2, 3, 600, 60000, 60000],
])('late %i minutes: correct complete breakdown', async (lateMinutes, lateFee, extraDays, chargedDays, includedKm, baseAmount, total) => {
  await preview(await scenario(prisma, {lateMinutes}), {
    lateMinutes,
    lateFee,
    extraDays,
    chargedDays,
    includedKm,
    baseAmount
  }, total);
});
test('one millisecond beyond grace rounds up', async () => {
  await preview(await scenario(prisma, {lateMinutes: 60, lateMilliseconds: 1}), {
    lateMinutes: 61,
    lateFee: 3000
  }, 23000);
});
test('one millisecond beyond hourly limit adds day', async () => {
  await preview(await scenario(prisma, {lateMinutes: 360, lateMilliseconds: 1}), {
    lateMinutes: 361,
    extraDays: 1,
    chargedDays: 2,
    includedKm: 400,
    baseAmount: 40000
  }, 40000);
});
test('early return never reduces planned charge', async () => {
  await preview(await scenario(prisma, {lateMinutes: -120}));
});
test('thresholds and hourly rate come from database', async () => {
  await prisma.pricingRule.update({
    where: {carClass: 'ECONOMY'},
    data: {graceMinutes: 30, hourlyLateLimitMinutes: 120, lateHourlyRate: 4321}
  });
  await preview(await scenario(prisma, {lateMinutes: 31}), {lateMinutes: 31, lateFee: 4321}, 24321);
});
test('changed hourly limit comes from database', async () => {
  await prisma.pricingRule.update({
    where: {carClass: 'ECONOMY'},
    data: {hourlyLateLimitMinutes: 120}
  });
  await preview(await scenario(prisma, {lateMinutes: 121}), {
    lateMinutes: 121,
    extraDays: 1,
    chargedDays: 2,
    includedKm: 400,
    baseAmount: 40000
  }, 40000);
});
