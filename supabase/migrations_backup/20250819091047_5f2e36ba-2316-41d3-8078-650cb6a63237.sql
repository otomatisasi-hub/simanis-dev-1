-- First, let's get a real user ID to use for sample data
DO $$
DECLARE
    sample_user_id uuid;
BEGIN
    -- Get the first available user ID
    SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
    
    -- If no user exists, create a UUID placeholder (this shouldn't happen in this case)
    IF sample_user_id IS NULL THEN
        sample_user_id := gen_random_uuid();
    END IF;

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

    -- Create sample clients
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
    VALUES 
      ('Budi Santoso', 'budi.santoso@email.com', '081234567890', 'Jl. Sudirman No. 123, Jakarta Pusat', '3201234567890123', '123456789012345', 'individual', sample_user_id),
      ('Sarah Wijaya', 'sarah@ptmaju.com', '087654321098', 'Jl. Thamrin No. 45, Jakarta', NULL, NULL, 'corporate', sample_user_id)
    ON CONFLICT (email) DO NOTHING;

    -- Update the corporate client with company info
    UPDATE public.clients 
    SET 
      company_name = 'PT Maju Bersama',
      company_address = 'Gedung Plaza Indonesia, Jakarta',
      company_phone = '0212345678',
      company_npwp = '987654321098765'
    WHERE email = 'sarah@ptmaju.com';

    -- Create sample services
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
      c.id,
      sample_user_id
    FROM public.service_categories sc, public.clients c
    WHERE sc.name = 'Akta Pendirian Perusahaan' 
      AND c.email = 'budi.santoso@email.com'
      AND NOT EXISTS (SELECT 1 FROM public.services WHERE reference_number = 'NT-2024-001');

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
      c.id,
      sample_user_id
    FROM public.service_categories sc, public.clients c
    WHERE sc.name = 'Akta Jual Beli Tanah' 
      AND c.email = 'sarah@ptmaju.com'
      AND NOT EXISTS (SELECT 1 FROM public.services WHERE reference_number = 'PPAT-2024-001');

END $$;