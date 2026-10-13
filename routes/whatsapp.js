const express = require("express");
const router = express.Router();
const WhatsAppController = require("../Controllers/WhatsAppController");

router.post("/wa-api", WhatsAppController.api);

router.post('/logout', async (req, res) => {
    try {
        await client.logout();
        return res.json({ status: true, message: 'Sesi WhatsApp berhasil dihapus dan dilogout.' });
    } catch (error) {
        return res.status(500).json({ status: false, message: 'Gagal menghapus sesi: ' + error.message });
    }
});

module.exports = router;