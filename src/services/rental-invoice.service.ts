import {ApiError} from '@/errors/api-error';
import type {CloseResult, InvoiceBreakdown, InvoiceDto, PricingInput} from '@/types/invoice';
import {Repository} from "../../repositories";
import {RentalPricingService} from "./rental-pricing.service";
import type {RentalInvoice} from '@/generated/prisma/client';
import {prisma} from '@/lib/prisma';

export class RentalInvoiceService {
  async getInvoice(_rentalId: string): Promise<InvoiceDto> {
    const repository = new Repository();

    const rental = await repository.getRental(_rentalId);
    if(!rental){
      throw new ApiError('RENTAL_NOT_FOUND' );
    }

    if(rental.status === 'CLOSED'){
      const rentalInvoice = await repository.getRentalInvoice(rental.id);
      if(!rentalInvoice){
        throw new ApiError('INTERNAL_ERROR');
      }
      return this.getFinalInvoice(rentalInvoice); //to get that invoice in right form
    }

    const car = await repository.getCar(rental.carId);
    if(!car){
      throw new ApiError('INTERNAL_ERROR');
    }

    const pricingRule = await repository.getPricingRule(car.carClass);
    if(!pricingRule){
      throw new ApiError('PRICING_RULE_NOT_FOUND');
    }

    const rentalReturn = await repository.getRentalReturn(rental.id);
    if(!rentalReturn){
      throw new ApiError('RETURN_NOT_RECORDED');
    }

    const input: PricingInput = { rental: rental, car: car, pricingRule: pricingRule, rentalReturn: rentalReturn};

    const rentalPricingService = new RentalPricingService();
    const result = rentalPricingService.calculate(input);

    return {
      rentalId: rental.id,
      invoiceId: null,
      status: 'PREVIEW',
      currency: 'KZT',
      createdAt: null,
      breakdown: result.breakdown,
      totalAmount: result.totalAmount
    };
  };

  async closeRental(_rentalId: string): Promise<CloseResult> {
    const invoice = await this.getInvoice(_rentalId);

    if(invoice.status === 'FINAL'){
      return {
        invoice: invoice,
        created: false
      };
    }else{
      const result = await prisma.$transaction(async (trx) => {
        const rentalInvoice = await trx.rentalInvoice.create({
            data : {
              rentalId  : _rentalId,
              breakdown : {...invoice.breakdown},
              totalAmount: invoice.totalAmount,
              currency : 'KZT'
        }})
        await trx.rental.update({
          where : {id: _rentalId},
          data : {status : 'CLOSED'}
        })
        return rentalInvoice;
      })

      return { invoice: this.getFinalInvoice(result), created: true}
    }
  }

  private getFinalInvoice(rentalInvoice: RentalInvoice): InvoiceDto {
    if(rentalInvoice.currency!=='KZT'){
      throw new ApiError('INTERNAL_ERROR');
    }
    return{
      rentalId: rentalInvoice.rentalId,
      invoiceId: rentalInvoice.id,
      status: 'FINAL',
      currency: rentalInvoice.currency,
      createdAt: rentalInvoice.createdAt.toISOString(),
      breakdown: rentalInvoice.breakdown as unknown as InvoiceBreakdown,
      totalAmount: rentalInvoice.totalAmount
    }
  }
}

