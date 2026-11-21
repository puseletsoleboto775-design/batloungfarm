const router = require("express").Router();
const controller = require("../controllers/supplierController");
const { requireFields, validateSupplier } = require("../middleware/validate");
const required = [
  requireFields(["businessName", "contactPerson", "phone", "province", "address"]),
  validateSupplier,
];

router.route("/").get(controller.list).post(required, controller.create);
router.route("/:id").get(controller.get).put(required, controller.update).delete(controller.remove);
module.exports = router;
