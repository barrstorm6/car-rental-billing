import { ApiError } from '@/errors/api-error';
import type {InvoiceBreakdown, PricingInput, PricingResult} from '@/types/invoice';


export class RentalPricingService {
  calculate(_input: PricingInput): PricingResult {
    // TODO(student): implement README.md rules.
    const { rental, car, pricingRule, rentalReturn} = _input;

    //Rule 1
    const scheduledEndAt = Math.floor(rental.scheduledEndAt.getTime() / 1000); //секунды
    const scheduledStartAt = Math.floor(rental.scheduledStartAt.getTime() / 1000);

    if(scheduledEndAt<=scheduledStartAt){
      throw new Error('INVALID_RENTAL_PERIOD')
    }

    const plannedDays = Math.ceil((scheduledEndAt - scheduledStartAt) / 24*60*60*1000)  //секунды

    //Rule 2

    const actualReturnAt = Math.floor(rentalReturn.actualReturnAt.getTime() / 1000);
    const graceMinutes = pricingRule.graceMinutes;
    const lateHourlyRate = pricingRule.lateHourlyRate;

    let lateMinutes;
    let lateFee=0;
    let extraDays = 0;


    if(actualReturnAt<=scheduledEndAt){
      lateMinutes = 0;
    }else {
      lateMinutes = Math.max(0, Math.ceil((actualReturnAt - scheduledEndAt) / 60000))
    }

    if(actualReturnAt < scheduledStartAt){
      throw new Error('INVALID_RETURN_TIME')
    }

    //if(actualReturnAt == scheduledStartAt){}

    const hourlyLateLimitMinutes = pricingRule.hourlyLateLimitMinutes;

    if(lateMinutes<=graceMinutes){
      lateFee=0;
      extraDays=0;0
    }else if (lateMinutes<=hourlyLateLimitMinutes){
      lateFee = Math.ceil((lateMinutes - graceMinutes) / 60) * lateHourlyRate
    }else {
      extraDays = Math.ceil(lateMinutes / 1440);
      lateFee = 0
    }


    //Rule 3
    const dailyRate = pricingRule.dailyRate;
    const chargedDays = plannedDays + extraDays
    let baseAmount = chargedDays * dailyRate

    //Rule 4
    const longRentalMinDays = pricingRule.longRentalMinDays;
    const discountPercent = pricingRule.longRentalDiscountPercent;
    let discountAmount = 0;

    if(chargedDays>=longRentalMinDays){
      discountAmount = Math.round(baseAmount * discountPercent / 100);
    }

    //Rule 5
    const endOdometerKm = rentalReturn.endOdometerKm;
    const startOdometerKm = rental.startOdometerKm;
    const includedKmPerDay = pricingRule.includedKmPerDay;
    const excessKmRate = pricingRule.excessKmRate;

    const distanceKm = endOdometerKm - startOdometerKm;
    const includedKm = chargedDays * includedKmPerDay;
    const excessKm = Math.max(0, distanceKm - includedKm);
    const mileageFee = excessKm * excessKmRate;

    if(!(includedKm>=0 && excessKm>=0 && mileageFee>=distanceKm)){
      throw new Error('INVALID_ODOMETER')
    }

    //Rule 6
    const missingFuelLiters = rentalReturn.missingFuelLiters;
    const missingFuelPricePerLiter = pricingRule.missingFuelPricePerLiter;
    let fuelFee;

    if(missingFuelLiters===0){
      fuelFee=0;
    }else if(missingFuelLiters>0){
      fuelFee = missingFuelLiters * missingFuelPricePerLiter;
    }else{
      throw new Error('INVALID_LITR')
    }

    //Rule 7
    const insuranceSelected = rental.insuranceSelected;
    const insuranceDailyRate = pricingRule.insuranceDailyRate;
    let insuranceFee=0;

    if(insuranceSelected===true){
      insuranceFee = chargedDays * insuranceDailyRate
    }else{
      insuranceFee=0;
    }

    //Rule 8
    const totalAmount = baseAmount - discountAmount + lateFee + mileageFee + fuelFee + insuranceFee;
    if(!(totalAmount>0 && Number.isInteger(totalAmount))){
      throw new Error('INVALID_TOTAL_AMOUNT')
    }

    //PricingResult { breakdown: InvoiceBreakdown; totalAmount: number }
    const breakdown : InvoiceBreakdown = {
      plannedDays: plannedDays, lateMinutes: lateMinutes, extraDays: extraDays, chargedDays: chargedDays,
      distanceKm: distanceKm, includedKm: includedKm, excessKm: excessKm, baseAmount: baseAmount,
      discountAmount: discountAmount, lateFee: lateFee, mileageFee: mileageFee, fuelFee: fuelFee, insuranceFee: insuranceFee
    }

    const result : PricingResult = {
      breakdown:breakdown,
      totalAmount : totalAmount
    }

    return result;
  }
}

