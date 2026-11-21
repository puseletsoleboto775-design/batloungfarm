const Supplier = require("../models/supplierModel");

const list = async (req, res, next) => {
  try {
    res.json({ success: true, data: await Supplier.list() });
  } catch (e) {
    next(e);
  }
};
const get = async (req, res, next) => {
  try {
    const data = await Supplier.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Supplier not found" });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
const create = async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await Supplier.create(req.body) });
  } catch (e) {
    next(e);
  }
};
const update = async (req, res, next) => {
  try {
    if (!(await Supplier.findById(req.params.id)))
      return res.status(404).json({ success: false, message: "Supplier not found" });
    res.json({ success: true, data: await Supplier.update(req.params.id, req.body) });
  } catch (e) {
    next(e);
  }
};
const remove = async (req, res, next) => {
  try {
    if (!(await Supplier.findById(req.params.id)))
      return res.status(404).json({ success: false, message: "Supplier not found" });
    await Supplier.remove(req.params.id);
    res.json({ success: true, message: "Supplier deleted" });
  } catch (e) {
    next(e);
  }
};

module.exports = { list, get, create, update, remove };
