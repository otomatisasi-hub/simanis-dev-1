-- Create table for notary workflow steps tracking
CREATE TABLE IF NOT EXISTS public.notary_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_id, step_id)
);

-- Create table for notary document checklist tracking
CREATE TABLE IF NOT EXISTS public.notary_document_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  document_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Lainnya',
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_uploaded BOOLEAN NOT NULL DEFAULT false,
  file_url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_id, document_id)
);

-- Enable RLS
ALTER TABLE public.notary_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notary_document_checklist ENABLE ROW LEVEL SECURITY;

-- Create policies for notary_workflow_steps
CREATE POLICY "Authenticated users can view workflow steps"
  ON public.notary_workflow_steps
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage workflow steps"
  ON public.notary_workflow_steps
  FOR ALL
  USING (true);

-- Create policies for notary_document_checklist
CREATE POLICY "Authenticated users can view document checklist"
  ON public.notary_document_checklist
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage document checklist"
  ON public.notary_document_checklist
  FOR ALL
  USING (true);

-- Create trigger for updated_at on notary_workflow_steps
CREATE TRIGGER update_notary_workflow_steps_updated_at
  BEFORE UPDATE ON public.notary_workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on notary_document_checklist
CREATE TRIGGER update_notary_document_checklist_updated_at
  BEFORE UPDATE ON public.notary_document_checklist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_notary_workflow_steps_service_id ON public.notary_workflow_steps(service_id);
CREATE INDEX idx_notary_workflow_steps_status ON public.notary_workflow_steps(status);
CREATE INDEX idx_notary_document_checklist_service_id ON public.notary_document_checklist(service_id);
CREATE INDEX idx_notary_document_checklist_uploaded ON public.notary_document_checklist(is_uploaded);