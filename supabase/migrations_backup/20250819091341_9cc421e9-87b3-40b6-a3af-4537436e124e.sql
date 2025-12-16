-- Add sample data without constraints first
DO $$
DECLARE
    sample_user_id uuid;
    sample_category_id uuid;
    sample_client_id uuid;
BEGIN
    -- Get the first available user ID
    SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
    
    -- Add service categories
    INSERT INTO public.service_categories (name, description, type, is_active) 
    VALUES 
      ('Akta Pendirian Perusahaan', 'Pendirian badan usaha baru seperti PT, CV, UD', 'notaris', true),
      ('Akta Jual Beli Tanah', 'Transaksi jual beli properti tanah dan bangunan', 'ppat', true),
      ('Perjanjian Kerjasama', 'Pembuatan berbagai jenis perjanjian bisnis', 'notaris', true)
    RETURNING id INTO sample_category_id;

    -- Add sample clients if they don't exist
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE email = 'budi.santoso@email.com') THEN
        INSERT INTO public.clients (
          full_name, email, phone, address, nik, npwp, client_type, created_by
        ) VALUES (
          'Budi Santoso', 'budi.santoso@email.com', '081234567890', 
          'Jl. Sudirman No. 123, Jakarta Pusat', '3201234567890123', 
          '123456789012345', 'individual', sample_user_id
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE email = 'sarah@ptmaju.com') THEN
        INSERT INTO public.clients (
          full_name, email, phone, address, company_name, company_address, 
          company_phone, company_npwp, client_type, created_by
        ) VALUES (
          'Sarah Wijaya', 'sarah@ptmaju.com', '087654321098', 'Jl. Thamrin No. 45, Jakarta',
          'PT Maju Bersama', 'Gedung Plaza Indonesia, Jakarta', '0212345678',
          '987654321098765', 'corporate', sample_user_id
        );
    END IF;

    -- Add sample services
    IF NOT EXISTS (SELECT 1 FROM public.services WHERE reference_number = 'NT-2024-001') THEN
        SELECT sc.id, c.id INTO sample_category_id, sample_client_id 
        FROM public.service_categories sc, public.clients c
        WHERE sc.name = 'Akta Pendirian Perusahaan' 
          AND c.email = 'budi.santoso@email.com'
        LIMIT 1;

        INSERT INTO public.services (
          title, description, reference_number, status, priority,
          estimated_completion_date, required_documents, received_documents,
          category_id, client_id, created_by
        ) VALUES (
          'Pendirian PT Teknologi Maju',
          'Pendirian perusahaan PT di bidang teknologi informasi',
          'NT-2024-001', 'in_progress', 'high',
          CURRENT_DATE + INTERVAL '14 days',
          ARRAY['KTP Direktur', 'NPWP', 'Surat Domisili'],
          ARRAY['KTP Direktur', 'NPWP'],
          sample_category_id, sample_client_id, sample_user_id
        );
    END IF;

    -- Add user role for the sample user to fix access issues
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = sample_user_id) THEN
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (sample_user_id, 'super_admin');
    END IF;

END $$;