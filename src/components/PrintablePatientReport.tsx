import { Printer, X, CheckCircle2, XCircle, Stethoscope, FileText } from "lucide-react";
import { CHECKLIST_ALL, type Patient } from "../data/patientData";
import { protect } from "../utils/mask";

interface PrintablePatientReportProps {
  patient: Patient;
  onClose: () => void;
  canViewPII: boolean;
}

function formatLOS(days: number) {
  return days === 0 ? "-" : `${days} hari`;
}

export default function PrintablePatientReport({
  patient,
  onClose,
  canViewPII,
}: PrintablePatientReportProps) {
  return (
    <div className="min-h-screen bg-slate-200 text-black font-sans pb-16 flex flex-col items-center select-text">
      {/* ── FLOAT TOPBAR (NO-PRINT) ── */}
      <div className="no-print sticky top-0 z-50 w-full bg-slate-900 border-b border-slate-800 text-white shadow-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Printer size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight">Mode Cetak Formal RSUD Timika</h2>
            <p className="text-slate-400 text-xs">Siapkan kertas ukuran A4 / Portrait</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/40"
          >
            <Printer size={16} />
            <span>Cetak Dokumen Sekarang</span>
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-sm transition-colors"
          >
            <X size={16} />
            <span>Tutup</span>
          </button>
        </div>
      </div>

      {/* ── FORMAL PRINTABLE A4 PAGE ── */}
      <div className="printable-area bg-white shadow-2xl max-w-4xl w-full mt-6 sm:mt-10 p-8 sm:p-12 border border-gray-300">
        {/* Formal Hospital Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center bg-blue-600 text-white">
              <Stethoscope size={36} />
            </div>
            <div>
              <h1 className="font-black text-xl sm:text-2xl tracking-wide text-black">
                RUMAH SAKIT UMUM DAERAH TIMIKA
              </h1>
              <p className="font-bold text-xs sm:text-sm text-gray-800 tracking-wider">
                UNIT PELAYANAN KESEHATAN RAWAT INAP TERINTEGRASI
              </p>
              <p className="text-xs text-gray-600 mt-0.5 font-medium">
                Jl. Rumah Sakit SP 2, Mimika, Papua Tengah 99910 • Telp: (0901) 321890
              </p>
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <div className="border border-black px-3 py-1 rounded text-xs font-mono font-bold bg-gray-50 mb-1">
              FORM RS-DPP-25
            </div>
            <span className="text-[10px] text-gray-500 font-mono">
              Rev. 02 / 2025
            </span>
          </div>
        </div>

        <div className="border-t border-black py-0.5 mb-6" />

        {/* Document Title */}
        <div className="text-center mb-6">
          <h2 className="font-black text-lg sm:text-xl underline underline-offset-4 tracking-wide">
            SURAT BUKTI KELENGKAPAN DOKUMEN PASIEN PULANG
          </h2>
          <p className="text-xs text-gray-600 mt-1 font-mono">
            No. Register: RSUD/DPP/{patient.noRM || "XXX"}/{patient.tanggalKeluar ? patient.tanggalKeluar.replace(/\D+/g, "") : "2025"}
          </p>
        </div>

        {/* Biodata Pasien Table */}
        <div className="mb-8">
          <div className="bg-gray-100 border border-black border-b-0 px-3 py-1.5 font-bold text-xs sm:text-sm tracking-wider uppercase">
            A. Identitas &amp; Informasi Rawat Inap Pasien
          </div>
          <table className="w-full border-collapse border border-black text-xs sm:text-sm font-medium">
            <tbody>
              <tr className="border-b border-gray-300 font-sans">
                <td className="border-r border-gray-300 p-2.5 bg-gray-50 font-bold w-1/4">Nama Pasien</td>
                <td className="border-r border-gray-300 p-2.5 w-1/4 font-semibold text-black">{protect(patient.namaPasien, canViewPII, "name")}</td>
                <td className="border-r border-gray-300 p-2.5 bg-gray-50 font-bold w-1/4">No. Rekam Medis</td>
                <td className="p-2.5 font-mono font-bold">{protect(patient.noRM, canViewPII, "rm")}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="border-r border-gray-300 p-2.5 bg-gray-50 font-bold">Ruangan / Bangsal</td>
                <td className="border-r border-gray-300 p-2.5">{patient.asalRuangan || "N/A"}</td>
                <td className="border-r border-gray-300 p-2.5 bg-gray-50 font-bold">Suku Pasien</td>
                <td className="p-2.5">{patient.suku || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="border-r border-gray-300 p-2.5 bg-gray-50 font-bold">Tanggal Masuk RS</td>
                <td className="border-r border-gray-300 p-2.5">{patient.tanggalMasuk || "-"}</td>
                <td className="border-r border-gray-300 p-2.5 bg-gray-50 font-bold">Tanggal Keluar RS</td>
                <td className="p-2.5">{patient.tanggalKeluar || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="border-r border-gray-300 p-2.5 bg-gray-50 font-bold">Lama Perawatan (LOS)</td>
                <td className="border-r border-gray-300 p-2.5 font-bold">{formatLOS(patient.lamaRawat)}</td>
                <td className="border-r border-gray-300 p-2.5 bg-gray-50 font-bold">Alamat Rumah</td>
                <td className="p-2.5">{protect(patient.alamat, canViewPII, "address")}</td>
              </tr>
              <tr>
                <td className="border-r border-gray-300 p-2.5 bg-gray-50 font-bold">Keluarga Pendamping</td>
                <td className="border-r border-gray-300 p-2.5">{protect(patient.namaKeluarga, canViewPII, "text")}</td>
                <td className="border-r border-gray-300 p-2.5 bg-gray-50 font-bold">Sopir / Plat Mobil</td>
                <td className="p-2.5">{patient.namaSopir || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Kelengkapan Dokumen Table */}
        <div className="mb-10">
          <div className="bg-gray-100 border border-black border-b-0 px-3 py-1.5 font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-between">
            <span>B. Verifikasi Kelengkapan Dokumen &amp; Edukasi Kepulangan</span>
            <span className="text-xs font-normal font-mono lowercase">
              (ceklist otomatis dari rekam medis)
            </span>
          </div>
          <table className="w-full border-collapse border border-black text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-black bg-gray-50 font-bold text-center">
                <th className="border-r border-black p-2 w-12">No</th>
                <th className="border-r border-black p-2 text-left">Komponen Persyaratan &amp; Tindakan Kepulangan</th>
                <th className="border-r border-black p-2 w-32">Status</th>
                <th className="p-2 w-36">Keterangan / Verif</th>
              </tr>
            </thead>
            <tbody>
              {CHECKLIST_ALL.map((item, index) => {
                const done = patient.checklist.some((c) =>
                  c.toLowerCase().replace(/["'"]/g, "").trim().includes(
                    item.toLowerCase().replace(/["'"]/g, "").trim().slice(0, 18)
                  )
                );
                return (
                  <tr key={item} className="border-b border-gray-300 hover:bg-gray-50">
                    <td className="border-r border-black p-2 font-mono font-bold text-center">
                      {index + 1}
                    </td>
                    <td className="border-r border-black p-2 font-medium text-gray-900">
                      {item}
                    </td>
                    <td className="border-r border-black p-2 text-center font-bold">
                      {done ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-xs">
                          <CheckCircle2 size={13} /> LENGKAP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 bg-red-100 px-2 py-0.5 rounded text-xs">
                          <XCircle size={13} /> BELUM
                        </span>
                      )}
                    </td>
                    <td className="p-2 font-mono text-[11px] text-gray-500 text-center">
                      {done ? "Verified sistem" : "Perlu tindak lanjut"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Catatan Khusus */}
        <div className="border border-black p-3 mb-10 bg-yellow-50/50 rounded-lg">
          <p className="font-bold text-xs uppercase underline mb-1 flex items-center gap-1.5 text-gray-800">
            <FileText size={14} className="text-yellow-700" /> Catatan Tambahan / Instruksi Perawatan:
          </p>
          <p className="text-xs text-gray-700 leading-relaxed min-h-[36px]">
            1. Pasien diwajibkan membawa surat kontrol dan hasil pemeriksaan penunjang saat melakukan kunjungan ulang ke Poliklinik RSUD Timika. <br />
            2. Obat-obatan harap dikonsumsi sesuai aturan dan dosis yang telah diedukasikan oleh apoteker/perawat ruangan.
          </p>
        </div>

        {/* Tanda Tangan / Verifikasi Paraf */}
        <div className="mt-12 pt-6 border-t-2 border-black grid grid-cols-3 gap-6 text-center text-xs sm:text-sm select-none">
          <div className="flex flex-col items-center justify-between min-h-[130px]">
            <span className="font-bold">Keluarga / Pendamping</span>
            <div className="w-full flex justify-center mt-12">
              <span className="border-b border-black font-semibold inline-block min-w-[160px] pb-1 truncate">
                ( {protect(patient.namaKeluarga, canViewPII, "text") || ".........................."} )
              </span>
            </div>
            <span className="text-[10px] text-gray-500 mt-1">Penerima Dokumen &amp; Edukasi</span>
          </div>

          <div className="flex flex-col items-center justify-between min-h-[130px]">
            <span className="font-bold">Sopir / Petugas Transport</span>
            <div className="w-full flex justify-center mt-12">
              <span className="border-b border-black font-semibold inline-block min-w-[160px] pb-1 truncate">
                ( {patient.namaSopir ? patient.namaSopir.split("/")[0].trim() : ".........................."} )
              </span>
            </div>
            <span className="text-[10px] text-gray-500 mt-1">Program &quot;Sa Antar Ko&quot;</span>
          </div>

          <div className="flex flex-col items-center justify-between min-h-[130px]">
            <span className="font-bold">Petugas Ruangan / Perawat</span>
            <div className="w-full flex justify-center mt-12">
              <span className="border-b border-black font-semibold inline-block min-w-[160px] pb-1">
                ( Petugas Unit {patient.asalRuangan || "Rawat Inap"} )
              </span>
            </div>
            <span className="text-[10px] text-gray-500 mt-1">RSUD Timika</span>
          </div>
        </div>

        {/* Footer info cetak */}
        <div className="mt-12 pt-4 border-t border-gray-300 flex items-center justify-between text-[10px] text-gray-500 font-mono">
          <span>Dicetak otomatis dari Sistem Dokumen Pasien Pulang RSUD Timika</span>
          <span>Waktu Cetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>
    </div>
  );
}
