import {ApiError} from '@/errors/api-error';
import {CloseResult, InvoiceDto} from '@/types/invoice';
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

  async getInvoice(_rentalId: string): Promise<InvoiceDto> {
    // 1. Получаем аренду
    const rental = await getRentals(_rentalId);

    if (!rental) {
      throw new ApiError('RENTAL_NOT_FOUND');
    }

    // 2. Если аренда закрыта — возвращаем сохранённый FINAL invoice
    if (rental.status === 'CLOSED') {
      if (!rental.invoice) {
        throw new ApiError('INTERNAL_ERROR');
      }

      return {
        rentalId: rental.invoice.rentalId,
        invoiceId: rental.invoice.id,
        status: 'FINAL',
        currency: 'KZT',
        breakdown: InvoiceBreakdownSchema.parse(rental.invoice.breakdown,),
        totalAmount: rental.invoice.totalAmount,
        createdAt: rental.invoice.createdAt.toISOString(),
      };
    }

    // 3. Получаем автомобиль
    const car = await getCar(rental.carId);

    if (!car) {
      throw new ApiError('INTERNAL_ERROR');
    }

    // 4. Получаем тариф
    const pricingRule = await getPricingRule(car);

    if (!pricingRule) {
      throw new ApiError('PRICING_RULE_NOT_FOUND');
    }

    // 5. Получаем информацию о возврате
    const rentalReturn = await getRentalReturns(_rentalId);

    if (!rentalReturn) {
      throw new ApiError('RETURN_NOT_RECORDED');
    }

    // 6. Рассчитываем стоимость
    const input = {
      rental,
      car,
      pricingRule,
      rentalReturn,
    };

    const rentalPriceService = new RentalPricingService();
    const rentalPrice = rentalPriceService.calculate(input);

    // 7. Возвращаем PREVIEW
    return {
      rentalId: rental.id,
      invoiceId: null,
      status: 'PREVIEW',
      currency: 'KZT',
      breakdown: rentalPrice.breakdown,
      totalAmount: rentalPrice.totalAmount,
      createdAt: null,
    };
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
        throw new ApiError('INTERNAL_ERROR');
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
      throw new ApiError('RETURN_NOT_RECORDED')
    }

    // Посчитала стоимость
    const car = await getCar(rental.carId)
    if (!car) {
      throw new ApiError('INTERNAL_ERROR')
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
    await updateRentalStatus(_rentalId, 'CLOSED')

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

