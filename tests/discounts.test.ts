import {test} from 'vitest';
import {prisma} from '../src/lib/prisma';
import {scenario} from './fixtures/database';
import {preview} from './helpers/api';

test('four charged days: no discount', async () => {
  await preview(await scenario(prisma, {days: 4}), {
    plannedDays: 4,
    chargedDays: 4,
    includedKm: 800,
    baseAmount: 80000
  }, 80000);
});
test('five charged days: ten percent', async () => {
  await preview(await scenario(prisma, {days: 5}), {
    plannedDays: 5,
    chargedDays: 5,
    includedKm: 1000,
    baseAmount: 100000,
    discountAmount: 10000
  }, 90000);
});
test('discount excludes fuel', async () => {
  await preview(await scenario(prisma, {days: 5, fuel: 12}), {
    plannedDays: 5,
    chargedDays: 5,
    includedKm: 1000,
    baseAmount: 100000,
    discountAmount: 10000,
    fuelFee: 3000
  }, 93000);
});
test('insurance selected', async () => {
  await preview(await scenario(prisma, {insurance: true}), {insuranceFee: 1500}, 21500);
});
test('insurance not selected', async () => {
  await preview(await scenario(prisma, {insurance: false}));
});
test('discount, mileage, insurance and fuel combined', async () => {
  await preview(await scenario(prisma, {
        days: 5,
        distanceKm: 1080,
        fuel: 12,
        insurance: true,
        lateMinutes: 300
      }),
      {
        plannedDays: 5,
        chargedDays: 5,
        includedKm: 1000,
        distanceKm: 1080,
        excessKm: 80,
        baseAmount: 100000,
        discountAmount: 10000,
        mileageFee: 5600,
        fuelFee: 3000,
        insuranceFee: 7500,
        lateMinutes: 300,
        lateFee: 12000
      }, 118100);
});
test('half tenge discount rounds upward', async () => {
  await prisma.pricingRule.update({where: {carClass: 'ECONOMY'}, data: {dailyRate: 20001}});
  await preview(await scenario(prisma, {days: 5}), {
    plannedDays: 5,
    chargedDays: 5,
    includedKm: 1000,
    baseAmount: 100005,
    discountAmount: 10001
  }, 90004);
});
test('extra day activates discount and insurance', async () => {
  await preview(await scenario(prisma, {days: 4, lateMinutes: 361, insurance: true}),
      {
        plannedDays: 4,
        chargedDays: 5,
        extraDays: 1,
        lateMinutes: 361,
        includedKm: 1000,
        baseAmount: 100000,
        discountAmount: 10000,
        insuranceFee: 7500
      }, 97500);
});
test('worked example totals 80600 KZT', async () => {
  await preview(await scenario(prisma, {days: 3, lateMinutes: 300, distanceKm: 680, fuel: 12}),
      {
        plannedDays: 3,
        chargedDays: 3,
        lateMinutes: 300,
        includedKm: 600,
        distanceKm: 680,
        excessKm: 80,
        baseAmount: 60000,
        lateFee: 12000,
        mileageFee: 5600,
        fuelFee: 3000
      }, 80600);
});
test('fuel and insurance rates come from database', async () => {
  await prisma.pricingRule.update({
    where: {carClass: 'ECONOMY'},
    data: {missingFuelPricePerLiter: 333, insuranceDailyRate: 1777}
  });
  await preview(await scenario(prisma, {fuel: 2, insurance: true}), {
    fuelFee: 666,
    insuranceFee: 1777
  }, 22443);
});
test('discount threshold and percentage come from database', async () => {
  await prisma.pricingRule.update({
    where: {carClass: 'ECONOMY'},
    data: {longRentalMinDays: 1, longRentalDiscountPercent: 15}
  });
  await preview(await scenario(prisma), {discountAmount: 3000}, 17000);
});
