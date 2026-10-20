const { ZodError } = require('zod');
function errorHandler(e, req, res, next) {
  if (res.headersSent) return next(e);
  let status = e.status || 500,
    code = e.code || 'INTERNAL_ERROR',
    message = e.message,
    fields = e.fields;
  if (e instanceof ZodError) {
    status = 422;
    code = 'VALIDATION_ERROR';
    message = 'Please correct the supplied fields';
    fields = Object.fromEntries(e.issues.map((i) => [i.path.join('.') || 'body', i.message]));
  } else if (e.code === 'ER_DUP_ENTRY') {
    status = 409;
    code = 'DUPLICATE_RECORD';
    message = 'A record with this unique value already exists';
  } else if (
    e.errno === 4025 ||
    [
      'ER_NO_REFERENCED_ROW_2',
      'ER_ROW_IS_REFERENCED_2',
      'ER_CHECK_CONSTRAINT_VIOLATED',
      'ER_CONSTRAINT_FAILED',
    ].includes(e.code)
  ) {
    status = 422;
    code = 'CONSTRAINT_VIOLATION';
    message = 'The record violates a reference or business constraint';
  } else if (e.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    code = 'UPLOAD_TOO_LARGE';
    message = 'File exceeds the upload limit';
  }
  if (e.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'The request body must contain valid JSON';
  } else if (e.code?.startsWith('LIMIT_') && e.code !== 'LIMIT_FILE_SIZE') {
    status = 422;
    code = 'INVALID_MULTIPART';
    message = 'Upload exactly one file in the file field';
  }
  if (status >= 500) {
    console.error(
      JSON.stringify({ requestId: req.id, event: 'request.failed', code: e.code || e.name }),
    );
    code = 'INTERNAL_ERROR';
    message = 'The request could not be completed';
  }
  res
    .status(status)
    .json({ error: { code, message, ...(fields ? { fields } : {}) }, requestId: req.id });
}
module.exports = { errorHandler };
