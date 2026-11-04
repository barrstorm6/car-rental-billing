import 'dotenv/config';
import {prisma} from '@/lib/prisma';
import {assertDevDatabase} from '../scripts/safety.mjs';
import type {Prisma} from '../src/generated/prisma/client';

assertDevDatabase(process.env.DATABASE_URL);
const tariffs = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    carClass: 'ECONOMY',
    dailyRate: 20000,
    graceMinutes: 60,
    hourlyLateLimitMinutes: 360,
    lateHourlyRate: 3000,
    includedKmPerDay: 200,
    excessKmRate: 70,
    missingFuelPricePerLiter: 250,
    insuranceDailyRate: 1500,
    longRentalMinDays: 5,
    longRentalDiscountPercent: 10
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    carClass: 'SUV',
    dailyRate: 35000,
    graceMinutes: 60,
    hourlyLateLimitMinutes: 360,
    lateHourlyRate: 5000,
    includedKmPerDay: 300,
    excessKmRate: 100,
    missingFuelPricePerLiter: 400,
    insuranceDailyRate: 3500,
    longRentalMinDays: 5,
    longRentalDiscountPercent: 10
  },
] satisfies Prisma.PricingRuleCreateManyInput[];
const cars = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    brand: 'Toyota',
    model: 'Corolla',
    carClass: 'ECONOMY',
    plateNumber: '001AAA02'
  },
  {id: '10000000-0000-4000-8000-000000000002', brand: 'Kia', model: 'Rio', carClass: 'ECONOMY', plateNumber: '002AAA02'},
  {id: '10000000-0000-4000-8000-000000000003', brand: 'Toyota', model: 'RAV4', carClass: 'SUV', plateNumber: '003AAA02'},
  {id: '10000000-0000-4000-8000-000000000004', brand: 'Hyundai', model: 'Tucson', carClass: 'SUV', plateNumber: '004AAA02'},
] satisfies Prisma.CarCreateManyInput[];
// Literal demo inputs and one historical snapshot; no reference calculator.
const scenarios = [
  {name: 'rental-basic', id: '30000000-0000-4000-8000-000000000001', days: 3, late: 300, km: 680, fuel: 12},
  {name: 'rental-one-day', id: '30000000-0000-4000-8000-000000000002'}, {name: 'rental-24h-1m', id: '30000000-0000-4000-8000-000000000003', minutes: 1441},
  {name: 'rental-three-days', id: '30000000-0000-4000-8000-000000000004', days: 3}, {name: 'rental-suv', id: '30000000-0000-4000-8000-000000000005', suv: true},
  {name: 'rental-late-60m', id: '30000000-0000-4000-8000-000000000006', late: 60}, {name: 'rental-late-61m', id: '30000000-0000-4000-8000-000000000007', late: 61},
  {name: 'rental-late-120m', id: '30000000-0000-4000-8000-000000000008', late: 120}, {name: 'rental-late-121m', id: '30000000-0000-4000-8000-000000000009', late: 121},
  {name: 'rental-late-5h', id: '30000000-0000-4000-8000-000000000010', late: 300}, {name: 'rental-late-360m', id: '30000000-0000-4000-8000-000000000011', late: 360},
  {name: 'rental-late-361m', id: '30000000-0000-4000-8000-000000000012', late: 361}, {name: 'rental-late-1440m', id: '30000000-0000-4000-8000-000000000013', late: 1440},
  {name: 'rental-late-1441m', id: '30000000-0000-4000-8000-000000000014', late: 1441}, {name: 'rental-mileage-limit', id: '30000000-0000-4000-8000-000000000015', km: 200},
  {name: 'rental-mileage-excess', id: '30000000-0000-4000-8000-000000000016', km: 280}, {name: 'rental-four-days', id: '30000000-0000-4000-8000-000000000017', days: 4},
  {name: 'rental-five-days', id: '30000000-0000-4000-8000-000000000018', days: 5}, {name: 'rental-insurance', id: '30000000-0000-4000-8000-000000000019', insurance: true},
  {name: 'rental-combined', id: '30000000-0000-4000-8000-000000000020', days: 5, km: 1580, fuel: 10, insurance: true, suv: true},
  {name: 'rental-closed', id: '30000000-0000-4000-8000-000000000021', closed: true},
  {name: 'rental-open-corolla', id: '30000000-0000-4000-8000-000000000022', noReturn: true},
  {name: 'rental-open-suv', id: '30000000-0000-4000-8000-000000000023', noReturn: true, suv: true},
  {name: 'rental-early-return', id: '30000000-0000-4000-8000-000000000024', late: -120},
] satisfies Array<{
  id: string;
  name: string;
  days?: number;
  minutes?: number;
  late?: number;
  km?: number;
  fuel?: number;
  insurance?: boolean;
  suv?: boolean;
  noReturn?: boolean;
  closed?: boolean
}>;
try {
  await prisma.$transaction(async tx => {
    for (const data of tariffs) await tx.pricingRule.upsert({
      where: {carClass: data.carClass},
      create: data,
      update: data
    });
    for (const data of cars) await tx.car.upsert({
      where: {id: data.id},
      create: data,
      update: data
    });
    const ids = scenarios.map(s => s.id);
    await tx.rentalInvoice.deleteMany({where: {rentalId: {in: ids}}});
    await tx.rentalReturn.deleteMany({where: {rentalId: {in: ids}}});
    await tx.rental.deleteMany({where: {id: {in: ids}}});
    for (const [i, s] of scenarios.entries()) {
      const start = new Date(Date.UTC(2026, 0, 1) + i * 15 * 86400000);
      const end = new Date(start.getTime() + (s.minutes ?? (s.days ?? 1) * 1440) * 60000);
      await tx.rental.create({
        data: {
          id: s.id,
          carId: s.suv ? (i % 2 ? '10000000-0000-4000-8000-000000000004' : '10000000-0000-4000-8000-000000000003') : (i % 2 ? '10000000-0000-4000-8000-000000000002' : '10000000-0000-4000-8000-000000000001'),
          scheduledStartAt: start,
          scheduledEndAt: end,
          startOdometerKm: 10000 + i * 2000,
          insuranceSelected: s.insurance ?? false,
          status: s.closed ? 'CLOSED' : 'OPEN',
          createdAt: start,
          ...(!s.noReturn ? {
            rentalReturn: {
              create: {
                actualReturnAt: new Date(end.getTime() + (s.late ?? 0) * 60000),
                endOdometerKm: 10000 + i * 2000 + (s.km ?? 100),
                missingFuelLiters: s.fuel ?? 0
              }
            }
          } : {}),
          ...(s.closed ? {
            invoice: {
              create: {
                id: '40000000-0000-4000-8000-000000000001',
                totalAmount: 20000,
                currency: 'KZT',
                createdAt: end,
                breakdown: {
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
                }
              }
            }
          } : {}),
        }
      });
    }
  });
  console.log({
    cars: await prisma.car.count(),
    pricingRules: await prisma.pricingRule.count(),
    rentals: await prisma.rental.count(),
    returns: await prisma.rentalReturn.count(),
    invoices: await prisma.rentalInvoice.count()
  });
} finally {
  await prisma.$disconnect();
}
