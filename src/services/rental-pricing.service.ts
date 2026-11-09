import { PricingInput, PricingResult} from '@/types/invoice';
import {ApiError} from "@/errors/api-error";


export class RentalPricingService {
  calculate(_input: PricingInput): PricingResult {
    const{rental, pricingRule, rentalReturn} = _input
    let extraDays = 0
    let discountAmount = 0
    let discountPercent = pricingRule.longRentalDiscountPercent
    let fuelFee = 0
    let insuranceFee = 0


    // Rule 1 — Planned rental days расчет дней
    const scheduledEndAt = rental.scheduledEndAt.getTime();
    const scheduledStartAt = rental.scheduledStartAt.getTime();
    if(scheduledEndAt <= scheduledStartAt){
      throw new ApiError('INVALID_RENTAL_PERIOD');
    }

    const rentalDuration = scheduledEndAt - scheduledStartAt
    if(rentalDuration <= 0){
      throw new ApiError('INVALID_RENTAL_PERIOD');
    }

    const plannedDays = Math.max(
        1,
        Math.ceil(rentalDuration / 86400000)
    );

    // Rule 2 — Late return

    const actualReturnAt = rentalReturn.actualReturnAt.getTime();
    // время возврата раньше или во время начала аренды
    if(actualReturnAt < scheduledStartAt){
      throw new ApiError('INVALID_RETURN_TIME');
    }
    let lateMinutes = Math.max(0, Math.ceil((actualReturnAt - scheduledEndAt) / 60000))
    let lateFee = 0

    if(lateMinutes >= pricingRule.graceMinutes && lateMinutes <= pricingRule.hourlyLateLimitMinutes){
      lateFee = Math.ceil((lateMinutes - pricingRule.graceMinutes) / 60) * pricingRule.lateHourlyRate
    }
    if(lateMinutes > pricingRule.hourlyLateLimitMinutes){
      extraDays = Math.ceil(lateMinutes / 1440)
    }


    //Rule 3 — Charged days

    let chargedDays = plannedDays + extraDays
    let baseAmount = chargedDays * pricingRule.dailyRate

    // Rule 4 — Long rental discount

    if(chargedDays >= pricingRule.longRentalMinDays){
      discountAmount = Math.round(baseAmount * discountPercent / 100)
    }

    // Rule 5 — Mileage

    if(rentalReturn.endOdometerKm < 0 ||
        rental.startOdometerKm < 0 ||
        rentalReturn.endOdometerKm < rental.startOdometerKm
    ){
      throw new ApiError('INVALID_ODOMETER');
    }
    let distanceKm = rentalReturn.endOdometerKm - rental.startOdometerKm
    let includedKm = chargedDays * pricingRule.includedKmPerDay

    let excessKm = Math.max(0, distanceKm - includedKm)
    let mileageFee = excessKm * pricingRule.excessKmRate

    //Rule 6 — Fuel

    if(!Number.isFinite(rentalReturn.missingFuelLiters) ||
        rentalReturn.missingFuelLiters < 0)
    { throw new ApiError('INVALID_FUEL_AMOUNT');}

    fuelFee = rentalReturn.missingFuelLiters * pricingRule.missingFuelPricePerLiter

    //Rule 7 — Insurance
    if(rental.insuranceSelected){
       insuranceFee = chargedDays * pricingRule.insuranceDailyRate

    }

    // Rule 8 — Final amount

    const totalAmount = baseAmount - discountAmount + lateFee + mileageFee + fuelFee + insuranceFee
    if (!Number.isSafeInteger(totalAmount) || totalAmount < 0) {
      throw new ApiError('INTERNAL_ERROR');
    }

    return {
      breakdown: {
        plannedDays,
        lateMinutes,
        extraDays,
        chargedDays,
        distanceKm,
        includedKm,
        excessKm,
        baseAmount,
        discountAmount,
        lateFee,
        mileageFee,
        fuelFee,
        insuranceFee,
      },
      totalAmount,
    };

}
}
