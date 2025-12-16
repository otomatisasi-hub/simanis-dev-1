-- Add sample services with proper references
DO $$
DECLARE
    current_user_id uuid;
    notaris_category_id uuid;
    ppat_category_id uuid;
    client_id uuid;
BEGIN
    -- Get current user
    SELECT id INTO current_user_id FROM auth.users WHERE email = 'imamsatrio357@gmail.com';
    
    -- Get category IDs
    SELECT id INTO notaris_category_id FROM service_categories WHERE type = 'notaris' LIMIT 1;
    SELECT id INTO ppat_category_id FROM service_categories WHERE type = 'ppat' LIMIT 1;
    
    -- Get client ID
    SELECT id INTO client_id FROM clients LIMIT 1;
    
    -- Add sample notaris service
    INSERT INTO public.services (
        title, description, reference_number, status, priority,
        estimated_completion_date, required_documents, received_documents,
        category_id, client_id, created_by
    ) VALUES (
        'Pendirian PT Teknologi Digital',
        'Layanan pendirian Perseroan Terbatas untuk perusahaan teknologi digital',
        'NOT-2024-001',
        'in_progress',
        'high',
        CURRENT_DATE + INTERVAL '14 days',
        ARRAY['Akta Pendirian', 'KTP Direktur', 'NPWP', 'Surat Domisili'],
        ARRAY['KTP Direktur', 'NPWP'],
        notaris_category_id,
        client_id,
        current_user_id
    );
    
    -- Add sample PPAT service  
    INSERT INTO public.services (
        title, description, reference_number, status, priority,
        estimated_completion_date, fee_amount, fee_status,
        category_id, client_id, created_by
    ) VALUES (
        'Akta Jual Beli Tanah Menteng',
        'Layanan PPAT untuk transaksi jual beli tanah di area Menteng, Jakarta Pusat',
        'PPAT-2024-001',
        'completed',
        'normal',
        CURRENT_DATE - INTERVAL '5 days',
        25000000,
        'paid',
        ppat_category_id,
        client_id,
        current_user_id
    );

    -- Add more sample services
    INSERT INTO public.services (
        title, description, reference_number, status, priority,
        estimated_completion_date, category_id, client_id, created_by
    ) VALUES (
        'Perjanjian Kerjasama Bisnis',
        'Pembuatan perjanjian kerjasama antara dua perusahaan',
        'NOT-2024-002',
        'draft',
        'normal',
        CURRENT_DATE + INTERVAL '10 days',
        notaris_category_id,
        client_id,
        current_user_id
    );

END $$;