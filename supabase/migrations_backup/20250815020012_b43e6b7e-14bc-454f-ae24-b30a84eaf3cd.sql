-- Add tables for the notary system workflow

-- Create documents table for tracking required/received documents
CREATE TABLE public.service_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('required', 'received', 'missing')),
  file_url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deed drafts table for managing draft documents
CREATE TABLE public.deed_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  deed_number TEXT,
  draft_content TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'signed')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  signature_scheduled_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service timeline/history table for tracking all activities
CREATE TABLE public.service_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create legality verification table
CREATE TABLE public.legality_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('legal_basis', 'deed_number', 'digital_archive')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  details TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add more specific columns to services table
ALTER TABLE public.services 
ADD COLUMN priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN estimated_completion_date DATE,
ADD COLUMN actual_completion_date DATE,
ADD COLUMN fee_amount DECIMAL(12,2),
ADD COLUMN fee_status TEXT DEFAULT 'unpaid' CHECK (fee_status IN ('unpaid', 'partial', 'paid')),
ADD COLUMN document_checklist_complete BOOLEAN DEFAULT false,
ADD COLUMN legality_verified BOOLEAN DEFAULT false;

-- Enable RLS for new tables
ALTER TABLE public.service_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deed_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legality_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_documents
CREATE POLICY "Authenticated users can view service documents" 
ON public.service_documents 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can manage service documents" 
ON public.service_documents 
FOR ALL 
TO authenticated 
USING (true);

-- RLS Policies for deed_drafts
CREATE POLICY "Authenticated users can view deed drafts" 
ON public.deed_drafts 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can manage deed drafts" 
ON public.deed_drafts 
FOR ALL 
TO authenticated 
USING (true);

-- RLS Policies for service_timeline
CREATE POLICY "Authenticated users can view service timeline" 
ON public.service_timeline 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create timeline entries" 
ON public.service_timeline 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = performed_by);

-- RLS Policies for legality_verifications
CREATE POLICY "Authenticated users can view legality verifications" 
ON public.legality_verifications 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can manage legality verifications" 
ON public.legality_verifications 
FOR ALL 
TO authenticated 
USING (true);

-- Create triggers for timestamp updates
CREATE TRIGGER update_deed_drafts_updated_at
  BEFORE UPDATE ON public.deed_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically log service changes
CREATE OR REPLACE FUNCTION public.log_service_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status != NEW.status THEN
      INSERT INTO public.service_timeline (service_id, action_type, description, performed_by)
      VALUES (NEW.id, 'status_change', 
              'Status changed from ' || OLD.status || ' to ' || NEW.status,
              auth.uid());
    END IF;
    
    -- Log assignment changes
    IF COALESCE(OLD.assigned_to::text, '') != COALESCE(NEW.assigned_to::text, '') THEN
      INSERT INTO public.service_timeline (service_id, action_type, description, performed_by)
      VALUES (NEW.id, 'assignment_change', 
              'Service assigned to new staff member',
              auth.uid());
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- Log service creation
    INSERT INTO public.service_timeline (service_id, action_type, description, performed_by)
    VALUES (NEW.id, 'service_created', 
            'Service created: ' || NEW.title,
            auth.uid());
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for service change logging
CREATE TRIGGER log_service_changes
  AFTER INSERT OR UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.log_service_change();