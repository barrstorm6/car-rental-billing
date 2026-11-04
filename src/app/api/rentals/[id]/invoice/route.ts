import { errorResponse } from '@/errors/api-error';
import { RentalInvoiceService } from '@/services/rental-invoice.service';
import type { RentalRouteContext } from '@/types/invoice';
export const runtime = 'nodejs';
const rentalInvoiceService = new RentalInvoiceService();

export async function GET(_request: Request, context: RentalRouteContext) {
  try {
    const { id } = await context.params;
    const invoice = await rentalInvoiceService.getInvoice(id);
    return Response.json(invoice);
  } catch (error) {
    return errorResponse(error);
  }
}
