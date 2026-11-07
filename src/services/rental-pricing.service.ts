import { ApiError } from '@/errors/api-error';
import type { PricingInput, PricingResult } from '@/types/invoice';
import type {Car, PricingRule, Rental, RentalReturn} from "@/generated/prisma/client";


export class RentalPricingService {
  calculate(_input: PricingInput): PricingResult {
    // rental, car, pricingRule, rentalReturn
    // TODO(student): implement README.md rules.

    const{rental, car, pricingRule, rentalReturn} = _input
    // Rule 1 — Planned rental days расчет дней
    const scheduledEndAt = Math.floor(rental.scheduledEndAt.getTime() / 1000);
    const scheduledStartAt = Math.floor(rental.scheduledStartAt.getTime() / 1000);
    let extraDays = 0
    let discountAmount = 0
    let discountPercent = pricingRule.longRentalDiscountPercent

    if(scheduledEndAt < scheduledStartAt){
      throw new Error('INVALID_RENTAL_PERIOD');
    }
    let plannedDays = Math.ceil((scheduledEndAt - scheduledStartAt) / 24 )
    if(plannedDays > 0){
      throw new Error('INVALID_RENTAL_PERIOD');
    }
    if (!Number.isInteger(plannedDays)){
      plannedDays + 1
    }


    // Rule 2 — Late return

    const actualReturnAt = Math.floor(rentalReturn.actualReturnAt.getTime() / 1000);
    if(actualReturnAt < scheduledStartAt){
      throw new Error('INVALID_RETURN_TIME');
    }
    let lateMinutes = Math.max(0, Math.ceil((actualReturnAt - scheduledEndAt) / 60000))
    let lateFee = Math.ceil((lateMinutes - pricingRule.graceMinutes) / 60) * pricingRule.lateHourlyRate

    if(scheduledEndAt < actualReturnAt){
      lateMinutes = 0
    }
    if(actualReturnAt === scheduledStartAt){
      lateMinutes = 0
    }

    if(lateMinutes <= 60){
      lateFee = 0
    }
    if(lateMinutes >= 61 && lateMinutes <= 360){
      lateFee += (lateMinutes / 60)
    }

    if(lateMinutes > 360){
      extraDays = Math.ceil(lateMinutes / 1440)
      plannedDays += extraDays
      lateFee = 0
    }

    //Rule 3 — Charged days

    let chargedDays = plannedDays + extraDays
    let baseAmount = chargedDays * pricingRule.dailyRate

    // Rule 4 — Long rental discount

    if(chargedDays >= pricingRule.longRentalMinDays){
      discountAmount = Math.round(baseAmount * discountPercent / 100)


    }






















    throw new ApiError('NOT_IMPLEMENTED');
  }
}

