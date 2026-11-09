import {Car, PricingRule, Prisma, Rental, RentalReturn} from '../generated/prisma/client';
export type { CarClass, RentalStatus } from '../generated/prisma/client';



export interface PricingInput {
  rental: Rental;
  car: Car;
  pricingRule: PricingRule;
  rentalReturn: RentalReturn
}

export interface InvoiceBreakdown {
  plannedDays: number; lateMinutes: number; extraDays: number; chargedDays: number;
  distanceKm: number; includedKm: number; excessKm: number; baseAmount: number;
  discountAmount: number; lateFee: number; mileageFee: number; fuelFee: number; insuranceFee: number;
}
export interface PricingResult {
  breakdown: InvoiceBreakdown;
  totalAmount: number
}

export interface InvoiceDto extends PricingResult {
  rentalId: string;
  invoiceId: string | null;
  status: 'PREVIEW' | 'FINAL';
  currency: 'KZT';
  createdAt: string | null;
}


export interface CloseResult {
  invoice: InvoiceDto;
  created: boolean
}

export interface RentalRouteContext {
  params: Promise<{ id: string }>
}

export function parseInvoiceBreakdown(value:Prisma.JsonValue):InvoiceBreakdown{
  if(typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid invoice breakdown');
  }

  const getNumber = (key: keyof InvoiceBreakdown)=>{
    const field = value[key]
    if(typeof field !== 'number' || !Number.isFinite(field)){
      throw new Error(`Invalid invoice breakdown field: ${key}`);
    }
    return field
  }
  return {
    plannedDays: getNumber('plannedDays'),
    lateMinutes: getNumber('lateMinutes'),
    extraDays: getNumber('extraDays'),
    chargedDays: getNumber('chargedDays'),
    distanceKm: getNumber('distanceKm'),
    includedKm: getNumber('includedKm'),
    excessKm: getNumber('excessKm'),
    baseAmount: getNumber('baseAmount'),
    discountAmount: getNumber('discountAmount'),
    lateFee: getNumber('lateFee'),
    mileageFee: getNumber('mileageFee'),
    fuelFee: getNumber('fuelFee'),
    insuranceFee: getNumber('insuranceFee'),
  }
}

