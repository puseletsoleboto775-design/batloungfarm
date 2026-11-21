const router = require("express").Router();
const controller = require("../controllers/fruitController");
const { requireFields, validateFruit } = require("../middleware/validate");
const { requireAdmin } = require("../middleware/auth");

router.get("/stock", controller.stock);
router.get("/low-stock", controller.lowStock);
router
  .route("/")
  .get(controller.list)
  .post(requireAdmin, requireFields(["fruitName"]), validateFruit, controller.create);
router.put("/:id", requireAdmin, requireFields(["fruitName"]), validateFruit, controller.update);
module.exports = router;
