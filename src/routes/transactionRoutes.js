const router = require("express").Router();
const controller = require("../controllers/transactionController");
const { requireAdmin } = require("../middleware/auth");
const {
  requireFields,
  validateItems,
  validatePayment,
  validateDates,
} = require("../middleware/validate");

router.get("/purchases", requireAdmin, controller.listPurchases);
router.post(
  "/purchases",
  requireAdmin,
  requireFields(["supplierId", "items"]),
  validateDates(["purchaseDate"]),
  validateItems,
  controller.purchase,
);
router.get("/sales", controller.listSales);
router.post(
  "/sales",
  requireFields(["vendorId", "items"]),
  validateDates(["saleDate"]),
  validateItems,
  validatePayment,
  controller.sale,
);
router.get("/reports/summary", requireAdmin, controller.reports);
module.exports = router;
