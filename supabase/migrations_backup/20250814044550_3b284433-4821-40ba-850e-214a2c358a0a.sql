-- Create enum for user roles
-- Check and create enum only if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'administrator', 'staf_ppat', 'staf_notaris');
  END IF;
END $$;

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  employee_id TEXT UNIQUE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_type TEXT NOT NULL CHECK (client_type IN ('individual', 'corporate')),
  full_name TEXT NOT NULL,
  nik TEXT,
  npwp TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  -- Corporate specific fields
  company_name TEXT,
  company_npwp TEXT,
  company_address TEXT,
  company_phone TEXT,
  -- Documents
  ktp_url TEXT,
  npwp_url TEXT,
  kk_url TEXT,
  marriage_certificate_url TEXT,
  corporate_documents_url TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create service categories table
CREATE TABLE public.service_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('notaris', 'ppat')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.service_categories(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  reference_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'review', 'completed', 'cancelled')),
  required_documents TEXT[],
  received_documents TEXT[],
  missing_documents TEXT[],
  notes TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS app_role[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(role)
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all user roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- RLS Policies for clients
CREATE POLICY "Authenticated users can view all clients" 
ON public.clients 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create clients" 
ON public.clients 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update clients" 
ON public.clients 
FOR UPDATE 
TO authenticated 
USING (true);

-- RLS Policies for service_categories
CREATE POLICY "Authenticated users can view service categories" 
ON public.service_categories 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage service categories" 
ON public.service_categories 
FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'administrator'));

-- RLS Policies for services
CREATE POLICY "Authenticated users can view all services" 
ON public.services 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create services" 
ON public.services 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update services" 
ON public.services 
FOR UPDATE 
TO authenticated 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert initial service categories
INSERT INTO public.service_categories (name, description, type) VALUES
-- PPAT Services
('Akta Jual Beli Tanah (AJB)', 'Pembuatan akta jual beli properti dan tanah', 'ppat'),
('Hibah Tanah', 'Pembuatan akta hibah tanah dan properti', 'ppat'),
('Pembagian Hak Bersama', 'Pembagian hak atas tanah bersama', 'ppat'),
('Pemberian Hak Tanggungan', 'Pembuatan akta pemberian hak tanggungan', 'ppat'),
('Akta Tukar Menukar', 'Pembuatan akta tukar menukar tanah', 'ppat'),

-- Notaris Services
('Pendirian PT', 'Pendirian Perseroan Terbatas', 'notaris'),
('Pendirian CV', 'Pendirian Commanditaire Vennootschap', 'notaris'),
('Perubahan Anggaran Dasar', 'Perubahan anggaran dasar badan usaha', 'notaris'),
('Perjanjian Sewa Menyewa', 'Pembuatan perjanjian sewa menyewa', 'notaris'),
('Perjanjian Utang Piutang', 'Pembuatan perjanjian utang piutang', 'notaris'),
('Fidusia', 'Pembuatan akta jaminan fidusia', 'notaris'),
('Akta Kuasa', 'Pembuatan surat kuasa', 'notaris'),
('Perjanjian Jual Beli', 'Perjanjian jual beli berbagai aset', 'notaris'),
('Akta Wasiat', 'Pembuatan akta wasiat', 'notaris'),
('Akta Cerai', 'Pembuatan akta perceraian', 'notaris');