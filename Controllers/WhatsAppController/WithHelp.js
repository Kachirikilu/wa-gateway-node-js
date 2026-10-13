const axios = require("axios");
const { MessageMedia } = require("whatsapp-web.js");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function WithHelp(msg, context) {
  const {
    pesanBersih,
    isiPesan,
    nomorPengirim,
    namaWhatsApp,
    nomorRaw,
    client,
  } = context;

  const pesanUpper = pesanBersih.toUpperCase();

  const triggerHelp = (
    process.env.TRIGGER_HELP || "HELP,LIST,TOLONG,INFO,COMMAND,COMMAND LIST"
  )
    .split(",")
    .map((item) => item.trim().toUpperCase());

  const isHelpTrigger = triggerHelp.some((trigger) =>
    pesanUpper.startsWith(trigger),
  );

  if (!isHelpTrigger) {
    return false;
  }

  // --- Susunan Pesan Help Formal berdasarkan Kategori ---
  const helpMessage = `💡 *COMMAND LIST* 💡

Halo _${namaWhatsApp || "User"}_, berikut adalah perintah yang dapat Anda gunakan:

\`\`\`🔐 1. AKUN & OTENTIKASI\`\`\`
- *LOGIN [ID_AKADEMIK]*
Akses masuk ke sistem.
- *DATA DIRI*
Informasi akun Anda.
- *UPDATE TOKEN*
Memperbarui limit token.
- *LOGOUT*
Keluar dari sistem.

\`\`\`📅 2. JADWAL PERKULIAHAN\`\`\`
- *JADWAL*
Melihat jadwal kelas minggu ini.
- *KELAS HARI INI*
Melihat jadwal kelas hari ini.
- *LIST KELAS / DAFTAR KELAS*
Melihat semua daftar kelas Anda.

\`\`\`🎓 3. INFORMASI MAHASISWA\`\`\`
- *NILAI SAYA*
Melihat perolehan nilai mahasiswa.

\`\`\`📝 4. MANAJEMEN NILAI (DOSEN)\`\`\`
- *INPUT NILAI EXCEL*
Akses untuk upload nilai dengan file Excel.
- *DOWNLOAD NILAI [KODE_KELAS]*
Mengunduh berkas nilai format Excel.
- *NILAI [NIM_MAHASISWA]*
Melihat nilai mahasiswa.

\`\`\`🎯 5. MANAJEMEN CAPAIAN (DOSEN)\`\`\`
- *GET CAPAIAN [KODE_KELAS]*
Melihat grafik capaian pada setiap kelas.
- *GET CAPAIAN RPS [KODE_RPS] [KODE_PR?] [ANGKATAN?]*
Melihat grafik capaian pada setiap RPS.

\`\`\`📚 6. RENCANA PEMBELAJARAN SEMESTER (RPS)\`\`\`
- *LIST RPS / DAFTAR RPS*
Melihat daftar semua dokumen RPS.
- *GET RPS [KODE_RPS] [KODE_PR?]*
Mengunduh dokumen PDF RPS formal.

\`\`\`ℹ️ 7. BANTUAN\`\`\`
- *HELP* / *COMMAND*
Menampilkan daftar perintah yang tersedia.

_===========================_

\`\`\`⌨️ Tips:\`\`\`
Ketik salah satu perintah *Bold* di atas untuk memulai. Sistem tidak sensitif terhadap huruf besar/kecil (case-insensitive).`;

  await client.sendMessage(nomorRaw, helpMessage);
  return true; // Kembalikan true karena help berhasil diproses
}

module.exports = WithHelp;
