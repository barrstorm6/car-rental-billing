import {ApiError} from '@/errors/api-error';
import type {CloseResult, InvoiceDto} from '@/types/invoice';

export class RentalInvoiceService {
  async getInvoice(_rentalId: string): Promise<InvoiceDto> {
    // TODO(student): implement the invoice contract.
    throw new ApiError('NOT_IMPLEMENTED');
  }

  async closeRental(_rentalId: string): Promise<CloseResult> {
    // TODO(student): implement the closing contract.
    throw new ApiError('NOT_IMPLEMENTED');
  }
}

