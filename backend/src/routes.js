const { Router } = require("express");
const controller = require("./controller");
const router = Router();

router.get("/courses", controller.getCourses);
router.get("/sets", controller.getSets);
router.get("/sets/:id", controller.getSetById);
router.get("/ranking-by-set/:id", controller.getRankingBySetId);
router.get("/ranking", controller.getRanking);
router.post("/add-set", controller.addSet);
router.post("/game-end", controller.gameEnd);

module.exports = router;
