const axios = require("axios");
const FormData = require("form-data");
// 🌟 IMPORT MessageMedia dari whatsapp-web.js untuk handle kirim file
const { MessageMedia } = require("whatsapp-web.js");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function WithExcelCapaianNilai(msg, context) {
  const { pesanBersih, nomorPengirim, namaWhatsApp, nomorRaw, client } =
    context;

  const pesanUpper = pesanBersih.toUpperCase().trim();
  const triggerExcelNilai = [
    "EXCEL NILAI",
    "INPUT NILAI",
    "UPLOAD NILAI",
    "INPUT FILE NILAI",
    "FILE NILAI",
  ];
  const triggerGetExcelNilai = [
    "DOWNLOAD NILAI",
    "DOWNLOAD EXCEL NILAI",
    "GET EXCEL NILAI",
    "GET NILAI",
  ];
  const triggerGetCapaianNilai = [
    "DOWNLOAD CAPAIAN",
    "DOWNLOAD PDF CAPAIAN",
    "GET PDF CAPAIAN",
    "GET CAPAIAN",
    "DOWNLOAD PDF CAPAIAN",
    "PRINT CAPAIAN",
    "PRINT PDF CAPAIAN",
    "PRINT CAPAIAN PDF",
    "DOWNLOAD CPMK",
    "DOWNLOAD PDF CPMK",
    "GET PDF CPMK",
    "GET CPMK",
    "DOWNLOAD PDF CPMK",
    "PRINT CPMK",
    "PRINT PDF CPMK",
    "PRINT CPMK PDF",
    "DOWNLOAD CPL",
    "DOWNLOAD PDF CPL",
    "GET PDF CPL",
    "GET CPL",
    "DOWNLOAD PDF CPL",
    "PRINT CPL",
    "PRINT PDF CPL",
    "PRINT CPL PDF",
  ];

  // Cek pemicu input maupun download
  const isExcelNilaiTrigger = triggerExcelNilai.some((trigger) =>
    pesanUpper.startsWith(trigger),
  );
  const isGetExcelTrigger = triggerGetExcelNilai.some((trigger) =>
    pesanUpper.startsWith(trigger),
  );
  const isGetCapaianTrigger = triggerGetCapaianNilai.some((trigger) =>
    pesanUpper.startsWith(trigger),
  );

  const isExcelFile =
    msg.hasMedia &&
    [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ].includes(msg._data?.mimetype || msg.mimetype);

  // 🌟 UPDATE FILTER: Lolos jika pemicu upload, ada file excel, ATAU pemicu download nilai
  if (
    !isExcelNilaiTrigger &&
    !isExcelFile &&
    !isGetExcelTrigger &&
    !isGetCapaianTrigger
  ) {
    return false;
  }

  let namaFileUser = "";
  if (isExcelFile) {
    namaFileUser =
      msg._data?.filename || msg.filename || `excel_${Date.now()}.xlsx`;
  }

  async function safeDownloadMedia(msg, retries = 12) {
    for (let i = 0; i < retries; i++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const media = await msg.downloadMedia();
        if (media) return media;
      } catch (err) {
        console.log(`Percobaan download ke-${i + 1} gagal!`);
      }
    }
    throw new Error("Gagal mengunduh media setelah beberapa percobaan!");
  }

  async function downloadDirectly(msg) {
    if (!msg.deprecatedMms3Url) return null;

    try {
      const response = await axios.get(msg.deprecatedMms3Url, {
        responseType: "arraybuffer",
      });
      return Buffer.from(response.data);
    } catch (e) {
      console.error("Gagal download via URL langsung:", e);
      return null;
    }
  }

  // Pesan loading disesuaikan dengan kondisi request
  const loadingText = isExcelFile
    ? `*⏳ Memproses File Excel*\n\n\`\`\`${namaFileUser}\`\`\`\n\nSedang diproses oleh sistem, mohon tunggu sebentar...`
    : "⏳ *Permintaan sedang diproses, mohon ditunggu...*";
  await client.sendMessage(nomorRaw, loadingText);

  console.log(
    `📩 Memproses payload Excel/Teks dari nomor: ${nomorPengirim}...`,
  );
  const urlLaravel =
    process.env.LARAVEL_URL || "http://127.0.0.1:8000/api/webhook/wa-incoming";
  const form = new FormData();

  form.append("whatsapp_number", nomorPengirim);
  form.append("whatsapp_name", namaWhatsApp);
  form.append("whatsapp_message", pesanBersih);

  if (msg.hasMedia && isExcelFile) {
    let media;
    // console.log(msg);

    try {
      media = await msg.downloadMedia();
      if (!media) {
        throw new Error("Data media kosong!");
      }
    } catch (error) {
      console.error("Gagal download media:", error);
      await msg.reply(
        "Maaf, file gagal diunduh atau sudah tidak tersedia. Silakan kirim ulang!",
      );
      return;
    }

    if (media && media.data) {
      const fileBuffer = Buffer.from(media.data, "base64");
      form.append("excel_file", fileBuffer, {
        filename: media.filename || namaFileUser,
        contentType: media.mimetype,
        knownLength: fileBuffer.length,
      });
    }
  }

  try {
    const responseFromLaravel = await axios.post(urlLaravel, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${process.env.NODEJS_TOKEN}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log(`🚀 Laravel Merespons:`, responseFromLaravel.data);

    if (responseFromLaravel.data.status === true) {
      const data = responseFromLaravel.data;

      const balasanTeks =
        data.head && data.message
          ? `${data.head}\n\n${data.message}`
          : data.message;
      await client.sendMessage(nomorRaw, balasanTeks);

      const getMimeType = (fileName, fileType) => {
        const name = fileName ? fileName.toLowerCase() : "";
        if (name.endsWith(".pdf")) return "application/pdf";
        if (name.endsWith(".xlsx") || name.endsWith(".xls"))
          return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (name.endsWith(".zip")) return "application/zip";
        if (fileType === "pdf") return "application/pdf";
        if (fileType === "excel")
          return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        return "application/octet-stream";
      };

      let filesToSend = [];

      const rawFiles =
        data.files && data.files.original?.files
          ? data.files.original.files
          : Array.isArray(data.files)
            ? data.files
            : [];

      filesToSend = [...rawFiles];

      if (data.file_base64 && data.file_name) {
        filesToSend.push({
          base64: data.file_base64,
          name: data.file_name,
          mime_type: getMimeType(data.file_name, data.file_type),
        });
      }

      if (filesToSend.length > 0) {
        console.log(`📦 Ditemukan ${filesToSend.length} file untuk dikirim!`);

        for (const file of filesToSend) {
          await delay(1500);

          try {
            const mime = file.mime_type || getMimeType(file.name, "");
            const mediaKirim = new MessageMedia(mime, file.base64, file.name);

            await client.sendMessage(nomorRaw, mediaKirim);
            console.log(`✅ Berhasil mengirim: ${file.name}`);
          } catch (err) {
            console.error(`❌ Gagal kirim ${file.name}:`, err);
          }
        }

        if (filesToSend.length > 1) {
          await client.sendMessage(
            nomorRaw,
            `✅ Semua ${filesToSend.length} file telah dikirim.`,
          );
        }
      } else {
        console.log("⚠️ Tidak ada file yang ditemukan untuk dikirim!");
      }
    }
  } catch (error) {
    console.error(
      `❌ Error HTTP Excel dari Laravel:`,
      error.response?.data || error.message,
    );

    await delay(1000);
    const data = error.response?.data;
    const pesanGagal =
      data?.message || "Terjadi kesalahan saat Memproses Data Nilai Mahasiswa!";
    const balasan =
      data?.head && data?.message
        ? `${data.head}\n\n${pesanGagal}`
        : pesanGagal;
    await client.sendMessage(nomorRaw, balasan);
  }

  return true;
}

module.exports = WithExcelCapaianNilai;
