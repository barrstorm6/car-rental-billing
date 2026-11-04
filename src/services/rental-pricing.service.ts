import { ApiError } from '@/errors/api-error';
import type { PricingInput, PricingResult } from '@/types/invoice';
export class RentalPricingService {
  calculate(_input: PricingInput): PricingResult {
    // TODO(student): implement README.md rules.
    throw new ApiError('NOT_IMPLEMENTED');
  }
}

