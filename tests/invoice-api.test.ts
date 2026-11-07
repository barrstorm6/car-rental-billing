import {expect, test} from 'vitest';
import {prisma} from '../src/lib/prisma';
import {scenario} from './fixtures/database';
import {expectedInvoice, expectError, preview, request} from './helpers/api';

test('unknown rental returns 404', async () => {
  await expectError('ffffffff-ffff-4fff-8fff-ffffffffffff', 404, 'RENTAL_NOT_FOUND', 'Rental not found');
});
test('missing return returns 409', async () => {
  await expectError(await scenario(prisma, {noReturn: true}), 409, 'RETURN_NOT_RECORDED', 'Return not recorded');
});
test.each([0, -1])('invalid rental duration %i', async durationMinutes => {
  await expectError(await scenario(prisma, {durationMinutes}), 422, 'INVALID_RENTAL_PERIOD', 'Invalid rental period');
});
test('return before rental start', async () => {
  await expectError(await scenario(prisma, {lateMinutes: -1441}), 422, 'INVALID_RETURN_TIME', 'Invalid return time');
});

test.each(['GET', 'POST'] as const)('%s accepts return exactly at rental start', async method => {
  const id = await scenario(prisma, {lateMinutes: -1440, distanceKm: 0});
  const response = await request(id, method);
  const body = await response.json();
  expect(response.status).toBe(method === 'POST' ? 201 : 200);
  expect(body).toEqual({
    ...expectedInvoice(id, {distanceKm: 0}),
    ...(method === 'POST' ? {
      status: 'FINAL', invoiceId: expect.any(String), createdAt: expect.any(String)
    } : {})
  });
  expect(await prisma.rentalInvoice.count({where: {rentalId: id}})).toBe(method === 'POST' ? 1 : 0);
  expect((await prisma.rental.findUniqueOrThrow({where: {id}})).status).toBe(method === 'POST' ? 'CLOSED' : 'OPEN');
});

test.each(['GET', 'POST'] as const)('%s rejects CLOSED rental without invoice before checking tariff or return', async method => {
  const id = await scenario(prisma, {noReturn: true});
  await prisma.rental.update({where: {id}, data: {status: 'CLOSED'}});
  await prisma.pricingRule.delete({where: {carClass: 'ECONOMY'}});

  await expectError(id, 500, 'INTERNAL_ERROR', 'Internal server error', method);
  expect(await prisma.rentalInvoice.count({where: {rentalId: id}})).toBe(0);
  expect((await prisma.rental.findUniqueOrThrow({where: {id}})).status).toBe('CLOSED');
});

for (const method of ['GET', 'POST'] as const) {
  test.each([
    [{durationMinutes: 0, lateMinutes: -1, distanceKm: -1, fuel: -1}, 'INVALID_RENTAL_PERIOD', 'Invalid rental period'],
    [{lateMinutes: -1441, distanceKm: -1, fuel: -1}, 'INVALID_RETURN_TIME', 'Invalid return time'],
    [{distanceKm: -1, fuel: -1}, 'INVALID_ODOMETER', 'Invalid odometer'],
  ] as const)(`${method} validates conflicting inputs in order: %s`, async (options, code, message) => {
    const id = await scenario(prisma, options);
    await expectError(id, 422, code, message, method);
    expect(await prisma.rentalInvoice.count({where: {rentalId: id}})).toBe(0);
    expect((await prisma.rental.findUniqueOrThrow({where: {id}})).status).toBe('OPEN');
  });
}
test('negative fuel', async () => {
  await expectError(await scenario(prisma, {fuel: -1}), 422, 'INVALID_FUEL_AMOUNT', 'Invalid fuel amount');
});
test('missing pricing rule', async () => {
  const id = await scenario(prisma);
  await prisma.pricingRule.delete({where: {carClass: 'ECONOMY'}});
  await expectError(id, 409, 'PRICING_RULE_NOT_FOUND', 'Pricing rule not found');
});
test('GET does not persist invoice or close rental', async () => {
  const id = await scenario(prisma);
  await preview(id);
  expect(await prisma.rentalInvoice.count()).toBe(0);
  expect((await prisma.rental.findUniqueOrThrow({where: {id}})).status).toBe('OPEN');
});
test('POST persists exact breakdown, total and CLOSED atomically', async () => {
  const id = await scenario(prisma, {days: 3, lateMinutes: 300, distanceKm: 680, fuel: 12});
  const response = await request(id, 'POST');
  const body = await response.json();
  expect({status: response.status, body}).toEqual({
    status: 201, body: {
      ...expectedInvoice(id, {
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
      }, 80600),
      status: 'FINAL', invoiceId: expect.any(String), createdAt: expect.any(String),
    }
  });
  const stored = await prisma.rentalInvoice.findUniqueOrThrow({where: {rentalId: id}});
  expect(body.invoiceId.length).toBeGreaterThan(0);
  expect(stored).toMatchObject({
    id: body.invoiceId,
    rentalId: id,
    totalAmount: 80600,
    currency: 'KZT',
    breakdown: body.breakdown
  });
  expect(stored.createdAt.toISOString()).toBe(body.createdAt);
  expect((await prisma.rental.findUniqueOrThrow({where: {id}})).status).toBe('CLOSED');
});
test('repeat POST returns 200 with same immutable invoice', async () => {
  const id = await scenario(prisma);
  const first = await request(id, 'POST');
  expect(first.status).toBe(201);
  const original = await first.json();
  const storedBefore = await prisma.rentalInvoice.findUniqueOrThrow({where: {rentalId: id}});
  const second = await request(id, 'POST');
  expect(second.status).toBe(200);
  expect(await second.json()).toEqual(original);
  expect(await prisma.rentalInvoice.count({where: {rentalId: id}})).toBe(1);
  expect(await prisma.rentalInvoice.findUniqueOrThrow({where: {rentalId: id}})).toEqual(storedBefore);
});
test('closed GET and POST ignore changed or missing tariff and changed return', async () => {
  const id = await scenario(prisma);
  const first = await request(id, 'POST');
  expect(first.status).toBe(201);
  const original = await first.json();
  await prisma.pricingRule.update({where: {carClass: 'ECONOMY'}, data: {dailyRate: 99999}});
  let response = await request(id);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(original);
  await prisma.pricingRule.delete({where: {carClass: 'ECONOMY'}});
  await prisma.rentalReturn.delete({where: {rentalId: id}});
  for (const method of ['GET', 'POST'] as const) {
    response = await request(id, method);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(original);
  }
});
test.each([
  [{distanceKm: -1}, 'INVALID_ODOMETER', 'Invalid odometer'],
  [{fuel: -1}, 'INVALID_FUEL_AMOUNT', 'Invalid fuel amount'],
  [{durationMinutes: 0}, 'INVALID_RENTAL_PERIOD', 'Invalid rental period'],
] as const)('failed close leaves no financial side effects: %j', async (options, code, message) => {
  const id = await scenario(prisma, options);
  await expectError(id, 422, code, message, 'POST');
  expect(await prisma.rentalInvoice.count()).toBe(0);
  expect((await prisma.rental.findUniqueOrThrow({where: {id}})).status).toBe('OPEN');
});
test('database write failure rolls back invoice AND rental status', async () => {
  const id = await scenario(prisma);
  // A real database fault injected after invoice insertion, no service mocks.
  await prisma.$executeRawUnsafe(`CREATE FUNCTION reject_rental_close() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status = 'CLOSED' THEN RAISE EXCEPTION 'test-only write failure'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER reject_close BEFORE UPDATE ON rentals FOR EACH ROW EXECUTE FUNCTION reject_rental_close()`);
  try {
    const response = await request(id, 'POST');
    const body = await response.json();
    expect({status: response.status, body}).toEqual({
      status: 500,
      body: {error: {code: 'INTERNAL_ERROR', message: 'Internal server error'}}
    });
    expect(await prisma.rentalInvoice.count()).toBe(0);
    expect((await prisma.rental.findUniqueOrThrow({where: {id}})).status).toBe('OPEN');
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS reject_close ON rentals');
    await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS reject_rental_close()');
  }
});
test('POST unknown rental', async () => {
  await expectError('ffffffff-ffff-4fff-8fff-ffffffffffff', 404, 'RENTAL_NOT_FOUND', 'Rental not found', 'POST');
});
test('POST without return has no side effects', async () => {
  const id = await scenario(prisma, {noReturn: true});
  await expectError(id, 409, 'RETURN_NOT_RECORDED', 'Return not recorded', 'POST');
  expect(await prisma.rentalInvoice.count()).toBe(0);
  expect((await prisma.rental.findUniqueOrThrow({where: {id}})).status).toBe('OPEN');
});
