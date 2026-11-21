const Transaction = require("../models/transactionModel");
const { isRealDate } = require("../middleware/validate");

const purchase = async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      message: "Purchase recorded and stock increased",
      data: await Transaction.recordPurchase(req.body),
    });
  } catch (e) {
    next(e);
  }
};
const sale = async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      message: "Sale recorded and stock reduced",
      data: await Transaction.recordSale(req.body),
    });
  } catch (e) {
    next(e);
  }
};
const listSales = async (req, res, next) => {
  try {
    res.json({ success: true, data: await Transaction.listSales() });
  } catch (e) {
    next(e);
  }
};
const listPurchases = async (req, res, next) => {
  try {
    res.json({ success: true, data: await Transaction.listPurchases() });
  } catch (e) {
    next(e);
  }
};
const reports = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to)
      return res
        .status(400)
        .json({ success: false, message: "Both from and to dates are required" });
    if (!isRealDate(String(from)) || !isRealDate(String(to)))
      return res
        .status(400)
        .json({ success: false, message: "from and to must be valid dates in YYYY-MM-DD format" });
    if (from > to)
      return res
        .status(400)
        .json({ success: false, message: "The from date cannot be after the to date" });
    res.json({ success: true, range: { from, to }, data: await Transaction.reports(from, to) });
  } catch (e) {
    next(e);
  }
};

module.exports = { purchase, sale, listSales, listPurchases, reports };
