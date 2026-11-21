const Fruit = require("../models/fruitModel");

const list = async (req, res, next) => {
  try {
    res.json({ success: true, data: await Fruit.list() });
  } catch (e) {
    next(e);
  }
};
const create = async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await Fruit.create(req.body) });
  } catch (e) {
    next(e);
  }
};
const update = async (req, res, next) => {
  try {
    if (!(await Fruit.findById(req.params.id)))
      return res.status(404).json({ success: false, message: "Fruit not found" });
    res.json({ success: true, data: await Fruit.update(req.params.id, req.body) });
  } catch (e) {
    next(e);
  }
};
const stock = async (req, res, next) => {
  try {
    res.json({ success: true, data: await Fruit.stock() });
  } catch (e) {
    next(e);
  }
};
const lowStock = async (req, res, next) => {
  try {
    const threshold = Number(req.query.threshold || process.env.LOW_STOCK_THRESHOLD || 10);
    if (!Number.isFinite(threshold) || threshold < 0)
      return res
        .status(400)
        .json({ success: false, message: "threshold must be a number that is zero or more" });
    res.json({ success: true, threshold, data: await Fruit.lowStock(threshold) });
  } catch (e) {
    next(e);
  }
};

module.exports = { list, create, update, stock, lowStock };
