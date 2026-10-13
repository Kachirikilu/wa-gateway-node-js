const axios = require("axios");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function WithDeactivation(msg, context) {
  const {
    pesanBersih,
    isiPesan,
    nomorPengirim,
    namaWhatsApp,
    nomorRaw,
    client,
  } = context;

  const pesanUpper = pesanBersih.toUpperCase();
  const triggerDeactivate = (
    process.env.TRIGGER_DEACTIVATE ||
    "NONAKTIFKAN,MATIKAN,DIAM,SILENT,LOGOUT,KELUAR,LOG OUT,MUTE,MIC MATI"
  )
    .split(",")
    .map((item) => item.trim().toUpperCase());
  const isDeactivateTrigger = triggerDeactivate.includes(pesanUpper);

  if (!isDeactivateTrigger) {
    return false;
  }

  console.log(
    `📴 Memproses penonaktifan bot untuk nomor asli: ${nomorPengirim}...`,
  );
  const urlLaravel =
    process.env.LARAVEL_URL || "http://127.0.0.1:8000/api/webhook/wa-incoming";

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

    console.log(
      `🚀 Laravel Merespons [Penonaktifan]:`,
      responseFromLaravel.data,
    );

    // if (responseFromLaravel.data.status === true) {
    //   const teksBalasan =
    //     `📴 *${responseFromLaravel.data.message}*\n\n` +
    //     `👤 Akun: *${namaWhatsApp}*\n` +
    //     `📱 Nomor: ${nomorPengirim}`;

    //   await delay(1000);
    //   await client.sendMessage(nomorRaw, teksBalasan);
    // }
    if (responseFromLaravel.data.status === true) {
      await delay(1000);
      const data = responseFromLaravel.data;
      const balasan =
        data.head && data.message
          ? `${data.head}\n\n${data.message}`
          : data.message;
      await client.sendMessage(nomorRaw, balasan);

      console.log(
        `💬 Balasan [Penonaktifan] sukses dikirim ke ${nomorPengirim}`,
      );
    }
  } catch (error) {
    console.error(
      `❌ Error HTTP dari Laravel:`,
      error.response?.data || error.message,
    );

    await delay(1000);
    const data = error.response?.data;
    const pesanGagal =
      data.message || "Terjadi Kesalahan Sistem saat Memproses Penonaktifan!";
    const balasan =
      data.head && data.message ? `${data.head}\n\n${pesanGagal}` : pesanGagal;
    await client.sendMessage(nomorRaw, balasan);
  }

  return true; // Berhasil ditangani
}

module.exports = WithDeactivation;
