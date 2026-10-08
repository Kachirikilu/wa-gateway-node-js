require('dotenv').config(); 
const express = require('express');
const fs = require('fs');
const path = require('path');

const lockPath = path.join(__dirname, 'wa_session', 'session', 'SingletonLock');
try {
    if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
        console.log('🧹 Menghapus sisa kunci SingletonLock...');
    }
} catch (error) {}

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const wa_router = require("./routes/whatsapp");
app.use("/", wa_router);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});