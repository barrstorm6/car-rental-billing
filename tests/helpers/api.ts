import {expect} from 'vitest';
import type {InvoiceBreakdown, InvoiceDto} from '../../src/types/invoice';

export async function request(id: string, method: 'GET' | 'POST' = 'GET') {
  return fetch(process.env.API_BASE_URL + '/api/rentals/' + encodeURIComponent(id) + (method === 'GET' ? '/invoice' : '/close'), {
    method,
    signal: AbortSignal.timeout(25000)
  });
}

export const basicBreakdown: InvoiceBreakdown = {
  plannedDays: 1,
  lateMinutes: 0,
  extraDays: 0,
  chargedDays: 1,
  distanceKm: 100,
  includedKm: 200,
  excessKm: 0,
  baseAmount: 20000,
  discountAmount: 0,
  lateFee: 0,
  mileageFee: 0,
  fuelFee: 0,
  insuranceFee: 0
};

export function expectedInvoice(id: string, overrides: Partial<InvoiceBreakdown> = {}, totalAmount = 20000): InvoiceDto {
  return {
    rentalId: id,
    invoiceId: null,
    status: 'PREVIEW',
    currency: 'KZT',
    breakdown: {...basicBreakdown, ...overrides},
    totalAmount,
    createdAt: null
  };
}

export async function preview(id: string, overrides: Partial<InvoiceBreakdown> = {}, total = 20000) {
  const response = await request(id);
  const body = await response.json();
  expect({status: response.status, body}).toEqual({
    status: 200,
    body: expectedInvoice(id, overrides, total)
  });
  return body as InvoiceDto;
}

export async function expectError(id: string, status: number, code: string, message: string, method: 'GET' | 'POST' = 'GET') {
  const response = await request(id, method);
  expect({status: response.status, body: await response.json()}).toEqual({
    status,
    body: {error: {code, message}}
  });
}
