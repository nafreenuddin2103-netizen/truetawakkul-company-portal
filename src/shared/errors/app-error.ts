export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.errorCode,
        message: this.message,
        status: this.statusCode,
        timestamp: new Date().toISOString(),
        details: this.details ?? {}
      }
    };
  }
}

export class BadRequestError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = 'BAD_REQUEST';
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly errorCode = 'UNAUTHORIZED';
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly errorCode = 'FORBIDDEN';
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly errorCode = 'CONFLICT';
}

export class PreconditionFailedError extends AppError {
  readonly statusCode = 412;
  readonly errorCode = 'VERSION_MISMATCH';
}

export class ValidationError extends AppError {
  readonly statusCode = 422;
  readonly errorCode = 'VALIDATION_FAILED';
}

export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = 'INTERNAL_SERVER_ERROR';
}
