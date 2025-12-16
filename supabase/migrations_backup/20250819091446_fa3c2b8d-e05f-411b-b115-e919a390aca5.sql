-- Add sample data step by step
DO $$
DECLARE
    sample_user_id uuid;
BEGIN
    -- Get the first available user ID
    SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
    
    -- Add service categories one by one
    INSERT INTO public.service_categories (name, description, type, is_active) 
    SELECT 'Akta Pendirian Perusahaan', 'Pendirian badan usaha baru seperti PT, CV, UD', 'notaris', true
    WHERE NOT EXISTS (SELECT 1 FROM public.service_categories WHERE name = 'Akta Pendirian Perusahaan');

    INSERT INTO public.service_categories (name, description, type, is_active) 
    SELECT 'Akta Jual Beli Tanah', 'Transaksi jual beli properti tanah dan bangunan', 'ppat', true
    WHERE NOT EXISTS (SELECT 1 FROM public.service_categories WHERE name = 'Akta Jual Beli Tanah');

    INSERT INTO public.service_categories (name, description, type, is_active) 
    SELECT 'Perjanjian Kerjasama', 'Pembuatan berbagai jenis perjanjian bisnis', 'notaris', true
    WHERE NOT EXISTS (SELECT 1 FROM public.service_categories WHERE name = 'Perjanjian Kerjasama');

    -- Add sample client
    INSERT INTO public.clients (full_name, email, phone, address, nik, npwp, client_type, created_by)
    SELECT 'Budi Santoso', 'budi.santoso@email.com', '081234567890', 
           'Jl. Sudirman No. 123, Jakarta Pusat', '3201234567890123', 
           '123456789012345', 'individual', sample_user_id
    WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE email = 'budi.santoso@email.com');

    -- Add user role for the sample user to fix access issues
    INSERT INTO public.user_roles (user_id, role) 
    SELECT sample_user_id, 'super_admin'
    WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = sample_user_id);

END $$;