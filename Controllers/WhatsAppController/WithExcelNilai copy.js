const axios = require("axios");
const FormData = require("form-data");

async function WithExcelCapaianNilai(msg, context) {
  const { nomorPengirim, nomorRaw, client } = context;

  const pesanRaw = msg.body || msg.caption || "";
  const pesanUpper = pesanRaw.toUpperCase().trim();

  const triggerExcelNilai = ['EXCEL NILAI', 'INPUT NILAI', 'UPLOAD NILAI'];
  const isExcelNilaiTrigger = triggerExcelNilai.some((trigger) =>
    pesanUpper.startsWith(trigger)
  );

  // -------------------------------------------------------------------------
  // KONDISI 1: Hanya Teks Pemicu Saja (Tanpa Media)
  // -------------------------------------------------------------------------
  if (isExcelNilaiTrigger && !msg.hasMedia) {
    console.log(`💬 Menemukan teks pemicu dari ${nomorPengirim}, meneruskan pesan ke Laravel...`);
    
    const form = new FormData();
    form.append('whatsapp_number', nomorPengirim);
    form.append('whatsapp_message', pesanRaw);

    const urlLaravel = process.env.LARAVEL_URL || "http://127.0.0.1:8000/api/webhook/wa-incoming";

    try {
      const responseFromLaravel = await axios.post(urlLaravel, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${process.env.NODEJS_TOKEN}`
        }
      });

      if (responseFromLaravel.data.status === true) {
        await client.sendMessage(nomorRaw, responseFromLaravel.data.message || "✅ Akses unggah berkas dibuka! Silakan kirim file Excel Anda dalam rentang waktu 10 menit!");
      } else {
        await client.sendMessage(nomorRaw, `⚠️ ${responseFromLaravel.data.message}`);
      }
    } catch (error) {
      console.error("❌ Gagal meneruskan teks pemicu ke Laravel:", error.response?.data || error.message);
      const pesanGagal = error.response?.data?.message || "Terjadi kesalahan saat mengaktifkan sesi input nilai.";
      await client.sendMessage(nomorRaw, `⚠️ ${pesanGagal}`);
    }
    
    return true; // Selesai diproses sebagai perintah teks pemicu
  }

  // -------------------------------------------------------------------------
  // KONDISI 2: Menerima Berkas Media (Bisa File Saja atau File + Teks)
  // -------------------------------------------------------------------------
  if (msg.hasMedia) {
    console.log(`⏳ Mengunduh file masuk dari ${nomorPengirim}...`);
    const media = await msg.downloadMedia();
    if (!media || !media.data) return false;

    const excelMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    // Jika yang dikirim media tapi bukan tipe excel, biarkan handler lain yang urus
    if (!excelMimeTypes.includes(media.mimetype)) {
      return false;
    }

    console.log(`📊 Menemukan berkas Excel dari ${nomorPengirim}, langsung meneruskan ke Laravel untuk validasi sesi...`);

    const fileBuffer = Buffer.from(media.data, 'base64');
    const form = new FormData();
    form.append('whatsapp_number', nomorPengirim);
    form.append('whatsapp_name', namaWhatsApp);
    form.append('whatsapp_message', pesanRaw);
    form.append('excel_file', fileBuffer, {
      filename: media.filename || `excel_${Date.now()}.xlsx`,
      contentType: media.mimetype,
      knownLength: fileBuffer.length
    });

    const urlLaravel = process.env.LARAVEL_URL || "http://127.0.0.1:8000/api/webhook/wa-incoming";

    try {
      const responseFromLaravel = await axios.post(urlLaravel, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${process.env.NODEJS_TOKEN}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      if (responseFromLaravel.data.status === true) {
        await client.sendMessage(nomorRaw, responseFromLaravel.data.message || "✅ File Excel berhasil diproses oleh sistem.");
      } else {
        await client.sendMessage(nomorRaw, `⚠️ ${responseFromLaravel.data.message || "Gagal memproses berkas Excel."}`);
      }
    } catch (error) {
      console.error("❌ Gagal mengirim file Excel ke Laravel:", error.response?.data || error.message);
      const pesanGagal = error.response?.data?.message || "Terjadi kesalahan saat sistem Laravel memproses file Excel Anda.";
      await client.sendMessage(nomorRaw, `⚠️ ${pesanGagal}`);
    }

    return true; // Selesai diproses sebagai berkas excel
  }

  // Jika tidak memenuhi kondisi teks pemicu maupun dokumen excel, lewati ke handler selanjutnya
  return false;
}

module.exports = WithExcelCapaianNilai;