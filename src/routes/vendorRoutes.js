const router = require("express").Router();
const controller = require("../controllers/vendorController");
const { requireFields, validateDates } = require("../middleware/validate");
const { requireAdmin } = require("../middleware/auth");
const required = requireFields(["vendorName", "phoneNumber", "location"]);

router.route("/").get(controller.list).post(requireAdmin, required, validateDates(["registrationDate"]), controller.create);
router.put("/:id", requireAdmin, required, controller.update);
router.delete("/:id", requireAdmin, controller.remove);
module.exports = router;
