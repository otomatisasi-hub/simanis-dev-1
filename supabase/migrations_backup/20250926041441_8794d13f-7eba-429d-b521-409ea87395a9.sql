-- Add service workflow and financial tracking tables

-- Service workflow steps table
CREATE TABLE public.service_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Belum Mulai' CHECK (status IN ('Belum Mulai', 'Proses', 'Selesai')),
  is_ppat_step BOOLEAN DEFAULT false,
  ppat_warkah_number TEXT,
  ppat_agenda_number TEXT,
  ppat_entry_date DATE,
  ppat_exit_date DATE,
  ppat_certificate_check TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  started_by UUID,
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Service documents checklist table
CREATE TABLE public.service_document_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  document_group TEXT NOT NULL, -- pihak_perorangan, pihak_badan_hukum, objek, pendukung
  document_name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,
  file_url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  uploaded_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Financial tracking table
CREATE TABLE public.service_finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  follow_up_type TEXT NOT NULL CHECK (follow_up_type IN ('Pembelian Voucher PNBP', 'Pembuatan Invoice')),
  due_date DATE NOT NULL,
  amount DECIMAL(15,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  invoice_number TEXT,
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID
);

-- File storage locations table
CREATE TABLE public.file_storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  sub_service_type TEXT,
  client_type TEXT NOT NULL CHECK (client_type IN ('Perorangan', 'Badan Hukum')),
  storage_location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID
);

-- Service workflow templates (JSON-based)
CREATE TABLE public.service_workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code TEXT NOT NULL UNIQUE,
  service_name TEXT NOT NULL,
  service_category TEXT NOT NULL,
  workflow_steps JSONB NOT NULL,
  document_requirements JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.service_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_document_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_workflow_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can manage workflow steps" ON public.service_workflow_steps FOR ALL USING (true);
CREATE POLICY "Authenticated users can manage document checklist" ON public.service_document_checklist FOR ALL USING (true);
CREATE POLICY "Authenticated users can manage finances" ON public.service_finances FOR ALL USING (true);
CREATE POLICY "Authenticated users can manage file storage" ON public.file_storage_locations FOR ALL USING (true);

-- Admin-only policies for templates
CREATE POLICY "Admins can manage workflow templates" ON public.service_workflow_templates 
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'administrator'::app_role));
CREATE POLICY "Authenticated users can view workflow templates" ON public.service_workflow_templates 
  FOR SELECT USING (true);

-- Create triggers for updated_at columns
CREATE TRIGGER update_service_workflow_steps_updated_at
  BEFORE UPDATE ON public.service_workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_document_checklist_updated_at
  BEFORE UPDATE ON public.service_document_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_finances_updated_at
  BEFORE UPDATE ON public.service_finances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_file_storage_locations_updated_at
  BEFORE UPDATE ON public.file_storage_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample workflow templates based on the PDF data
INSERT INTO public.service_workflow_templates (service_code, service_name, service_category, workflow_steps, document_requirements) VALUES 
('AJB', 'Akta Jual Beli Tanah', 'PPAT', 
  '[
    {"nama": "Pengumpulan data pihak dan objek", "status": "Belum Mulai", "ppat": false},
    {"nama": "Cek sertifikat ke BPN", "status": "Belum Mulai", "ppat": true},
    {"nama": "Penyusunan minuta AJB", "status": "Belum Mulai", "ppat": false},
    {"nama": "Penandatanganan AJB", "status": "Belum Mulai", "ppat": false},
    {"nama": "Balik nama di BPN", "status": "Belum Mulai", "ppat": true},
    {"nama": "Penyerahan salinan AJB & sertifikat balik nama", "status": "Belum Mulai", "ppat": false}
  ]',
  '{
    "pihak_perorangan": ["KTP", "NPWP", "KK", "Surat Nikah", "Akun DJP Online"],
    "pihak_badan_hukum": ["Akta Pendirian & Perubahan", "SK Pengesahan", "NPWP Badan", "KTP/NPWP Pengurus", "Surat Kuasa Direksi", "NIB", "Akun DJP Online", "Persetujuan Komisaris/RUPS"],
    "objek": ["Sertifikat Asli", "SPPT PBB & Bukti Lunas", "IMB/PBG", "Hasil Pengecekan Sertifikat"]
  }'
),
('PENDIRIAN-PT', 'Pendirian PT', 'Notaris',
  '[
    {"nama": "Cek Nama PT", "status": "Belum Mulai", "ppat": false},
    {"nama": "Pembelian Voucher PNBP", "status": "Belum Mulai", "ppat": false},
    {"nama": "Tanda tangan Akta", "status": "Belum Mulai", "ppat": false},
    {"nama": "Salinan Akta", "status": "Belum Mulai", "ppat": false},
    {"nama": "SK Kumham", "status": "Belum Mulai", "ppat": false},
    {"nama": "Pembuatan Invoice", "status": "Belum Mulai", "ppat": false},
    {"nama": "Tanda Terima Dokumen", "status": "Belum Mulai", "ppat": false}
  ]',
  '{
    "pihak_perorangan": ["KTP Direksi dan komisaris", "NPWP Direksi dan Komisaris"],
    "dokumen_pendukung": ["Fotokopi KTP dan NPWP"]
  }'
),
('HIBAH', 'Hibah', 'PPAT',
  '[
    {"nama": "Pengumpulan data pihak dan objek", "status": "Belum Mulai", "ppat": false},
    {"nama": "Cek sertifikat ke BPN", "status": "Belum Mulai", "ppat": true},
    {"nama": "Penyusunan minuta Hibah", "status": "Belum Mulai", "ppat": false},
    {"nama": "Penandatanganan Hibah", "status": "Belum Mulai", "ppat": false},
    {"nama": "Balik nama di BPN", "status": "Belum Mulai", "ppat": true},
    {"nama": "Penyerahan salinan Hibah & sertifikat balik nama", "status": "Belum Mulai", "ppat": false}
  ]',
  '{
    "pihak_perorangan": ["KTP", "NPWP", "KK", "Surat Nikah"],
    "objek": ["Sertifikat Asli", "SPPT PBB & Bukti Lunas", "IMB/PBG"]
  }'
);