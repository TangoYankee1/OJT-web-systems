class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    Object.assign(this, { status, code, fields });
  }
}
function fail(status, code, message, fields) {
  throw new AppError(status, code, message, fields);
}
function assert(condition, status, code, message, fields) {
  if (!condition) fail(status, code, message, fields);
}
module.exports = { AppError, fail, assert };
