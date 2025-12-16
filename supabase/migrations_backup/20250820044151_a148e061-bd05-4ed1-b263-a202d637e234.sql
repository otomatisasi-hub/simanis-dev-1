-- Modify the trigger to handle null auth.uid() gracefully
CREATE OR REPLACE FUNCTION public.log_service_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status != NEW.status THEN
      INSERT INTO public.service_timeline (service_id, action_type, description, performed_by)
      VALUES (NEW.id, 'status_change', 
              'Status changed from ' || OLD.status || ' to ' || NEW.status,
              COALESCE(auth.uid(), NEW.created_by));
    END IF;
    
    -- Log assignment changes
    IF COALESCE(OLD.assigned_to::text, '') != COALESCE(NEW.assigned_to::text, '') THEN
      INSERT INTO public.service_timeline (service_id, action_type, description, performed_by)
      VALUES (NEW.id, 'assignment_change', 
              'Service assigned to new staff member',
              COALESCE(auth.uid(), NEW.created_by));
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- Log service creation
    INSERT INTO public.service_timeline (service_id, action_type, description, performed_by)
    VALUES (NEW.id, 'service_created', 
            'Service created: ' || NEW.title,
            COALESCE(auth.uid(), NEW.created_by));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Now add sample data
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
    
    -- Add sample services if they don't exist
    IF NOT EXISTS (SELECT 1 FROM services WHERE reference_number = 'NOT-2024-001') THEN
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
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM services WHERE reference_number = 'PPAT-2024-001') THEN
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
    END IF;

END $$;