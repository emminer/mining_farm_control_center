class ApiError extends Error {
  constructor(httpStatuscode, message) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message || 'The requested resource couldn\'t be found';
    this.status = httpStatuscode;
  }

  static NotFound(resource) {
    return new ApiError(404, `${resource} is not found.`);
  }
}

module.exports = ApiError;
