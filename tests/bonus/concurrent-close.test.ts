import {expect, test} from 'vitest';
import {prisma} from '@/lib/prisma';
import {scenario} from '../fixtures/database';
import {expectedInvoice, request} from '../helpers/api';

test('two concurrent close requests create exactly one invoice', async () => {
  const id = await scenario(prisma);
  const responses = await Promise.all([request(id, 'POST'), request(id, 'POST')]);
  expect(responses.map(r => r.status).sort()).toEqual([200, 201]);
  const bodies = await Promise.all(responses.map(r => r.json()));
  expect(bodies[0]).toEqual(bodies[1]);
  expect(bodies[0]).toEqual({
    ...expectedInvoice(id),
    status: 'FINAL',
    invoiceId: expect.any(String),
    createdAt: expect.any(String)
  });
  const invoices = await prisma.rentalInvoice.findMany({where: {rentalId: id}});
  expect(invoices).toHaveLength(1);
  expect(invoices[0].totalAmount).toBe(20000);
  expect(invoices[0].id).toBe(bodies[0].invoiceId);
  expect(invoices[0].breakdown).toEqual(bodies[0].breakdown);
  expect((await prisma.rental.findUniqueOrThrow({where: {id}})).status).toBe('CLOSED');
});
