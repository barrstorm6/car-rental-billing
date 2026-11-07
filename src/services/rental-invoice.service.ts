import {ApiError} from '@/errors/api-error';
import type {CloseResult, InvoiceDto, PricingInput} from '@/types/invoice';
import {Repository} from "../../repositories";
import {RentalPricingService} from "./rental-pricing.service";

export class RentalInvoiceService {
  async getInvoice(_rentalId: string): Promise<InvoiceDto> {
    // TODO(student): implement the invoice contract.
    //Загрузить аренду и связанные сущности через Prisma; вернуть PREVIEW для OPEN или сохранённый FINAL для CLOSED
    const repository = new Repository();

    const car = repository.getCar(_rentalId);
    const rental = repository.getRental(_rentalId);
    const princingRule = repository.getPricingRule(_rentalId);
    const rentalReturn = repository.getRentalReturn(_rentalId);

    const rentalPricingService = new RentalPricingService();
    const input : PricingInput= { rental: rental, car: car, pricingRule: princingRule, rentalReturn: rentalReturn }
    rentalPricingService.calculate(input);



    throw new ApiError('NOT_IMPLEMENTED');
  }

  async closeRental(_rentalId: string): Promise<CloseResult> {
    // TODO(student): implement the closing contract.
    //Закрыть аренду, атомарно сохранить счёт и статус; при повторном вызове вернуть исходный счёт

    throw new ApiError('NOT_IMPLEMENTED');
  }
}

