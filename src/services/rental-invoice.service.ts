import {ApiError} from '@/errors/api-error';
import {CloseResult, InvoiceBreakdown, InvoiceDto, PricingResult} from '@/types/invoice';
import {getCar, getPricingRule, getRentalReturns, getRentals} from "../../repositories";
import {RentalPricingService} from "@/services/rental-pricing.service";
import type { Car, PricingRule, Rental, RentalReturn } from '../generated/prisma/client';



export class RentalInvoiceService {

  async  getInvoice(_rentalId: string): Promise<InvoiceDto> {
    const response = {} as InvoiceDto;

    // Получила аренду
    const rental = await getRentals(_rentalId)
    if (!rental) {
      throw new ApiError('RENTAL_NOT_FOUND')
    }
    response.rentalId = rental.id;


    // Получила айди чека
    const invoiceId = rental.invoice?.id ?? null
    response.invoiceId = invoiceId;
    //Получила статус
    const rentalStatus = rental.status
    let status: 'PREVIEW' | 'FINAL' = 'PREVIEW';
    if(rentalStatus === 'CLOSED') {
      status = 'FINAL'
    }
    response.status = status;
    // Получила дату создания
    const createdAt = rental.createdAt.toISOString()
    response.createdAt = createdAt;

    // Получаем цену
    const car = await getCar(rental.carId)
    if (!car) {
      throw new ApiError('RENTAL_NOT_FOUND')
    }

    const pricingRule = await getPricingRule(car)
    if (!pricingRule) {
      throw new ApiError('PRICING_RULE_NOT_FOUND');
    }
    const rentalReturn = await getRentalReturns(_rentalId)
    if (!rentalReturn) {
      throw new ApiError('RENTAL_NOT_FOUND');
    }
    const rentalPriceService =  new RentalPricingService()
    const input = {
      rental,
      car,
      pricingRule,
      rentalReturn
    }
    const rentalPrice = await rentalPriceService.calculate(input)
    response.breakdown = rentalPrice.breakdown;
    response.totalAmount = rentalPrice.totalAmount;

    return response


  }

  async closeRental(_rentalId: string): Promise<CloseResult> {
    // TODO(student): implement the closing contract.
    throw new ApiError('NOT_IMPLEMENTED');
  }
}

