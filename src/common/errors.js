/**
 * This file defines application errors
 */
const util = require('util')
const HttpStatus = require('http-status-codes')

/**
 * Helper function to create generic error object with http status code
 * @param {String} name the error name
 * @param {Number} statusCode the http status code
 * @returns {Function} the error constructor
 * @private
 */
function createError (name, statusCode) {
  /**
   * The error constructor
   * @param {String} message the error message
   * @param {String} [cause] the error cause
   * @constructor
   */
  function ErrorCtor (message, cause) {
    Error.call(this)
    Error.captureStackTrace(this)
    this.message = message || name
    this.cause = cause
    this.httpStatus = statusCode
  }

  util.inherits(ErrorCtor, Error)
  ErrorCtor.prototype.name = name
  return ErrorCtor
}

module.exports = {
  BadRequestError: createError('BadRequestError', HttpStatus.StatusCodes.BAD_REQUEST),
  UnauthorizedError: createError('UnauthorizedError', HttpStatus.StatusCodes.UNAUTHORIZED),
  ForbiddenError: createError('ForbiddenError', HttpStatus.StatusCodes.FORBIDDEN),
  NotFoundError: createError('NotFoundError', HttpStatus.StatusCodes.NOT_FOUND),
  InternalServerError: createError('InternalServerError', HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR),
  ServiceUnavailableError: createError('ServiceUnavailableError', HttpStatus.StatusCodes.SERVICE_UNAVAILABLE)
}
