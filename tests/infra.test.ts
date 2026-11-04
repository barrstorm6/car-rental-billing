import {expect, test} from 'vitest';
import {prisma} from '../src/lib/prisma';
import {scenario} from './fixtures/database';
import {request} from './helpers/api';
import {assertTestDatabase, DEV_URL, TEST_URL} from '../scripts/safety.mjs';

test('real PostgreSQL connection', async () => {
  expect(await prisma.$queryRaw`SELECT 1 AS value`).toEqual([{value: 1}]);
});
test('all five migrated tables and isolated fixtures', async () => {
  expect(await prisma.car.count()).toBe(2);
  expect(await prisma.pricingRule.count()).toBe(2);
  expect(await prisma.rental.count()).toBe(0);
  expect(await prisma.rentalReturn.count()).toBe(0);
  expect(await prisma.rentalInvoice.count()).toBe(0);
});
test('health handler checks database', async () => {
  const r = await fetch(process.env.API_BASE_URL + '/api/health');
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({status: 'ok'});
});
test.each(['GET', 'POST'] as const)('%s student handler exists and returns NOT_IMPLEMENTED', async method => {
  const id = await scenario(prisma);
  const r = await request(id, method);
  expect(r.status).toBe(501);
  expect(await r.json()).toEqual({error: {code: 'NOT_IMPLEMENTED', message: 'Not implemented'}});
});
test('unique invoice constraint and foreign keys are real', async () => {
  const id = await scenario(prisma);
  await prisma.rentalInvoice.create({
    data: {
      rentalId: id,
      breakdown: {},
      totalAmount: 0,
      currency: 'KZT'
    }
  });
  await expect(prisma.rentalInvoice.create({
    data: {
      rentalId: id,
      breakdown: {},
      totalAmount: 0,
      currency: 'KZT'
    }
  })).rejects.toThrow();
  await expect(prisma.rentalReturn.create({
    data: {
      rentalId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      actualReturnAt: new Date(),
      endOdometerKm: 1,
      missingFuelLiters: 0
    }
  })).rejects.toThrow();
});
test('test reset refuses development and remote URLs', () => {
  expect(() => assertTestDatabase(DEV_URL)).toThrow('Unsafe');
  expect(() => assertTestDatabase(TEST_URL.replace('127.0.0.1', 'example.org'))).toThrow('Unsafe');
  expect(() => assertTestDatabase(TEST_URL + '?schema=public')).toThrow('Unsafe');
  expect(assertTestDatabase(TEST_URL)).toBe(TEST_URL);
});
