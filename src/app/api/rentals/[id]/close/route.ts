import { errorResponse } from '@/errors/api-error';
import { RentalInvoiceService } from '@/services/rental-invoice.service';
import type { RentalRouteContext } from '@/types/invoice';
export const runtime = 'nodejs';
const rentalInvoiceService = new RentalInvoiceService();

export async function POST(_request: Request, context: RentalRouteContext) {
  try {
    const { id } = await context.params;
    const { invoice, created } = await rentalInvoiceService.closeRental(id);
    return Response.json(invoice, { status: created ? 201 : 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
