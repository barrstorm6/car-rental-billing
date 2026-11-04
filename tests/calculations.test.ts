import {expect, test} from 'vitest';
import {prisma} from '../src/lib/prisma';
import {scenario} from './fixtures/database';
import {preview} from './helpers/api';

test('24 hours = one day / ECONOMY', async () => {
  await preview(await scenario(prisma));
});
test('24 hours plus one minute = two days', async () => {
  await preview(await scenario(prisma, {durationMinutes: 1441}), {
    plannedDays: 2,
    chargedDays: 2,
    includedKm: 400,
    baseAmount: 40000
  }, 40000);
});
test('three planned days', async () => {
  await preview(await scenario(prisma, {days: 3}), {
    plannedDays: 3,
    chargedDays: 3,
    includedKm: 600,
    baseAmount: 60000
  }, 60000);
});
test('SUV loads its own tariff', async () => {
  await preview(await scenario(prisma, {
        suv: true,
        distanceKm: 301,
        fuel: 1,
        insurance: true,
        lateMinutes: 61
      }),
      {
        includedKm: 300,
        distanceKm: 301,
        excessKm: 1,
        mileageFee: 100,
        fuelFee: 400,
        insuranceFee: 3500,
        baseAmount: 35000,
        lateMinutes: 61,
        lateFee: 5000
      }, 44000);
});
test('daily rate is read from PostgreSQL on every preview', async () => {
  const id = await scenario(prisma);
  await preview(id);
  await prisma.pricingRule.update({where: {carClass: 'ECONOMY'}, data: {dailyRate: 21001}});
  await preview(id, {baseAmount: 21001}, 21001);
});
test('short positive rental is at least one day', async () => {
  await preview(await scenario(prisma, {durationMinutes: 1}));
});
test('UTC elapsed time across a timezone offset', async () => {
  const id = await scenario(prisma);
  await prisma.rental.update({
    where: {id},
    data: {
      scheduledStartAt: new Date('2026-03-28T12:00:00+01:00'),
      scheduledEndAt: new Date('2026-03-29T12:00:00+02:00')
    }
  });
  await prisma.rentalReturn.update({
    where: {rentalId: id},
    data: {actualReturnAt: new Date('2026-03-29T10:00:00Z')}
  });
  await preview(id);
});
test('repeated preview is deterministic', async () => {
  const id = await scenario(prisma);
  expect(await preview(id)).toEqual(await preview(id));
});
