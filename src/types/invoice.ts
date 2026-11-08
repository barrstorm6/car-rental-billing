import type { Car, PricingRule, Rental, RentalReturn } from '../generated/prisma/client';
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
  created: boolean }
export interface RentalRouteContext {
  params: Promise<{ id: string }> }
