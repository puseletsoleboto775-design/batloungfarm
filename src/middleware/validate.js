const PACKAGING_SIZES = ["SMALL", "MEDIUM", "LARGE"];
const PAYMENT_STATUSES = ["PAID", "PARTIALLY_PAID", "UNPAID"];
const PAYMENT_METHODS = ["CASH", "MOBILE_MONEY", "CREDIT"];
const FRUIT_STATUSES = ["ACTIVE", "INACTIVE"];
// Must match the ENUM on suppliers.province in database/schema.sql
const PROVINCES = [
  "Gauteng",
  "Free State",
  "KwaZulu-Natal",
  "Western Cape",
  "Eastern Cape",
  "Limpopo",
  "Mpumalanga",
  "North West",
];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isBlank = (value) =>
  value === undefined || value === null || (typeof value === "string" && value.trim() === "");

const isRealDate = (value) => {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const bad = (res, message) => res.status(400).json({ success: false, message });

function requireFields(fields) {
  return (req, res, next) => {
    const body = req.body || {};
    const missing = fields.filter((field) => isBlank(body[field]));
    if (missing.length) return bad(res, `Missing required fields: ${missing.join(", ")}`);
    next();
  };
}

function validateItems(req, res, next) {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return bad(res, "At least one fruit item is required");
  }

  for (const [index, item] of items.entries()) {
    const label = `Item ${index + 1}`;
    if (!item || typeof item !== "object") return bad(res, `${label} is not a valid object`);

    const size = String(item.packagingSize || "").toUpperCase();
    const fruitId = Number(item.fruitId);
    const quantity = Number(item.quantity);
    const price = Number(item.unitPrice ?? item.unitCost);

    if (!Number.isInteger(fruitId) || fruitId < 1) return bad(res, `${label} has an invalid fruitId`);
    if (!PACKAGING_SIZES.includes(size)) {
      return bad(res, `${label} packagingSize must be SMALL, MEDIUM or LARGE`);
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return bad(res, `${label} quantity must be a positive whole number`);
    }
    if (!Number.isFinite(price) || price <= 0) {
      return bad(res, `${label} requires a positive unit price or cost`);
    }

    // Normalise so both models can rely on clean numbers, and so a purchase may send
    // unitPrice (or a sale unitCost) without producing NaN totals.
    item.fruitId = fruitId;
    item.quantity = quantity;
    item.packagingSize = size;
    item.unitPrice = price;
    item.unitCost = price;
  }
  next();
}

function validatePayment(req, res, next) {
  const status = String(req.body.paymentStatus || "UNPAID").toUpperCase();
  const method = String(req.body.paymentMethod || "CREDIT").toUpperCase();
  if (!PAYMENT_STATUSES.includes(status) || !PAYMENT_METHODS.includes(method)) {
    return bad(res, "Invalid payment status or payment method");
  }
  const { amountPaid } = req.body;
  if (!isBlank(amountPaid) && (!Number.isFinite(Number(amountPaid)) || Number(amountPaid) < 0)) {
    return bad(res, "amountPaid must be a number that is zero or more");
  }
  req.body.paymentStatus = status;
  req.body.paymentMethod = method;
  next();
}

function validateDates(fields) {
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.body[field];
      if (!isBlank(value) && !isRealDate(String(value))) {
        return bad(res, `${field} must be a valid date in YYYY-MM-DD format`);
      }
    }
    next();
  };
}

function validateSupplier(req, res, next) {
  if (!PROVINCES.includes(req.body.province)) {
    return bad(res, `province must be one of: ${PROVINCES.join(", ")}`);
  }
  next();
}

function validateFruit(req, res, next) {
  const { status } = req.body;
  if (!isBlank(status)) {
    const upper = String(status).toUpperCase();
    if (!FRUIT_STATUSES.includes(upper)) return bad(res, "status must be ACTIVE or INACTIVE");
    req.body.status = upper;
  }
  next();
}

module.exports = {
  PROVINCES,
  isRealDate,
  requireFields,
  validateItems,
  validatePayment,
  validateDates,
  validateSupplier,
  validateFruit,
};
