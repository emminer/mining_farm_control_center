class PoolError extends Error {
  constructor(message, statusCode, error) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    this.status = statusCode;
    this.networkError = statusCode ? false : true;
    this.error = error;
  }

  static NetworkError(message) {
    return new PoolError(message);
  }
}

module.exports = PoolError;
