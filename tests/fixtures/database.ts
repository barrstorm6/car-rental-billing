import type {Prisma, PrismaClient} from '../../src/generated/prisma/client';
import {assertTestDatabase} from '../../scripts/safety.mjs';

export const rules = [
  {
    id: '60000000-0000-4000-8000-000000000001',
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
    id: '60000000-0000-4000-8000-000000000002',
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

export async function resetDatabase(db: PrismaClient) {
  assertTestDatabase(process.env.DATABASE_URL);
  await db.$transaction(async tx => {
    await tx.rentalInvoice.deleteMany();
    await tx.rentalReturn.deleteMany();
    await tx.rental.deleteMany();
    await tx.car.deleteMany();
    await tx.pricingRule.deleteMany();
    await tx.pricingRule.createMany({data: rules});
    await tx.car.createMany({
      data: [
        {
          id: '50000000-0000-4000-8000-000000000001',
          brand: 'Toyota',
          model: 'Corolla',
          carClass: 'ECONOMY',
          plateNumber: 'TEST-001'
        },
        {id: '50000000-0000-4000-8000-000000000002', brand: 'Toyota', model: 'RAV4', carClass: 'SUV', plateNumber: 'TEST-002'},
      ]
    });
  });
}

export interface Scenario {
  id?: string;
  days?: number;
  durationMinutes?: number;
  lateMinutes?: number;
  lateMilliseconds?: number;
  distanceKm?: number;
  fuel?: number;
  insurance?: boolean;
  suv?: boolean;
  noReturn?: boolean;
}

export async function scenario(db: PrismaClient, options: Scenario = {}) {
  const id = options.id ?? '70000000-0000-4000-8000-000000000001';
  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date(start.getTime() + (options.durationMinutes ?? (options.days ?? 1) * 1440) * 60000);
  await db.rental.create({
    data: {
      id,
      carId: options.suv ? '50000000-0000-4000-8000-000000000002' : '50000000-0000-4000-8000-000000000001',
      scheduledStartAt: start,
      scheduledEndAt: end,
      startOdometerKm: 10000,
      insuranceSelected: options.insurance ?? false,
      ...(!options.noReturn ? {
        rentalReturn: {
          create: {
            actualReturnAt: new Date(end.getTime() + (options.lateMinutes ?? 0) * 60000 + (options.lateMilliseconds ?? 0)),
            endOdometerKm: 10000 + (options.distanceKm ?? 100),
            missingFuelLiters: options.fuel ?? 0
          }
        }
      } : {}),
    }
  });
  return id;
}
