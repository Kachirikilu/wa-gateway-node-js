const axios = require("axios");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function WithDataDiri(msg, context) {
  const {
    pesanBersih,
    isiPesan,
    nomorPengirim,
    namaWhatsApp,
    nomorRaw,
    client,
  } = context;

  const pesanUpper = pesanBersih.toUpperCase();
  const triggerToken = [
    "DATA DIRI",
    "MY SELF",
    "DATA",
    "AUTH",
    "AKUN",
    "USER",
    "TOKEN",
    "CHECK TOKEN",
    "CEK TOKEN",
    "INFORMASI TOKEN",
    "LIMTI",
    "CHECK LIMIT",
    "LIMIT",
  ];
  const triggerResetToken = [
    "ISI TOKEN",
    "PERBARUI TOKEN",
    "TOKEN BARU",
    "RESET TOKEN",
    "TAMBAH TOKEN",
    "PERBARUI LIMIT",
    "UPDATE TOKEN",
    "TOKEN UPDATE",
  ];

  const isDataDiriTrigger = triggerToken.includes(pesanUpper);
  const isResetTokenTrigger = triggerResetToken.includes(pesanUpper);

  if (!isDataDiriTrigger && !isResetTokenTrigger) {
    return false;
  }

  let tipeAksi = isResetTokenTrigger ? "Isi Ulang" : "Pengecekan";
  console.log(
    `📊 Memproses ${tipeAksi} token untuk nomor asli: ${nomorPengirim}...`,
  );
  const urlLaravel =
    process.env.LARAVEL_URL || "http://127.0.0.1:8000/api/webhook/wa-incoming";

  try {
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

    console.log(
      `🚀 Laravel Merespons [${tipeAksi}]:`,
      responseFromLaravel.data,
    );

    if (responseFromLaravel.data.status === true) {
      await delay(1000);
      const data = responseFromLaravel.data;
      const balasan = (data.head && data.message) ? `${data.head}\n\n${data.message}` : data.message;
      await client.sendMessage(nomorRaw, balasan);

      console.log(
        `💬 Balasan [${tipeAksi}] sukses dikirim ke ${nomorPengirim}!`,
      );
    }
  } catch (error) {
    console.error(
      `❌ Error HTTP dari Laravel:`,
      error.response?.data || error.message,
    );
    await delay(1000);
    const data = error.response?.data;
    const pesanGagal = data.message || "Terjadi Kesalahan saat Mengambil Data Diri Anda!";
    const balasan = (data.head && data.message) ? `${data.head}\n\n${pesanGagal}` : pesanGagal;
    await client.sendMessage(nomorRaw, balasan);
  }

  return true;
}

module.exports = WithDataDiri;
