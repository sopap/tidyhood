export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, code)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 409, code)
    this.name = 'ConflictError'
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    }
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      statusCode: 500,
    }
  }

  return {
    error: 'An unexpected error occurred',
    statusCode: 500,
  }
}
