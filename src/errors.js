export class BridgeError extends Error {
  constructor(code, status = 502, httpStatus = null) {
    super(code);
    this.code = code;
    this.status = status;
    this.httpStatus = httpStatus;
  }
}
export function diagnostic(error) {
  return error instanceof BridgeError
    ? { error: error.code, httpStatus: error.httpStatus }
    : { error: 'INTERNAL_ERROR', httpStatus: null };
}
