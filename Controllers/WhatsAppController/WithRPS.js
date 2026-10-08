const axios = require("axios");
const { MessageMedia } = require("whatsapp-web.js"); 
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function WithRPS(msg, context) {
  const {
    pesanBersih,
    isiPesan,
    nomorPengirim,
    namaWhatsApp,
    nomorRaw,
    client,
  } = context;

  const pesanUpper = pesanBersih.toUpperCase();
  
  const triggerRPS = ['LIST RPS', 'SEMUA RPS', 'DAFTAR RPS', 'RPS SAYA', 'RPS'];
  const triggerGetRPS = ['DOWNLOAD RPS', 'DOWNLOAD PDF RPS', 'GET PDF RPS', 'GET RPS', 'DOWNLOAD PDF RPS', 'PRINT RPS', 'PRINT PDF RPS', 'PRINT RPS PDF'];

  const isRPSTrigger = triggerRPS.some((trigger) => pesanUpper.startsWith(trigger));
  const isGetRPSTrigger = triggerGetRPS.some((trigger) => pesanUpper.startsWith(trigger));

  if (!isRPSTrigger && !isGetRPSTrigger) {
    return false;
  }

  await client.sendMessage(nomorRaw, "⏳ Permintaan sedang diproses, mohon ditunggu...");

  console.log(`📩 Memproses RPS untuk nomor: ${nomorPengirim}...`);
  const urlLaravel = process.env.LARAVEL_URL || "http://127.0.0.1:8000/api/webhook/wa-incoming";

  try {
    const responseFromLaravel = await axios.post(
      urlLaravel,
      {
        whatsapp_number: nomorPengirim,
        whatsapp_name: namaWhatsApp,
        whatsapp_message: pesanBersih,
      },
      {
        headers: { Authorization: `Bearer ${process.env.NODEJS_TOKEN}` },
      },
    );

    console.log(`🚀 Laravel Merespons Pencarian RPS:`, responseFromLaravel.data);

    if (responseFromLaravel.data.status === true) {
      await delay(1000);
      const data = responseFromLaravel.data;

      if (data.file_base64 && data.file_name) {
        const media = new MessageMedia("application/pdf", data.file_base64, data.file_name);
        await client.sendMessage(nomorRaw, media, { caption: data.message || "Berikut berkas RPS Anda." });
        console.log(`📄 Dokumen PDF RPS sukses dikirim ke ${nomorPengirim}`);
      } else {
        const balasan = (data.head && data.message) ? `${data.head}\n\n${data.message}` : data.message;
        await client.sendMessage(nomorRaw, balasan);
        console.log(`💬 Balasan teks RPS sukses dikirim ke ${nomorPengirim}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error HTTP RPS dari Laravel:`, error.response?.data || error.message);

    await delay(1000);
    const data = error.response?.data;
    const pesanGagal = data?.message || "Terjadi Kesalahan saat Memuat Data RPS Anda!";
    const balasan = (data?.head && data?.message) ? `${data.head}\n\n${pesanGagal}` : pesanGagal;
    await client.sendMessage(nomorRaw, balasan);
  }

  return true;
}

module.exports = WithRPS;