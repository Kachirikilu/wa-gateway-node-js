const axios = require("axios");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function WithVerification(msg, context) {
  const {
    pesanBersih,
    isiPesan,
    nomorPengirim,
    namaWhatsApp,
    nomorRaw,
    client,
  } = context;

  const pesanUpper = pesanBersih.toUpperCase();
  const triggerVerify = [
    "VERIFIKASI",
    "VERIFY",
    "VERYFICATION",
    "IDENTITAS",
    "REGISTRASI",
    "LOGIN",
    "LOG IN",
    "MASUK",
  ];
  const isVerifyTrigger = triggerVerify.some((trigger) =>
    pesanUpper.startsWith(trigger),
  );

  if (!isVerifyTrigger) {
    return false;
  }

  console.log(`📩 Memproses verifikasi untuk nomor asli: ${nomorPengirim}...`);
  const urlLaravel =
    process.env.LARAVEL_URL || "http://127.0.0.1:8000/api/webhook/wa-incoming";

  const responseFromLaravel = await axios.post(
    urlLaravel,
    {
      whatsapp_number: nomorPengirim,
      whatsapp_name: namaWhatsApp,
      whatsapp_message: isiPesan,
    },
    {
      headers: { Authorization: `Bearer ${process.env.NODEJS_TOKEN}` },
    },
  );

  console.log(`🚀 Laravel Merespons:`, responseFromLaravel.data);

  if (responseFromLaravel.data.status === true) {
      await delay(1000);
      const data = responseFromLaravel.data;
      const balasan = (data.head && data.message) ? `${data.head}\n\n${data.message}` : data.message;
      await client.sendMessage(nomorRaw, balasan);

      console.log(`💬 Balasan sukses Verifikasi terkirim ke ${nomorPengirim}`);
  }

  return true;
}

module.exports = WithVerification;
