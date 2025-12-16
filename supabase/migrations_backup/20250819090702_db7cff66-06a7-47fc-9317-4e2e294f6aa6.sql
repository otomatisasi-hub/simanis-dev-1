-- Create sample service categories if they don't exist
INSERT INTO public.service_categories (name, description, type, is_active) 
VALUES 
  ('Akta Pendirian Perusahaan', 'Pendirian badan usaha baru seperti PT, CV, UD', 'notaris', true),
  ('Akta Perubahan Anggaran Dasar', 'Perubahan anggaran dasar perusahaan', 'notaris', true),
  ('Perjanjian Kerjasama', 'Pembuatan berbagai jenis perjanjian bisnis', 'notaris', true),
  ('Akta Jual Beli Tanah', 'Transaksi jual beli properti tanah dan bangunan', 'ppat', true),
  ('Akta Hibah', 'Hibah tanah dan bangunan', 'ppat', true),
  ('Pemberian Hak Tanggungan', 'Pemberian hak tanggungan atas tanah', 'ppat', true)
ON CONFLICT (name) DO NOTHING;

-- Create sample clients if they don't exist
INSERT INTO public.clients (
  full_name, 
  email, 
  phone, 
  address, 
  nik, 
  npwp,
  client_type,
  created_by
) 
SELECT 
  'Budi Santoso', 
  'budi.santoso@email.com', 
  '081234567890', 
  'Jl. Sudirman No. 123, Jakarta Pusat', 
  '3201234567890123', 
  '123456789012345',
  'individual',
  auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE email = 'budi.santoso@email.com');

INSERT INTO public.clients (
  full_name, 
  email, 
  phone, 
  address, 
  company_name,
  company_address,
  company_phone,
  company_npwp,
  client_type,
  created_by
) 
SELECT 
  'Sarah Wijaya', 
  'sarah@ptmaju.com', 
  '087654321098', 
  'Jl. Thamrin No. 45, Jakarta', 
  'PT Maju Bersama',
  'Gedung Plaza Indonesia, Jakarta',
  '0212345678',
  '987654321098765',
  'corporate',
  auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE email = 'sarah@ptmaju.com');

-- Create sample services if they don't exist
WITH sample_category AS (
  SELECT id FROM public.service_categories WHERE name = 'Akta Pendirian Perusahaan' LIMIT 1
),
sample_client AS (
  SELECT id FROM public.clients WHERE email = 'budi.santoso@email.com' LIMIT 1
)
INSERT INTO public.services (
  title,
  description,
  reference_number,
  status,
  priority,
  estimated_completion_date,
  required_documents,
  received_documents,
  category_id,
  client_id,
  created_by
)
SELECT 
  'Pendirian PT Teknologi Maju',
  'Pendirian perusahaan PT di bidang teknologi informasi',
  'NT-2024-001',
  'in_progress',
  'high',
  CURRENT_DATE + INTERVAL '14 days',
  ARRAY['KTP Direktur', 'NPWP', 'Surat Domisili'],
  ARRAY['KTP Direktur', 'NPWP'],
  sc.id,
  sc2.id,
  auth.uid()
FROM sample_category sc, sample_client sc2
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE reference_number = 'NT-2024-001');

WITH sample_category AS (
  SELECT id FROM public.service_categories WHERE name = 'Akta Jual Beli Tanah' LIMIT 1
),
sample_client AS (
  SELECT id FROM public.clients WHERE email = 'sarah@ptmaju.com' LIMIT 1
)
INSERT INTO public.services (
  title,
  description,
  reference_number,
  status,
  priority,
  estimated_completion_date,
  fee_amount,
  fee_status,
  category_id,
  client_id,
  created_by
)
SELECT 
  'Jual Beli Tanah Kemang',
  'Transaksi jual beli tanah di daerah Kemang, Jakarta Selatan',
  'PPAT-2024-001',
  'completed',
  'normal',
  CURRENT_DATE - INTERVAL '5 days',
  15000000,
  'paid',
  sc.id,
  sc2.id,
  auth.uid()
FROM sample_category sc, sample_client sc2
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE reference_number = 'PPAT-2024-001');