-- Add service_types table for specific service details
CREATE TABLE public.service_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'ppat' or 'notaris'
  description TEXT,
  document_template JSONB, -- Store document checklist templates
  workflow_steps JSONB, -- Store specific workflow steps
  required_fields JSONB, -- Store additional required fields
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add document_categories table
CREATE TABLE public.document_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_type TEXT NOT NULL, -- 'client', 'service', 'object', etc.
  parent_id UUID REFERENCES public.document_categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add document_templates table for checklist per service type
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE CASCADE,
  document_category_id UUID REFERENCES public.document_categories(id),
  document_name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  applicable_for JSONB, -- Store conditions like client_type, etc.
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Extend clients table with additional corporate fields
ALTER TABLE public.clients ADD COLUMN company_founding_date DATE;
ALTER TABLE public.clients ADD COLUMN company_registration_number TEXT;
ALTER TABLE public.clients ADD COLUMN company_sk_kemenkumham TEXT;
ALTER TABLE public.clients ADD COLUMN company_nib TEXT;
ALTER TABLE public.clients ADD COLUMN director_ktp TEXT;
ALTER TABLE public.clients ADD COLUMN director_npwp TEXT;
ALTER TABLE public.clients ADD COLUMN commissioner_details JSONB;
ALTER TABLE public.clients ADD COLUMN rups_approval_details JSONB;

-- Add service_type_id to services table
ALTER TABLE public.services ADD COLUMN service_type_id UUID REFERENCES public.service_types(id);

-- Enable RLS on new tables
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_types
CREATE POLICY "Authenticated users can view service types" 
ON public.service_types FOR SELECT USING (true);

CREATE POLICY "Admins can manage service types" 
ON public.service_types FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'administrator'::app_role));

-- RLS policies for document_categories
CREATE POLICY "Authenticated users can view document categories" 
ON public.document_categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage document categories" 
ON public.document_categories FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'administrator'::app_role));

-- RLS policies for document_templates
CREATE POLICY "Authenticated users can view document templates" 
ON public.document_templates FOR SELECT USING (true);

CREATE POLICY "Admins can manage document templates" 
ON public.document_templates FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'administrator'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_service_types_updated_at
BEFORE UPDATE ON public.service_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial service types for PPAT services
INSERT INTO public.service_types (name, category, description, document_template, workflow_steps) VALUES
('Akta Jual Beli Tanah (AJB)', 'ppat', 'Pembuatan akta jual beli tanah', 
 '{"penjual_perorangan": ["KTP", "NPWP", "KK", "Surat Nikah", "Akun DJP Online"], "pembeli_perorangan": ["KK", "KTP", "NPWP"], "objek_tanah": ["Sertifikat Asli", "PBB", "IMB", "Hasil Pengecekan Sertifikat"]}',
 '["Pengumpulan Dokumen", "Verifikasi Dokumen", "Penyusunan Akta", "Penandatanganan", "Proses Balik Nama BPN"]'),
('Akta Hibah Tanah', 'ppat', 'Pembuatan akta hibah tanah',
 '{"pemberi_hibah": ["KTP", "NPWP", "KK", "Surat Nikah"], "penerima_hibah": ["KTP", "NPWP", "KK", "Surat Nikah"], "objek_tanah": ["Sertifikat Asli", "PBB", "IMB"]}',
 '["Pengumpulan Dokumen", "Verifikasi Dokumen", "Penyusunan Akta", "Penandatanganan"]'),
('Akta Pembagian Hak Bersama (APHB)', 'ppat', 'Pembuatan akta pembagian hak bersama',
 '{"pemilik_bersama": ["KTP", "NPWP", "KK", "Surat Nikah"], "objek_tanah": ["Sertifikat Asli Hak Milik Bersama", "SPPT PBB", "Bukti Lunas PBB", "IMB", "Gambar Situasi"], "dokumen_pendukung": ["Surat Kuasa", "Surat Pernyataan Tidak Sengketa", "SPORADIK", "Materai"]}',
 '["Pengumpulan Dokumen", "Sketsa Pembagian", "Verifikasi Dokumen", "Penyusunan Akta", "Penandatanganan"]'),
('Akta Pemberian Hak Tanggungan (APHT)', 'ppat', 'Pembuatan akta pemberian hak tanggungan',
 '{"debitur_perorangan": ["KTP", "NPWP", "KK", "Surat Nikah"], "debitur_badan_hukum": ["Akta Pendirian", "SK Kemenkumham", "NIB", "NPWP Badan Hukum"], "objek_tanah": ["Sertifikat Asli", "SPPT PBB", "Bukti Lunas PBB", "IMB"], "dokumen_bank": ["SPK/Perjanjian Kredit", "Formulir Permohonan Kredit", "Laporan Penilaian Agunan"]}',
 '["Pengumpulan Dokumen", "Verifikasi Dokumen", "Penyusunan Akta", "Penandatanganan", "Pendaftaran Hak Tanggungan"]');

-- Insert initial service types for Notaris services
INSERT INTO public.service_types (name, category, description, document_template, workflow_steps) VALUES
('Pendirian Badan Usaha (PT/CV/Yayasan)', 'notaris', 'Pendirian dan perubahan badan usaha',
 '{"pendirian": ["KTP Direksi dan Komisaris", "NPWP Direksi dan Komisaris"], "perubahan": ["SK Kemenkumham", "FC KTP dan NPWP", "Hasil keputusan RUPS", "NIB"]}',
 '["Pengumpulan Dokumen", "Penyusunan Akta", "Penandatanganan", "Pengajuan ke Kemenkumham"]'),
('Perjanjian Sewa Menyewa', 'notaris', 'Pembuatan perjanjian sewa menyewa',
 '{"individu": ["KTP", "NPWP", "KK", "Surat Nikah"], "badan_hukum": ["Akta Pendirian", "SK Kemenkumham", "NIB", "NPWP Badan Hukum"], "dokumen_pendukung": ["Bukti pembayaran PBB"]}',
 '["Pengumpulan Dokumen", "Penyusunan Perjanjian", "Penandatanganan"]'),
('Utang Piutang - KPR Developer', 'notaris', 'Akta utang piutang KPR developer',
 '{"debitur": ["KTP", "KK", "Buku Nikah", "NPWP", "BPJS Kesehatan"], "developer": ["Anggaran Dasar PT", "KTP/NPWP Direksi", "NPWP PT", "Izin Usaha", "SHGB", "PBB", "IMB/PBG"]}',
 '["Pengumpulan Dokumen", "Verifikasi Dokumen", "Penyusunan Akta", "Penandatanganan"]'),
('Fidusia', 'notaris', 'Pembuatan akta fidusia',
 '{"debitur_perorangan": ["KTP", "NPWP", "KK", "Surat Nikah"], "debitur_badan_usaha": ["Akta Pendirian", "SK Kemenkumham", "NIB", "NPWP Badan Usaha"], "kreditur_bank": ["Akta Pendirian", "SK Pengesahan", "NPWP Badan Hukum"], "objek_kendaraan": ["BPKB Asli", "STNK", "Faktur Pembelian"]}',
 '["Pengumpulan Dokumen", "Verifikasi Objek Fidusia", "Penyusunan Akta", "Penandatanganan", "Pendaftaran Fidusia"]');

-- Insert document categories
INSERT INTO public.document_categories (name, description, category_type) VALUES
('Dokumen Identitas', 'Dokumen identitas pribadi', 'client'),
('Dokumen Badan Hukum', 'Dokumen untuk badan hukum/perusahaan', 'client'),
('Dokumen Objek Tanah', 'Dokumen terkait tanah dan properti', 'object'),
('Dokumen Bank/Kredit', 'Dokumen terkait pinjaman dan bank', 'service'),
('Dokumen Pendukung', 'Dokumen pendukung lainnya', 'service');