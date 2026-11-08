import { ApiError } from '@/errors/api-error';
import {InvoiceBreakdown, PricingInput, PricingResult} from '@/types/invoice';


export class RentalPricingService {
  calculate(_input: PricingInput): PricingResult {
    const{rental, car, pricingRule, rentalReturn} = _input
    let extraDays = 0
    let discountAmount = 0
    let discountPercent = pricingRule.longRentalDiscountPercent
    let fuelFee = 0
    let insuranceFee = 0


    // Rule 1 — Planned rental days расчет дней
    const scheduledEndAt = Math.floor(rental.scheduledEndAt.getTime() / 1000);
    const scheduledStartAt = Math.floor(rental.scheduledStartAt.getTime() / 1000);


    if(scheduledEndAt <= scheduledStartAt){
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

    const actualReturnAt = rentalReturn.actualReturnAt.getTime();
    if(actualReturnAt < scheduledStartAt){
      throw new Error('INVALID_RETURN_TIME');
    }
    let lateMinutes = Math.max(0, Math.ceil((actualReturnAt - scheduledEndAt) / 60000))
    let lateFee = 0

    if(lateMinutes >= 61 && lateMinutes <= 360){
      lateFee = Math.ceil((lateMinutes - pricingRule.graceMinutes) / 60) * pricingRule.lateHourlyRate
    }
    if(lateMinutes > 360){
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
      throw new Error('INVALID_ODOMETER');
    }
    let distanceKm = rentalReturn.endOdometerKm - rental.startOdometerKm
    let includedKm = chargedDays * pricingRule.includedKmPerDay

    let excessKm = Math.max(0, distanceKm - includedKm)
    let mileageFee = excessKm * pricingRule.excessKmRate

    //Rule 6 — Fuel

    if(rentalReturn.missingFuelLiters < 0){ throw new Error('INVALID_LITERS');}

    fuelFee = rentalReturn.missingFuelLiters * pricingRule.missingFuelPricePerLiter

    //Rule 7 — Insurance
    if(rental.insuranceSelected){
       insuranceFee = chargedDays * pricingRule.insuranceDailyRate

    }

    // Rule 8 — Final amount

    const totalAmount = baseAmount - discountAmount + lateFee + mileageFee + fuelFee + insuranceFee
    if (!Number.isSafeInteger(totalAmount) || totalAmount < 0) {
      throw new Error('INVALID_TOTAL_AMOUNT');
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
