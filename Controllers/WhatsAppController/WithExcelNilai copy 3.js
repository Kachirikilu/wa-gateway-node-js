const axios = require("axios");
const FormData = require("form-data");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function WithExcelCapaianNilai(msg, context) {
  const {
    pesanBersih,
    nomorPengirim,
    namaWhatsApp,
    nomorRaw,
    client,
  } = context;

  const pesanUpper = pesanBersih.toUpperCase().trim();
  const triggerExcelNilai = ['EXCEL NILAI', 'INPUT NILAI', 'UPLOAD NILAI', 'INPUT FILE NILAI', 'FILE NILAI'];
  const isExcelNilaiTrigger = triggerExcelNilai.some((trigger) =>
    pesanUpper.startsWith(trigger)
  );

  const isExcelFile = msg.hasMedia && [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ].includes(msg._data?.mimetype || msg.mimetype);

  if (!isExcelNilaiTrigger && !isExcelFile) {
    return false;
  }

  let namaFileUser = "";
  if (isExcelFile) {
    namaFileUser = msg._data?.filename || msg.filename || `excel_${Date.now()}.xlsx`;
  }

  const loadingText = isExcelFile 
    ? `*⏳ Memproses File Excel*\n\n\`\`\`${namaFileUser}\`\`\`\n\nSedang diproses oleh sistem, mohon tunggu sebentar...` 
    : "⏳ *Permintaan sedang diproses, mohon tunggu...*";
  await client.sendMessage(nomorRaw, loadingText);

  console.log(`📩 Memproses payload Excel/Teks dari nomor: ${nomorPengirim}...`);
  const urlLaravel = process.env.LARAVEL_URL || "http://127.0.0.1:8000/api/webhook/wa-incoming";
  const form = new FormData();

  form.append('whatsapp_number', nomorPengirim);
  form.append('whatsapp_name', namaWhatsApp);
  form.append('whatsapp_message', pesanBersih);

  if (msg.hasMedia && isExcelFile) {
    const media = await msg.downloadMedia();
    if (media && media.data) {
      const fileBuffer = Buffer.from(media.data, 'base64');
      form.append('excel_file', fileBuffer, {
        filename: media.filename || namaFileUser, 
        contentType: media.mimetype,
        knownLength: fileBuffer.length
      });
    }
  }

  try {
    const responseFromLaravel = await axios.post(urlLaravel, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${process.env.NODEJS_TOKEN}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log(`🚀 Laravel Merespons Proses Excel:`, responseFromLaravel.data);

    if (responseFromLaravel.data.status === true) {
      await delay(1000);
      const data = responseFromLaravel.data;
      const balasan = (data.head && data.message) ? `${data.head}\n\n${data.message}` : data.message;
      await client.sendMessage(nomorRaw, balasan);
      
      console.log(`💬 Balasan proses excel sukses dikirim ke ${nomorPengirim}`);
    }
  } catch (error) {
    console.error(`❌ Error HTTP Excel dari Laravel:`, error.response?.data || error.message);
    
    await delay(1000);
    const data = error.response?.data;
    const pesanGagal = data?.message || "Terjadi kesalahan saat Memproses Data Nilai Mahasiswa!";
    const balasan = (data?.head && data?.message) ? `${data.head}\n\n${pesanGagal}` : pesanGagal;
    await client.sendMessage(nomorRaw, balasan);
  }

  return true;
}

module.exports = WithExcelCapaianNilai;