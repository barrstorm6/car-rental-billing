import {expect, test} from 'vitest';
import {prisma} from '../src/lib/prisma';
import {scenario} from './fixtures/database';
import {expectError, preview} from './helpers/api';

test.each([
  [100, 0, 0, 20000], [200, 0, 0, 20000], [201, 1, 70, 20070], [280, 80, 5600, 25600],
])('distance %i km', async (distanceKm, excessKm, mileageFee, total) => {
  await preview(await scenario(prisma, {distanceKm}), {distanceKm, excessKm, mileageFee}, total);
});
test('odometer cannot move backwards', async () => {
  await expectError(await scenario(prisma, {distanceKm: -1}), 422, 'INVALID_ODOMETER', 'Invalid odometer');
});

for (const method of ['GET', 'POST'] as const) {
  test.each([
    [-100, 100],
    [-200, -100],
    [100, -100],
  ])(`${method} rejects negative odometer readings: start %i, end %i`, async (startOdometerKm, endOdometerKm) => {
    const id = await scenario(prisma);
    await prisma.rental.update({where: {id}, data: {startOdometerKm}});
    await prisma.rentalReturn.update({where: {rentalId: id}, data: {endOdometerKm}});

    await expectError(id, 422, 'INVALID_ODOMETER', 'Invalid odometer', method);
    expect(await prisma.rentalInvoice.count({where: {rentalId: id}})).toBe(0);
    expect((await prisma.rental.findUniqueOrThrow({where: {id}})).status).toBe('OPEN');
  });
}
test('extra days increase included mileage', async () => {
  await preview(await scenario(prisma, {lateMinutes: 361, distanceKm: 401}), {
    lateMinutes: 361,
    extraDays: 1,
    chargedDays: 2,
    baseAmount: 40000,
    includedKm: 400,
    distanceKm: 401,
    excessKm: 1,
    mileageFee: 70
  }, 40070);
});
test('mileage allowance and excess rate come from database', async () => {
  await prisma.pricingRule.update({
    where: {carClass: 'ECONOMY'},
    data: {includedKmPerDay: 50, excessKmRate: 81}
  });
  await preview(await scenario(prisma), {includedKm: 50, excessKm: 50, mileageFee: 4050}, 24050);
});
