const Vendor = require("../models/vendorModel");

const list = async (req, res, next) => {
  try {
    res.json({ success: true, data: await Vendor.list(req.query.search || "") });
  } catch (e) {
    next(e);
  }
};
const create = async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await Vendor.create(req.body) });
  } catch (e) {
    next(e);
  }
};
const remove = async (req, res, next) => {
  try {
    if (!(await Vendor.findById(req.params.id)))
      return res.status(404).json({ success: false, message: "Vendor not found" });
    await Vendor.remove(req.params.id);
    res.json({ success: true, message: "Vendor deleted successfully" });
  } catch (e) {
    next(e);
  }
};
const update = async (req, res, next) => {
  try {
    if (!(await Vendor.findById(req.params.id)))
      return res.status(404).json({ success: false, message: "Vendor not found" });
    res.json({ success: true, data: await Vendor.update(req.params.id, req.body) });
  } catch (e) {
    next(e);
  }
};

module.exports = { list, create, update, remove };
