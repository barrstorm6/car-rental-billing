import { ApiError } from '@/errors/api-error';
import type {InvoiceBreakdown, PricingInput, PricingResult} from '@/types/invoice';


export class RentalPricingService {
  calculate(_input: PricingInput): PricingResult {
    // TODO(student): implement README.md rules.
    const { rental, car, pricingRule, rentalReturn} = _input;

    const scheduledEndAt = rental.scheduledEndAt.getTime() / 1000;
    const scheduledStartAt =rental.scheduledStartAt.getTime() / 1000;
    const actualReturnAt = rentalReturn.actualReturnAt.getTime() / 1000; //seconds

    const graceMinutes = pricingRule.graceMinutes;
    const lateHourlyRate = pricingRule.lateHourlyRate;
    const dailyRate = pricingRule.dailyRate;
    const longRentalMinDays = pricingRule.longRentalMinDays;
    const longRentalDiscountPercent = pricingRule.longRentalDiscountPercent;

    const endOdometerKm = rentalReturn.endOdometerKm;
    const startOdometerKm = rental.startOdometerKm;
    const includedKmPerDay = pricingRule.includedKmPerDay;
    const excessKmRate = pricingRule.excessKmRate;

    const missingFuelLiters = rentalReturn.missingFuelLiters;
    const missingFuelPricePerLiter = pricingRule.missingFuelPricePerLiter;
    const insuranceSelected = rental.insuranceSelected;
    const insuranceDailyRate = pricingRule.insuranceDailyRate;
    const hourlyLateLimitMinutes = pricingRule.hourlyLateLimitMinutes;

    if(scheduledEndAt<=scheduledStartAt){
      throw new ApiError('INVALID_RENTAL_PERIOD')
    }

    if(actualReturnAt < scheduledStartAt){
      throw new ApiError('INVALID_RETURN_TIME')
    }

    if(endOdometerKm<0 || startOdometerKm<0 || endOdometerKm < startOdometerKm ){
      throw new ApiError('INVALID_ODOMETER')
    }

    if(missingFuelLiters < 0){
      throw new ApiError('INVALID_FUEL_AMOUNT')
    }



    //Rule 1
    const plannedDays = Math.ceil((scheduledEndAt/3600 - scheduledStartAt/3600) / 24 )  //sutki

    //Rule 2 — Late return

    let lateMinutes = Math.max(0, Math.ceil((actualReturnAt - scheduledEndAt) /60)) //minutes
    let lateFee = 0;
    let extraDays = 0;

    if(lateMinutes <= graceMinutes){
      lateFee = 0;
    }else if(lateMinutes > graceMinutes && lateMinutes <= hourlyLateLimitMinutes){
      lateFee = Math.ceil((lateMinutes - graceMinutes)/60) *  lateHourlyRate; //hours
    }else if(lateMinutes > hourlyLateLimitMinutes){
      extraDays = Math.ceil(lateMinutes / 1440) //sutki
    }

    //Rule 3 — Charged days
    const chargedDays = plannedDays + extraDays
    const baseAmount = chargedDays * dailyRate

    // Rule 4 — Long rental discount

    let discountAmount = 0;
    if(chargedDays >= longRentalMinDays){
      discountAmount = Math.round(baseAmount * longRentalDiscountPercent/ 100);
    }

    // Rule 5 — Mileage
    // Ровно допустимый пробег не приводит к доплате.
    const distanceKm = endOdometerKm - startOdometerKm;
    const includedKm = chargedDays * includedKmPerDay;
    const excessKm = Math.max(0, distanceKm - includedKm);
    const mileageFee = excessKm * excessKmRate;

    //Rule 6 - Fuel
    const fuelFee =  missingFuelLiters * missingFuelPricePerLiter;

    //Rule 7 — Insurance
    let insuranceFee=0;

    if(insuranceSelected){
      insuranceFee = chargedDays * insuranceDailyRate
    }

    //Rule 8 - totalAmount
    const totalAmount = Math.ceil(baseAmount - discountAmount + lateFee + mileageFee + fuelFee + insuranceFee);

    //PricingResult { breakdown: InvoiceBreakdown; totalAmount: number }
    const breakdown : InvoiceBreakdown = {
      plannedDays: plannedDays, lateMinutes: lateMinutes, extraDays: extraDays, chargedDays: chargedDays,
      distanceKm: distanceKm, includedKm: includedKm, excessKm: excessKm, baseAmount: baseAmount,
      discountAmount: discountAmount, lateFee: lateFee, mileageFee: mileageFee, fuelFee: fuelFee, insuranceFee: insuranceFee
    }

    return { breakdown:breakdown, totalAmount : totalAmount}
  }
}

