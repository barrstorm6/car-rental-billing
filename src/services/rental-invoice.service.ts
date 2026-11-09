import {ApiError} from '@/errors/api-error';
import {CloseResult, InvoiceBreakdown, InvoiceDto} from '@/types/invoice';
import {
  createRentalInvoices,
  getCar,
  getPricingRule,
  getRentalReturns,
  getRentals,
  updateRentalStatus
} from "../../repositories";
import {RentalPricingService} from "@/services/rental-pricing.service";
import {InvoiceBreakdownSchema} from "@/schemas/invoice.schema";



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

    // Получила аренду
    const rental = await getRentals(_rentalId)
    if(!rental) {
      throw new ApiError('RENTAL_NOT_FOUND')
    }

    // Если аренда закрыта
    if (rental.status === 'CLOSED') {
      if (!rental.invoice) {
        throw new ApiError('RENTAL_NOT_FOUND');
      }

      const invoice: InvoiceDto = {
        rentalId: _rentalId,
        invoiceId: rental.invoice.id,
        status: 'FINAL',
        currency: 'KZT',
        createdAt: rental.invoice.createdAt.toISOString(),
        breakdown: InvoiceBreakdownSchema.parse(rental.invoice.breakdown,),
        totalAmount: rental.invoice.totalAmount
      }
      return {
        created: false,
        invoice
      }
    }

    // Проверила наличие возврата
    const rentalReturn = await getRentalReturns(_rentalId)
    if (!rentalReturn) {
      throw new ApiError('RENTAL_NOT_FOUND')
    }

    // Посчитала стоимость
    const car = await getCar(rental.carId)
    if (!car) {
      throw new ApiError('RENTAL_NOT_FOUND')
    }
    const pricingRule = await getPricingRule(car)
    if (!pricingRule) {
      throw new ApiError('PRICING_RULE_NOT_FOUND');
    }
    const input = {
      rental,
      car,
      pricingRule,
      rentalReturn
    }
    const rentalPriceService =  new RentalPricingService()
    const rentalAmount = rentalPriceService.calculate(input)
   const newInvoice = await createRentalInvoices(_rentalId, rentalAmount.breakdown, rentalAmount.totalAmount,'KZT')
    updateRentalStatus(_rentalId, 'CLOSED')

    const invoice: InvoiceDto = {
      rentalId: newInvoice.rentalId,
      invoiceId: newInvoice.id,
      status:'FINAL',
      breakdown:rentalAmount.breakdown,
      totalAmount: newInvoice.totalAmount,
      currency:'KZT',
      createdAt:newInvoice.createdAt.toISOString()
    }
    return {
      created:true,
      invoice
    }
  }
}

