import { ApiError } from '@/errors/api-error';
import type { PricingInput, PricingResult } from '@/types/invoice';
import type {Car, PricingRule, Rental, RentalReturn} from "@/generated/prisma/client";



//PricingResult { breakdown: InvoiceBreakdown; totalAmount: number }
//export interface InvoiceBreakdown {
//   plannedDays: number; lateMinutes: number; extraDays: number; chargedDays: number;
//   distanceKm: number; includedKm: number; excessKm: number; baseAmount: number;
//   discountAmount: number; lateFee: number; mileageFee: number; fuelFee: number; insuranceFee: number;
// }

export class RentalPricingService {
  calculate(_input: PricingInput): PricingResult {
    // TODO(student): implement README.md rules.
    // Проверить исходные данные и рассчитать полный breakdown и totalAmount по правилам ниже
    const { rental, car, pricingRule, rentalReturn} = _input;

    //Rule 1
    const scheduledEndAt = Math.floor(rental.scheduledEndAt.getTime() / 1000); //секунды
    const scheduledStartAt = Math.floor(rental.scheduledStartAt.getTime() / 1000);

    if(scheduledEndAt<=scheduledStartAt){
      throw new Error('INVALID_RENTAL_PERIOD')
    }

    const plannedDays = Math.ceil((scheduledEndAt - scheduledStartAt) / 24*60*60)  //секунды

    //Rule 2

    const actualReturnAt = Math.floor(rentalReturn.actualReturnAt.getTime() / 1000);
    const graceMinutes = pricingRule.graceMinutes;
    const lateHourlyRate = pricingRule.lateHourlyRate;

    let lateMinutes;
    let lateFee;
    let extraDays = 0;
    let chargedDays;

    if(actualReturnAt < scheduledStartAt){
      throw new Error('INVALID_RETURN_TIME')
    }

    //if(actualReturnAt == scheduledStartAt){}

    if(actualReturnAt<=scheduledEndAt){
      lateMinutes = 0;
    }else {
      lateMinutes = Math.max(0, Math.ceil((actualReturnAt - scheduledEndAt) / 60000))
    }

    if(lateMinutes<=3600){
      lateFee=0;
      extraDays=0;
      chargedDays=0
    }else if (lateMinutes>3600 && lateMinutes>=21600){
      lateFee = Math.ceil((lateMinutes - graceMinutes) / 60) * lateHourlyRate
    }else if(lateMinutes<21600){
      extraDays = Math.ceil(lateMinutes / 1440);
      chargedDays = plannedDays + extraDays;
      lateFee = 0
    }

    //Rule 3
    const dailyRate = pricingRule.dailyRate;

    chargedDays = plannedDays + extraDays
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




    //const plannedDays = ceil((scheduledEndAt - scheduledStartAt) / 24 часа)
    //lateMinutes = max(0, ceil((actualReturnAt - scheduledEndAt) / 60000))
    //lateFee = ceil((lateMinutes - graceMinutes) / 60) * lateHourlyRate
    //extraDays = ceil(lateMinutes / 1440)

    //chargedDays = plannedDays + extraDays
    //baseAmount = chargedDays * dailyRate
    //discountAmount = round(baseAmount * discountPercent / 100)
    //distanceKm = endOdometerKm - startOdometerKm

    //includedKm = chargedDays * includedKmPerDay

    //excessKm = max(0, distanceKm - includedKm)

    //mileageFee = excessKm * excessKmRate
    //fuelFee = missingFuelLiters * missingFuelPricePerLiter
    //insuranceFee = chargedDays * insuranceDailyRate
    //totalAmount = baseAmount - discountAmount + lateFee + mileageFee + fuelFee + insuranceFee


    //PricingInput { rental: Rental; car: Car; pricingRule: PricingRule; rentalReturn: RentalReturn }
    //PricingResult { breakdown: InvoiceBreakdown; totalAmount: number }

    throw new ApiError('NOT_IMPLEMENTED');
  }
}

