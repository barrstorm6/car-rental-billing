import {z} from "zod";

export const InvoiceBreakdownSchema = z.object({
    plannedDays: z.number(),
    lateMinutes: z.number(),
    extraDays: z.number(),
    chargedDays: z.number(),
    distanceKm: z.number(),
    includedKm: z.number(),
    excessKm: z.number(),
    baseAmount: z.number(),
    discountAmount: z.number(),
    lateFee: z.number(),
    mileageFee: z.number(),
    fuelFee: z.number(),
    insuranceFee: z.number(),
})