export const errorContract = {
  RENTAL_NOT_FOUND: [404, 'Rental not found'],
  RETURN_NOT_RECORDED: [409, 'Return not recorded'],
  PRICING_RULE_NOT_FOUND: [409, 'Pricing rule not found'],
  INVALID_RENTAL_PERIOD: [422, 'Invalid rental period'],
  INVALID_RETURN_TIME: [422, 'Invalid return time'],
  INVALID_ODOMETER: [422, 'Invalid odometer'],
  INVALID_FUEL_AMOUNT: [422, 'Invalid fuel amount'],
  NOT_IMPLEMENTED: [501, 'Not implemented'],
  INTERNAL_ERROR: [500, 'Internal server error'],
} as const;
export type ErrorCode = keyof typeof errorContract;
export class ApiError extends Error {
  constructor(public readonly code: ErrorCode) { super(errorContract[code][1]); }
}
export function errorResponse(error: unknown): Response {
  const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
  const [status, message] = errorContract[code];
  return Response.json({ error: { code, message } }, { status });
}
