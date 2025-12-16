// Workflow templates parsed from CSV data
export interface DocumentChecklistItem {
  id: string;
  documentName: string;
  isRequired: boolean;
  isUploaded: boolean;
  fileUrl?: string;
  uploadedAt?: Date;
  uploadedBy?: string;
}

export interface WorkflowStep {
  id: string;
  order: number;
  stepName: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  documents?: DocumentChecklistItem[]; // Documents required for this step
}

export interface WorkflowTemplate {
  serviceType: string;
  subServiceType: string;
  documents: DocumentChecklistItem[];
  steps: WorkflowStep[];
  paymentTiming?: string;
}

export const notaryWorkflowTemplates: WorkflowTemplate[] = [
  {
    serviceType: "Pendirian",
    subServiceType: "Pendirian PT",
    documents: [
      { id: "doc-1", documentName: "KTP Direksi dan komisaris", isRequired: true, isUploaded: false },
      { id: "doc-2", documentName: "NPWP Direksi dan Komisaris", isRequired: true, isUploaded: false },
    ],
    steps: [
      { id: "step-1", order: 1, stepName: "Cek Nama PT", status: "pending" },
      { id: "step-2", order: 2, stepName: "Pembelian Voucher PNBP", status: "pending" },
      { 
        id: "step-3", 
        order: 3, 
        stepName: "Fotokopi KTP dan NPWP", 
        status: "pending",
        documents: [
          { id: "doc-1", documentName: "KTP Direksi dan komisaris", isRequired: true, isUploaded: false },
          { id: "doc-2", documentName: "NPWP Direksi dan Komisaris", isRequired: true, isUploaded: false },
        ]
      },
      { id: "step-4", order: 4, stepName: "Tanda tangan Akta", status: "pending" },
      { id: "step-5", order: 5, stepName: "Salinan Akta", status: "pending" },
      { id: "step-6", order: 6, stepName: "SK Kumham", status: "pending" },
      { id: "step-7", order: 7, stepName: "Pembuatan Invoice", status: "pending" },
      { id: "step-8", order: 8, stepName: "Tanda Terima Dokumen", status: "pending" },
    ],
    paymentTiming: "Pembayaran diawal"
  },
  {
    serviceType: "Pendirian",
    subServiceType: "Perubahan PT",
    documents: [
      { id: "doc-1", documentName: "SK Kemenkumham", isRequired: true, isUploaded: false },
      { id: "doc-2", documentName: "FC KTP dan NPWP", isRequired: true, isUploaded: false },
      { id: "doc-3", documentName: "Hasil keputusan RUPS", isRequired: true, isUploaded: false },
      { id: "doc-4", documentName: "NIB", isRequired: true, isUploaded: false },
      { id: "doc-5", documentName: "Nama Badan Usaha", isRequired: true, isUploaded: false },
    ],
    steps: [
      { id: "step-1", order: 1, stepName: "Pembelian Voucher PNBP", status: "pending" },
      { 
        id: "step-2", 
        order: 2, 
        stepName: "Fotokopi KTP, NPWP, Akta sebelumnya, Akta Pendirian, Akta Perubahan Terakhir, SK Pendirian dan Perubahan Terakhir serta NIB dan NPWP PT", 
        status: "pending",
        documents: [
          { id: "doc-1", documentName: "SK Kemenkumham", isRequired: true, isUploaded: false },
          { id: "doc-2", documentName: "FC KTP dan NPWP", isRequired: true, isUploaded: false },
          { id: "doc-3", documentName: "Hasil keputusan RUPS", isRequired: true, isUploaded: false },
          { id: "doc-4", documentName: "NIB", isRequired: true, isUploaded: false },
          { id: "doc-5", documentName: "Nama Badan Usaha", isRequired: true, isUploaded: false },
        ]
      },
      { id: "step-3", order: 3, stepName: "Tanda tangan Akta", status: "pending" },
      { id: "step-4", order: 4, stepName: "Salinan Akta", status: "pending" },
      { id: "step-5", order: 5, stepName: "SK Kumham", status: "pending" },
      { id: "step-6", order: 6, stepName: "Pembuatan Invoice", status: "pending" },
      { id: "step-7", order: 7, stepName: "Tanda Terima Dokumen", status: "pending" },
    ],
    paymentTiming: "Pembayaran diakhir"
  },
  {
    serviceType: "Perjanjian",
    subServiceType: "Sewa Menyewa",
    documents: [
      { id: "doc-1", documentName: "KTP", isRequired: true, isUploaded: false },
      { id: "doc-2", documentName: "NPWP Asli dan FC", isRequired: true, isUploaded: false },
      { id: "doc-3", documentName: "KK Asli dan FC", isRequired: true, isUploaded: false },
      { id: "doc-4", documentName: "Surat Nikah (Jika Sudah Menikah)", isRequired: false, isUploaded: false },
    ],
    steps: [
      { 
        id: "step-1", 
        order: 1, 
        stepName: "Minta Dokumen (Fotokopi KTP, KK, Surat Nikah, pemberi Kuasa, KTP penerima kuasa dan Sertifikat)", 
        status: "pending",
        documents: [
          { id: "doc-1", documentName: "KTP", isRequired: true, isUploaded: false },
          { id: "doc-2", documentName: "NPWP Asli dan FC", isRequired: true, isUploaded: false },
          { id: "doc-3", documentName: "KK Asli dan FC", isRequired: true, isUploaded: false },
          { id: "doc-4", documentName: "Surat Nikah (Jika Sudah Menikah)", isRequired: false, isUploaded: false },
        ]
      },
      { id: "step-2", order: 2, stepName: "Salinan Akta", status: "pending" },
      { id: "step-3", order: 3, stepName: "Pembebanan Invoice diakhir", status: "pending" },
    ],
    paymentTiming: "Pembayaran diakhir"
  },
  {
    serviceType: "Utang Piutang",
    subServiceType: "KPR Developer",
    documents: [
      { id: "doc-1", documentName: "KTP", isRequired: true, isUploaded: false },
      { id: "doc-2", documentName: "KK", isRequired: true, isUploaded: false },
      { id: "doc-3", documentName: "Buku Nikah/Surat Nikah (kalau sudah menikah)", isRequired: false, isUploaded: false },
      { id: "doc-4", documentName: "NPWP", isRequired: true, isUploaded: false },
      { id: "doc-5", documentName: "BPJS Kesehatan", isRequired: true, isUploaded: false },
    ],
    steps: [
      { id: "step-1", order: 1, stepName: "Order", status: "pending" },
      { 
        id: "step-2", 
        order: 2, 
        stepName: "Pengumpulan data", 
        status: "pending",
        documents: [
          { id: "doc-1", documentName: "KTP", isRequired: true, isUploaded: false },
          { id: "doc-2", documentName: "KK", isRequired: true, isUploaded: false },
          { id: "doc-3", documentName: "Buku Nikah/Surat Nikah (kalau sudah menikah)", isRequired: false, isUploaded: false },
          { id: "doc-4", documentName: "NPWP", isRequired: true, isUploaded: false },
          { id: "doc-5", documentName: "BPJS Kesehatan", isRequired: true, isUploaded: false },
        ]
      },
      { id: "step-3", order: 3, stepName: "Pembuatan akta akad", status: "pending" },
      { id: "step-4", order: 4, stepName: "Akad", status: "pending" },
      { id: "step-5", order: 5, stepName: "Pembuatan salinan dan merapihkan minuta", status: "pending" },
      { id: "step-6", order: 6, stepName: "Pembuatan invoice penagihan ke bank", status: "pending" },
      { id: "step-7", order: 7, stepName: "Penyerahan salinan dan invoice ke bank", status: "pending" },
      { id: "step-8", order: 8, stepName: "Penyerahan minuta Developer PPJB dan AJB", status: "pending" },
      { id: "step-9", order: 9, stepName: "Pembayaran pajak jual beli", status: "pending" },
      { id: "step-10", order: 10, stepName: "Validasi pajak jual beli", status: "pending" },
      { id: "step-11", order: 11, stepName: "Perminjaman sertifikat untuk roya dan balik nama", status: "pending" },
      { id: "step-12", order: 12, stepName: "Proses roya", status: "pending" },
      { id: "step-13", order: 13, stepName: "Pengecheckan sertifikat", status: "pending" },
      { id: "step-14", order: 14, stepName: "Pembuatan dan penomoran akta AJB", status: "pending" },
      { id: "step-15", order: 15, stepName: "Menyiapkan warkah untuk balik nama dan arsip PPAT", status: "pending" },
      { id: "step-16", order: 16, stepName: "Proses balik nama sertifikat", status: "pending" },
      { id: "step-17", order: 17, stepName: "Penyerahan salinan AJB ke bank dan developer", status: "pending" },
      { id: "step-18", order: 18, stepName: "Pembuatan tagihan balik nama", status: "pending" },
      { id: "step-19", order: 19, stepName: "Penyerahan sertifikat ke bank", status: "pending" },
    ],
    paymentTiming: "Penyerahan invoice pada saat Akad, jadi Invoice dan Akad berdampingan. Diakhir barengan dengan sertifikat setelah pekerjaan selesai"
  },
  {
    serviceType: "Utang Piutang",
    subServiceType: "Fidusia",
    documents: [
      { id: "doc-1", documentName: "Kartu Tanda Penduduk (KTP) Asli dan Fotokopi", isRequired: true, isUploaded: false },
      { id: "doc-2", documentName: "Nomor Pokok Wajib Pajak (NPWP) Asli dan Fotokopi", isRequired: true, isUploaded: false },
      { id: "doc-3", documentName: "Kartu Keluarga (KK) Asli dan Fotokopi", isRequired: false, isUploaded: false },
      { id: "doc-4", documentName: "Surat Nikah Asli dan Fotokopi", isRequired: false, isUploaded: false },
    ],
    steps: [
      { 
        id: "step-1", 
        order: 1, 
        stepName: "Minta Fotokopi KTP, NPWP, Surat Nikah, KK, dan Daftar Fidusia", 
        status: "pending",
        documents: [
          { id: "doc-1", documentName: "Kartu Tanda Penduduk (KTP) Asli dan Fotokopi", isRequired: true, isUploaded: false },
          { id: "doc-2", documentName: "Nomor Pokok Wajib Pajak (NPWP) Asli dan Fotokopi", isRequired: true, isUploaded: false },
          { id: "doc-3", documentName: "Kartu Keluarga (KK) Asli dan Fotokopi", isRequired: false, isUploaded: false },
          { id: "doc-4", documentName: "Surat Nikah Asli dan Fotokopi", isRequired: false, isUploaded: false },
        ]
      },
      { id: "step-2", order: 2, stepName: "Tanda tangan", status: "pending" },
      { id: "step-3", order: 3, stepName: "Salinan Akta", status: "pending" },
      { id: "step-4", order: 4, stepName: "Pendaftaran Fidusia", status: "pending" },
      { id: "step-5", order: 5, stepName: "Pembelian Voucher Fidusia", status: "pending" },
      { id: "step-6", order: 6, stepName: "Keluar Sertifikat Fidusia", status: "pending" },
      { id: "step-7", order: 7, stepName: "Penyerahan Salinan Sertifikat ke Bank", status: "pending" },
      { id: "step-8", order: 8, stepName: "Pembebanan Invoice diakhir", status: "pending" },
    ],
    paymentTiming: "Pembayaran diakhir"
  },
  {
    serviceType: "Utang Piutang",
    subServiceType: "Akta Kuasa Beli",
    documents: [
      { id: "doc-1", documentName: "Perjanjian Kredit", isRequired: true, isUploaded: false },
      { id: "doc-2", documentName: "Bukti Transfer Dana Pinjaman", isRequired: true, isUploaded: false },
      { id: "doc-3", documentName: "KTP Asli dan Fotokopi", isRequired: true, isUploaded: false },
      { id: "doc-4", documentName: "NPWP Asli dan Fotokopi", isRequired: true, isUploaded: false },
      { id: "doc-5", documentName: "Kartu Keluarga (KK) Asli dan Fotokopi", isRequired: true, isUploaded: false },
      { id: "doc-6", documentName: "Surat Nikah Asli dan Fotokopi", isRequired: false, isUploaded: false },
    ],
    steps: [
      { 
        id: "step-1", 
        order: 1, 
        stepName: "Fotokopi KTP, KK, Surat Nikah, pemberi Kuasa, KTP penerima kuasa dan Sertifikat", 
        status: "pending",
        documents: [
          { id: "doc-1", documentName: "Perjanjian Kredit", isRequired: true, isUploaded: false },
          { id: "doc-2", documentName: "Bukti Transfer Dana Pinjaman", isRequired: true, isUploaded: false },
          { id: "doc-3", documentName: "KTP Asli dan Fotokopi", isRequired: true, isUploaded: false },
          { id: "doc-4", documentName: "NPWP Asli dan Fotokopi", isRequired: true, isUploaded: false },
          { id: "doc-5", documentName: "Kartu Keluarga (KK) Asli dan Fotokopi", isRequired: true, isUploaded: false },
          { id: "doc-6", documentName: "Surat Nikah Asli dan Fotokopi", isRequired: false, isUploaded: false },
        ]
      },
      { id: "step-2", order: 2, stepName: "Tanda tangan Minuta Akta", status: "pending" },
      { id: "step-3", order: 3, stepName: "Salinan Akta", status: "pending" },
      { id: "step-4", order: 4, stepName: "Pembebanan Invoice diakhir", status: "pending" },
    ],
    paymentTiming: "Pembayaran diakhir"
  },
  // PPAT Services
  {
    serviceType: "PPAT",
    subServiceType: "Jual Beli Tanah",
    documents: [
      { id: "doc-1", documentName: "KTP", isRequired: true, isUploaded: false },
      { id: "doc-2", documentName: "KK", isRequired: true, isUploaded: false },
      { id: "doc-3", documentName: "Surat Nikah", isRequired: false, isUploaded: false },
      { id: "doc-4", documentName: "NPWP", isRequired: true, isUploaded: false },
      { id: "doc-5", documentName: "BPJS", isRequired: true, isUploaded: false },
      { id: "doc-6", documentName: "Sertifikat Tanah", isRequired: true, isUploaded: false },
    ],
    steps: [
      { id: "step-1", order: 1, stepName: "Order", status: "pending" },
      { 
        id: "step-2", 
        order: 2, 
        stepName: "Pengumpulan data", 
        status: "pending",
        documents: [
          { id: "doc-1", documentName: "KTP", isRequired: true, isUploaded: false },
          { id: "doc-2", documentName: "KK", isRequired: true, isUploaded: false },
          { id: "doc-3", documentName: "Surat Nikah", isRequired: false, isUploaded: false },
          { id: "doc-4", documentName: "NPWP", isRequired: true, isUploaded: false },
          { id: "doc-5", documentName: "BPJS", isRequired: true, isUploaded: false },
        ]
      },
      { id: "step-3", order: 3, stepName: "Pembuatan akta", status: "pending" },
      { id: "step-4", order: 4, stepName: "Akad", status: "pending" },
      { id: "step-5", order: 5, stepName: "Pembayaran pajak jual beli", status: "pending" },
      { id: "step-6", order: 6, stepName: "Validasi pajak", status: "pending" },
      { id: "step-7", order: 7, stepName: "Proses balik nama sertifikat", status: "pending" },
      { id: "step-8", order: 8, stepName: "Penyerahan sertifikat", status: "pending" },
    ],
    paymentTiming: "Pembayaran di awal dan akhir"
  },
  {
    serviceType: "PPAT",
    subServiceType: "Balik Nama Sertifikat",
    documents: [
      { id: "doc-1", documentName: "KTP Asli dan Fotokopi", isRequired: true, isUploaded: false },
      { id: "doc-2", documentName: "KK Asli dan Fotokopi", isRequired: true, isUploaded: false },
      { id: "doc-3", documentName: "Surat Nikah Asli dan Fotokopi", isRequired: false, isUploaded: false },
      { id: "doc-4", documentName: "NPWP", isRequired: true, isUploaded: false },
      { id: "doc-5", documentName: "Sertifikat Tanah Asli", isRequired: true, isUploaded: false },
      { id: "doc-6", documentName: "Akta Jual Beli", isRequired: true, isUploaded: false },
      { id: "doc-7", documentName: "Bukti Pembayaran PBB", isRequired: true, isUploaded: false },
    ],
    steps: [
      { id: "step-1", order: 1, stepName: "Penerimaan dokumen", status: "pending" },
      { 
        id: "step-2", 
        order: 2, 
        stepName: "Verifikasi kelengkapan dokumen", 
        status: "pending",
        documents: [
          { id: "doc-1", documentName: "KTP Asli dan Fotokopi", isRequired: true, isUploaded: false },
          { id: "doc-2", documentName: "KK Asli dan Fotokopi", isRequired: true, isUploaded: false },
          { id: "doc-3", documentName: "Surat Nikah Asli dan Fotokopi", isRequired: false, isUploaded: false },
          { id: "doc-4", documentName: "NPWP", isRequired: true, isUploaded: false },
          { id: "doc-5", documentName: "Sertifikat Tanah Asli", isRequired: true, isUploaded: false },
        ]
      },
      { id: "step-3", order: 3, stepName: "Pengecekan sertifikat di BPN", status: "pending" },
      { id: "step-4", order: 4, stepName: "Pembayaran BPHTB", status: "pending" },
      { id: "step-5", order: 5, stepName: "Pengajuan balik nama ke BPN", status: "pending" },
      { id: "step-6", order: 6, stepName: "Proses balik nama di BPN", status: "pending" },
      { id: "step-7", order: 7, stepName: "Pengambilan sertifikat baru", status: "pending" },
      { id: "step-8", order: 8, stepName: "Penyerahan sertifikat ke klien", status: "pending" },
    ],
    paymentTiming: "Pembayaran di awal"
  },
  {
    serviceType: "PPAT",
    subServiceType: "Hibah Tanah",
    documents: [
      { id: "doc-1", documentName: "KTP Pemberi dan Penerima Hibah", isRequired: true, isUploaded: false },
      { id: "doc-2", documentName: "KK Pemberi dan Penerima Hibah", isRequired: true, isUploaded: false },
      { id: "doc-3", documentName: "Surat Nikah", isRequired: false, isUploaded: false },
      { id: "doc-4", documentName: "NPWP", isRequired: true, isUploaded: false },
      { id: "doc-5", documentName: "Sertifikat Tanah Asli", isRequired: true, isUploaded: false },
      { id: "doc-6", documentName: "Bukti Pembayaran PBB", isRequired: true, isUploaded: false },
      { id: "doc-7", documentName: "Surat Pernyataan Ahli Waris (jika diperlukan)", isRequired: false, isUploaded: false },
    ],
    steps: [
      { 
        id: "step-1", 
        order: 1, 
        stepName: "Pengumpulan dokumen", 
        status: "pending",
        documents: [
          { id: "doc-1", documentName: "KTP Pemberi dan Penerima Hibah", isRequired: true, isUploaded: false },
          { id: "doc-2", documentName: "KK Pemberi dan Penerima Hibah", isRequired: true, isUploaded: false },
          { id: "doc-3", documentName: "Surat Nikah", isRequired: false, isUploaded: false },
          { id: "doc-4", documentName: "NPWP", isRequired: true, isUploaded: false },
          { id: "doc-5", documentName: "Sertifikat Tanah Asli", isRequired: true, isUploaded: false },
        ]
      },
      { id: "step-2", order: 2, stepName: "Pembuatan Akta Hibah", status: "pending" },
      { id: "step-3", order: 3, stepName: "Penandatanganan Akta Hibah", status: "pending" },
      { id: "step-4", order: 4, stepName: "Pembayaran BPHTB", status: "pending" },
      { id: "step-5", order: 5, stepName: "Pendaftaran balik nama di BPN", status: "pending" },
      { id: "step-6", order: 6, stepName: "Proses balik nama", status: "pending" },
      { id: "step-7", order: 7, stepName: "Pengambilan sertifikat", status: "pending" },
      { id: "step-8", order: 8, stepName: "Penyerahan dokumen", status: "pending" },
    ],
    paymentTiming: "Pembayaran di akhir"
  },
  // Syariah Services
  {
    serviceType: "Syariah",
    subServiceType: "Akad Murabahah",
    documents: [
      { id: "doc-1", documentName: "KTP Para Pihak", isRequired: true, isUploaded: false },
      { id: "doc-2", documentName: "KK Para Pihak", isRequired: true, isUploaded: false },
      { id: "doc-3", documentName: "NPWP", isRequired: true, isUploaded: false },
      { id: "doc-4", documentName: "Surat Nikah (jika menikah)", isRequired: false, isUploaded: false },
      { id: "doc-5", documentName: "Dokumen Objek Murabahah", isRequired: true, isUploaded: false },
      { id: "doc-6", documentName: "Surat Persetujuan Pasangan", isRequired: false, isUploaded: false },
    ],
    steps: [
      { 
        id: "step-1", 
        order: 1, 
        stepName: "Pengumpulan dokumen dan verifikasi syariah", 
        status: "pending",
        documents: [
          { id: "doc-1", documentName: "KTP Para Pihak", isRequired: true, isUploaded: false },
          { id: "doc-2", documentName: "KK Para Pihak", isRequired: true, isUploaded: false },
          { id: "doc-3", documentName: "NPWP", isRequired: true, isUploaded: false },
          { id: "doc-4", documentName: "Surat Nikah (jika menikah)", isRequired: false, isUploaded: false },
        ]
      },
      { id: "step-2", order: 2, stepName: "Pembuatan draft akad murabahah", status: "pending" },
      { id: "step-3", order: 3, stepName: "Review kepatuhan syariah", status: "pending" },
      { id: "step-4", order: 4, stepName: "Penandatanganan akad", status: "pending" },
      { id: "step-5", order: 5, stepName: "Pembuatan salinan akta", status: "pending" },
      { id: "step-6", order: 6, stepName: "Penyerahan dokumen", status: "pending" },
      { id: "step-7", order: 7, stepName: "Pembuatan invoice", status: "pending" },
    ],
    paymentTiming: "Pembayaran di akhir"
  },
  {
    serviceType: "Syariah",
    subServiceType: "Wakaf Properti",
    documents: [
      { id: "doc-1", documentName: "KTP Wakif (Pemberi Wakaf)", isRequired: true, isUploaded: false },
      { id: "doc-2", documentName: "KK Wakif", isRequired: true, isUploaded: false },
      { id: "doc-3", documentName: "NPWP Wakif", isRequired: true, isUploaded: false },
      { id: "doc-4", documentName: "Sertifikat Tanah/Properti Asli", isRequired: true, isUploaded: false },
      { id: "doc-5", documentName: "Bukti Pembayaran PBB", isRequired: true, isUploaded: false },
      { id: "doc-6", documentName: "Surat Persetujuan Keluarga", isRequired: false, isUploaded: false },
      { id: "doc-7", documentName: "Surat Keterangan Nazhir", isRequired: true, isUploaded: false },
    ],
    steps: [
      { 
        id: "step-1", 
        order: 1, 
        stepName: "Pengumpulan dokumen wakaf", 
        status: "pending",
        documents: [
          { id: "doc-1", documentName: "KTP Wakif (Pemberi Wakaf)", isRequired: true, isUploaded: false },
          { id: "doc-2", documentName: "KK Wakif", isRequired: true, isUploaded: false },
          { id: "doc-3", documentName: "NPWP Wakif", isRequired: true, isUploaded: false },
          { id: "doc-4", documentName: "Sertifikat Tanah/Properti Asli", isRequired: true, isUploaded: false },
        ]
      },
      { id: "step-2", order: 2, stepName: "Verifikasi kelengkapan syariah", status: "pending" },
      { id: "step-3", order: 3, stepName: "Pembuatan Akta Ikrar Wakaf (AIW)", status: "pending" },
      { id: "step-4", order: 4, stepName: "Penandatanganan AIW di hadapan PPAIW", status: "pending" },
      { id: "step-5", order: 5, stepName: "Pendaftaran ke BWI (Badan Wakaf Indonesia)", status: "pending" },
      { id: "step-6", order: 6, stepName: "Proses sertifikat tanah wakaf", status: "pending" },
      { id: "step-7", order: 7, stepName: "Penyerahan sertifikat wakaf", status: "pending" },
    ],
    paymentTiming: "Pembayaran di akhir"
  },
  {
    serviceType: "Syariah",
    subServiceType: "Akad Mudharabah",
    documents: [
      { id: "doc-1", documentName: "KTP Shahib al-Mal dan Mudharib", isRequired: true, isUploaded: false },
      { id: "doc-2", documentName: "KK Para Pihak", isRequired: true, isUploaded: false },
      { id: "doc-3", documentName: "NPWP Para Pihak", isRequired: true, isUploaded: false },
      { id: "doc-4", documentName: "Proposal Usaha", isRequired: true, isUploaded: false },
      { id: "doc-5", documentName: "Dokumen Legalitas Usaha", isRequired: true, isUploaded: false },
      { id: "doc-6", documentName: "Surat Persetujuan Pasangan", isRequired: false, isUploaded: false },
    ],
    steps: [
      { 
        id: "step-1", 
        order: 1, 
        stepName: "Pengumpulan dokumen dan verifikasi", 
        status: "pending",
        documents: [
          { id: "doc-1", documentName: "KTP Shahib al-Mal dan Mudharib", isRequired: true, isUploaded: false },
          { id: "doc-2", documentName: "KK Para Pihak", isRequired: true, isUploaded: false },
          { id: "doc-3", documentName: "NPWP Para Pihak", isRequired: true, isUploaded: false },
          { id: "doc-4", documentName: "Proposal Usaha", isRequired: true, isUploaded: false },
        ]
      },
      { id: "step-2", order: 2, stepName: "Review proposal dan aspek syariah", status: "pending" },
      { id: "step-3", order: 3, stepName: "Pembuatan draft akad mudharabah", status: "pending" },
      { id: "step-4", order: 4, stepName: "Penentuan nisbah bagi hasil", status: "pending" },
      { id: "step-5", order: 5, stepName: "Penandatanganan akad", status: "pending" },
      { id: "step-6", order: 6, stepName: "Pembuatan salinan akta", status: "pending" },
      { id: "step-7", order: 7, stepName: "Penyerahan dokumen dan invoice", status: "pending" },
    ],
    paymentTiming: "Pembayaran di akhir"
  }
];

export function getWorkflowTemplate(serviceType: string, subServiceType?: string): WorkflowTemplate | undefined {
  return notaryWorkflowTemplates.find(
    template => 
      template.serviceType === serviceType && 
      (!subServiceType || template.subServiceType === subServiceType)
  );
}
