-- Add administrator role to the enum if it doesn't exist and add it to the current user
DO $$
DECLARE
    current_user_id uuid;
BEGIN
    -- Get the current authenticated user
    SELECT id INTO current_user_id FROM auth.users WHERE email = 'imamsatrio357@gmail.com';
    
    -- Add administrator role if it doesn't exist for this user
    INSERT INTO public.user_roles (user_id, role) 
    SELECT current_user_id, 'administrator'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = current_user_id AND role = 'administrator'
    );
    
    -- Also create a profile if it doesn't exist
    INSERT INTO public.profiles (user_id, full_name) 
    SELECT current_user_id, 'Imam Satrio'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = current_user_id
    );

END $$;