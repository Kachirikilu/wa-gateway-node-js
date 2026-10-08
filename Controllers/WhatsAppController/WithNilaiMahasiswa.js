const axios = require("axios");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function WithNilaiMahasiswa(msg, context) {
  const {
    pesanBersih,
    isiPesan,
    nomorPengirim,
    namaWhatsApp,
    nomorRaw,
    client,
  } = context;

  const pesanUpper = pesanBersih.toUpperCase();
  
  const triggerNilaiMahasiswa = ['NILAI', 'NILAI SAYA', 'LIHAT NILAI', 'NILAI SEMESTER'];
  const isNilaiMahasiswaTrigger = triggerNilaiMahasiswa.some((trigger) =>
    pesanUpper.startsWith(trigger)
  );

  if (!isNilaiMahasiswaTrigger) {
    return false;
  }

  console.log(`📩 Memproses pencarian NilaiMahasiswa untuk nomor: ${nomorPengirim}...`);
  const urlLaravel = process.env.LARAVEL_URL || "http://127.0.0.1:8000/api/webhook/wa-incoming";

  try {
    const responseFromLaravel = await axios.post(
      urlLaravel,
      {
        whatsapp_number: nomorPengirim,
        whatsapp_message: isiPesan,
        whatsapp_name: namaWhatsApp,
      },
      {
        headers: { Authorization: `Bearer ${process.env.NODEJS_TOKEN}` },
      },
    );

    console.log(`🚀 Laravel Merespons Pencarian Nilai Mahasiswa:`, responseFromLaravel.data);

    if (responseFromLaravel.data.status === true) {
      await delay(1000);
      const data = responseFromLaravel.data;
      const balasan = (data.head && data.message) ? `${data.head}\n\n${data.message}` : data.message;
      await client.sendMessage(nomorRaw, balasan);
      
      console.log(`💬 Balasan daftar Nilai Mahasiswa sukses dikirim ke ${nomorPengirim}`);
    }
  } catch (error) {
    console.error(`❌ Error HTTP NilaiMahasiswa dari Laravel:`, error.response?.data || error.message);
    
    await delay(1000);
    const data = error.response?.data;
    const pesanGagal = data.message || "Terjadi Kesalahan saat Memuat Data Nilai Mahasiswa!";
    const balasan = (data.head && data.message) ? `${data.head}\n\n${pesanGagal}` : pesanGagal;
    await client.sendMessage(nomorRaw, balasan);
  }

  return true;
}

module.exports = WithNilaiMahasiswa;