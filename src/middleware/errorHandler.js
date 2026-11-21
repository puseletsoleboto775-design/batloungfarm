function notFound(req, res) {
  res
    .status(404)
    .json({ success: false, message: `Route ${req.method} ${req.originalUrl} was not found` });
}

// MySQL errors that mean "the database cannot be reached / is not set up", not "the code is broken".
const DATABASE_DOWN = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "PROTOCOL_CONNECTION_LOST",
  "ER_ACCESS_DENIED_ERROR",
  "ER_BAD_DB_ERROR",
  "ER_NO_SUCH_TABLE",
]);

// MySQL errors caused by bad input that slipped past validation.
const BAD_INPUT = new Set([
  "ER_NO_REFERENCED_ROW_2",
  "ER_CHECK_CONSTRAINT_VIOLATED",
  "ER_DATA_TOO_LONG",
  "ER_BAD_NULL_ERROR",
  "WARN_DATA_TRUNCATED",
  "ER_TRUNCATED_WRONG_VALUE",
  "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD",
  "ER_WARN_DATA_OUT_OF_RANGE",
  "ER_DATA_OUT_OF_RANGE",
]);

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  console.error(error);

  if (error.code === "ER_DUP_ENTRY") {
    return res
      .status(409)
      .json({ success: false, message: "A record with that unique value already exists" });
  }
  if (error.code === "ER_ROW_IS_REFERENCED_2") {
    return res
      .status(409)
      .json({ success: false, message: "This record cannot be deleted because it is in use" });
  }
  if (BAD_INPUT.has(error.code)) {
    return res
      .status(400)
      .json({ success: false, message: "One of the submitted values is not valid" });
  }
  if (DATABASE_DOWN.has(error.code)) {
    return res.status(503).json({
      success: false,
      message: "The database is unavailable. Check that MySQL is running and schema.sql was loaded.",
    });
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : "An unexpected server error occurred",
  });
}

module.exports = { notFound, errorHandler };
