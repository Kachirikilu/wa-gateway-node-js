const { Client, LocalAuth } = require("whatsapp-web.js");
const SECRET_TOKEN = process.env.NODEJS_TOKEN;
const axios = require("axios");

// const client = new Client({
//   authStrategy: new LocalAuth({
//     dataPath: "./wa_session",
//   }),
//   puppeteer: {
//     headless: false,
//     executablePath:
//       "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
//     args: [
//       "--user-data-dir=./chrome-user-data",
//       "--no-sandbox",
//       "--disable-setuid-sandbox",
//       "--disable-dev-shm-usage",
//       "--disable-extensions",
//       "--disable-accelerated-2d-canvas",
//       "--no-first-run",
//       "--no-zygote",
//       // "--single-process",
//       "--disable-gpu",
//     ],
//   },
//   puppeteerConfig: {
//       waitUntil: 'networkidle0',
//   }
// });

// const client = new Client({
//   authStrategy: new LocalAuth({
//     dataPath: "./wa_session",
//   }),
//   puppeteer: {
//     handleSIGINT: false,
//     // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
//     args: [
//       "--no-sandbox",
//       "--disable-setuid-sandbox",
//       "--disable-dev-shm-usage",
//       '--disable-accelerated-2d-canvas',
//       "--disable-gpu",
//       '--no-first-run',
//       "--disable-single-process",
//       "--no-zygote",
//     ],
//   },
// });

// const client = new Client({
//     authStrategy: new LocalAuth(),
//     puppeteer: {
//         headless: true,
//         args: ['--no-sandbox']
//     }
// });

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // Arahkan langsung ke binary Chrome bawaan sistem
        executablePath: '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// Ubah this.id._serialized menjadi this.id.$1
// node_modules/whatsapp-web.js/src/structures/Message.js

const WithVerification = require("./WhatsAppController/WithVerification");
const WithDataDiri = require("./WhatsAppController/WithDataDiri");
const WithDeactivation = require("./WhatsAppController/WithDeactivation");
const WithKelas = require("./WhatsAppController/WithKelas");
const WithNilaiMahasiswa = require("./WhatsAppController/WithNilaiMahasiswa");
const WithCapaianNilai = require("./WhatsAppController/WithCapaianNilai");
const WithRPS = require("./WhatsAppController/WithRPS");
const WithHelp = require("./WhatsAppController/WithHelp");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

client.once("ready", () => {
  console.log("=========================================");
  console.log("WhatsApp Gateway Node.js SIAP DIGUNAKAN!");
  console.log("=========================================");
});

client.on("qr", (qr) => {
  const qrcode = require("qrcode-terminal");
  console.log("SILAHKAN SCAN QR CODE INI:");
  qrcode.generate(qr, { small: true });
});

client.initialize();

const api = async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || authHeader !== SECRET_TOKEN) {
    return res.status(401).json({ status: false, message: "Unauthorized!" });
  }
  const whatsapp_number = req.body.whatsapp_number;
  const whatsapp_message = req.body.whatsapp_message;
  if (!whatsapp_number || !whatsapp_message) {
    return res
      .status(400)
      .json({ status: false, message: "Parameter kurang!" });
  }
  try {
    let formattedNumber = whatsapp_number;
    if (!formattedNumber.endsWith("@c.us")) {
      formattedNumber = `${formattedNumber}@c.us`;
    }
    await delay(1500);
    await client.sendMessage(formattedNumber, whatsapp_message);

    return res.json({
      status: true,
      message: "Pesan sukses terkirim!",
      target: whatsapp_number,
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

const isMeConfig = process.env.IS_ME || 0;

client.on("message_create", async (msg) => {
  if (msg.fromMe && isMeConfig == 0) {
    return;
  }
  const isiPesan = msg.body;

  try {
    const kontak = await msg.getContact();

    if (msg.from.includes("@g.us") || msg.from.includes("@broadcast")) {
      return;
    }

    const nomorRaw = msg.fromMe ? msg.to : msg.from;
    const nomorPengirim = kontak.id.user;
    const namaWhatsApp = kontak.pushname || kontak.name || "Mahasiswa";
    const pesanBersih = isiPesan ? isiPesan.trim().toUpperCase() : "";

    if (isiPesan) {
      const penanda = msg.fromMe ? "➡️ [Anda Mengirim]" : "⬅️ [Pesan Masuk]";
      console.log(
        `${penanda} Dari/Ke: ${nomorPengirim} (${namaWhatsApp}) | Isi: "${isiPesan}"`,
      );
    }

    const context = {
      isiPesan,
      pesanBersih,
      nomorPengirim,
      namaWhatsApp,
      nomorRaw,
      client,
    };

    let handled = false;

    handled = await WithKelas(msg, context);
    if (!handled) {
      handled = await WithVerification(msg, context);
    }
    if (!handled) {
      handled = await WithDataDiri(msg, context);
    }
    if (!handled) {
      handled = await WithDeactivation(msg, context);
    }
    if (!handled) {
      handled = await WithNilaiMahasiswa(msg, context);
    }
    if (!handled) {
      handled = await WithCapaianNilai(msg, context);
    }
    if (!handled) {
      handled = await WithRPS(msg, context);
    }
    if (!handled) {
      handled = await WithHelp(msg, context);
    }
  } catch (error) {
    await delay(1000);
    const nomorRawFallback = msg.fromMe ? msg.to : msg.from;

    if (error.response && error.response.data) {
      errors = error.response;
      console.error(
        `❌ Laravel Menolak Data (Status ${errors.status})\n\n`,
        errors.data,
      );

      const data = errors.data;
      const pesanGagal = data.message || "Terjadi Kesalahan pada Server!";
      const balasan =
        data.head && data.message
          ? `${data.head}\n\n${pesanGagal}`
          : pesanGagal;
      await client.sendMessage(nomorRawFallback, balasan);
    } else {
      console.error(`❌ Terjadi kesalahan pada sistem Gateway:`, error.message);
      console.error(error);

      const pesanBalasan = `*❌ Sistem Gateway Mengalami Kendala Teknis*\n\nDetail:\n${error || "Unknown Error"}`;
      await client.sendMessage(nomorRawFallback, pesanBalasan);
    }
  }
});
module.exports = { api };
