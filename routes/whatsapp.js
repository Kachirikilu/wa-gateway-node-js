const express = require("express");
const router = express.Router();
const WhatsAppController = require("../Controllers/WhatsAppController");

router.post("/wa-api", WhatsAppController.api);

module.exports = router;