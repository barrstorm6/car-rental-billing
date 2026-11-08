import {ApiError} from '@/errors/api-error';
import type {CloseResult, InvoiceDto,InvoiceBreakdown, PricingInput} from '@/types/invoice';
import {Repository} from "../../repositories";
import {RentalPricingService} from "./rental-pricing.service";
import type {RentalInvoice} from '@/generated/prisma/client';
import {prisma} from '@/lib/prisma';

export class RentalInvoiceService {
  async getInvoice(_rentalId: string): Promise<InvoiceDto> {
    // TODO(student): implement the invoice contract.
    //Загрузить аренду и связанные сущности через Prisma; вернуть PREVIEW для OPEN или сохранённый FINAL для CLOSED
    const repository = new Repository();

    const rental = await repository.getRental(_rentalId);

    if(!rental){
      throw new ApiError('RENTAL_NOT_FOUND');
    }

    if(rental.status === 'CLOSED'){
      const rentalInvoice = await repository.getRentalInvoice(rental.id);

      if(!rentalInvoice){
        throw new ApiError('INTERNAL_ERROR');
      }

      return this.getFinalInvoice(rentalInvoice);
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

    const invoice: InvoiceDto = {rentalId: rental.id, invoiceId: null, status: 'PREVIEW', currency: 'KZT', createdAt: null, breakdown: result.breakdown, totalAmount: result.totalAmount};
    return invoice;
  };

  async closeRental(_rentalId: string): Promise<CloseResult> {
    // TODO(student): implement the closing contract.
    //Закрыть аренду, атомарно сохранить счёт и статус; при повторном вызове вернуть исходный счёт
    const invoice = await this.getInvoice(_rentalId);

    if(invoice.status === 'FINAL'){
      return {
        invoice: invoice,
        created: false
      };
    }else{
      const result = await prisma.$transaction(async (transaction) => {
        const rentalInvoice = await transaction.rentalInvoice.create({
          data: {
            rentalId: invoice.rentalId,
            breakdown: {...invoice.breakdown},
            totalAmount: invoice.totalAmount,
            currency: invoice.currency
          }
        });

        await transaction.rental.update({
          where: {id: invoice.rentalId},
          data: {
            status: 'CLOSED'
          }
        });

        return rentalInvoice;
      });

      return {
        invoice: this.getFinalInvoice(result),
        created: true
      };
    }
  }

  private getFinalInvoice(rentalInvoice: RentalInvoice): InvoiceDto {
    if(rentalInvoice.currency!=='KZT'){
      throw new ApiError('INTERNAL_ERROR');
    }

    const invoice: InvoiceDto = {rentalId: rentalInvoice.rentalId, invoiceId: rentalInvoice.id, status: 'FINAL', currency: rentalInvoice.currency, createdAt: rentalInvoice.createdAt.toISOString(), breakdown: rentalInvoice.breakdown as unknown as InvoiceBreakdown, totalAmount: rentalInvoice.totalAmount};

    return invoice;
  }
}

