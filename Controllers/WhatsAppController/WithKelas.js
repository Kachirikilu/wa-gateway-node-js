const axios = require("axios");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function WithKelas(msg, context) {
  const {
    pesanBersih,
    isiPesan,
    nomorPengirim,
    namaWhatsApp,
    nomorRaw,
    client,
  } = context;

  const pesanUpper = pesanBersih.toUpperCase();
  
  const triggerKelas = ['LIST KELAS', 'SEMUA KELAS', 'DAFTAR KELAS', 'KELAS HARI INI',  'KELAS MINGGU INI', 'KELAS HARI',  'KELAS MINGGU',  'CHECK KELAS',  'KELAS SAYA',  'KELAS', 'JADWAL KELAS', 'JADWAL', 'KELAS JADWAL'];
  const isKelasTrigger = triggerKelas.some((trigger) =>
    pesanUpper.startsWith(trigger)
  );

  if (!isKelasTrigger) {
    return false;
  }

  console.log(`📩 Memproses pencarian kelas untuk nomor: ${nomorPengirim}...`);
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

    console.log(`🚀 Laravel Merespons Pencarian Kelas:`, responseFromLaravel.data);

    if (responseFromLaravel.data.status === true) {
      await delay(1000);
      const data = responseFromLaravel.data;
      const balasan = (data.head && data.message) ? `${data.head}\n\n${data.message}` : data.message;
      await client.sendMessage(nomorRaw, balasan);
      
      console.log(`💬 Balasan daftar kelas sukses dikirim ke ${nomorPengirim}`);
    }
  } catch (error) {
    console.error(`❌ Error HTTP Kelas dari Laravel:`, error.response?.data || error.message);

    await delay(1000);
    const data = error.response?.data;
    const pesanGagal = data.message || "Terjadi Kesalahan saat Memuat Data Kelas Anda!";
    const balasan = (data.head && data.message) ? `${data.head}\n\n${pesanGagal}` : pesanGagal;
    await client.sendMessage(nomorRaw, balasan);
  }

  return true;
}

module.exports = WithKelas;