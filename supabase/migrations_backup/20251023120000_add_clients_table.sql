-- Migration: add clients table
-- Generated: 2025-10-23

-- Create clients table
create table public.clients (
  id uuid not null default gen_random_uuid (),
  client_type text not null,
  full_name text not null,
  nik text null,
  npwp text null,
  email text null,
  phone text null,
  address text null,
  company_name text null,
  company_npwp text null,
  company_address text null,
  company_phone text null,
  ktp_url text null,
  npwp_url text null,
  kk_url text null,
  marriage_certificate_url text null,
  corporate_documents_url text[] null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid not null,
  company_founding_date date null,
  company_registration_number text null,
  company_sk_kemenkumham text null,
  company_nib text null,
  director_ktp text null,
  director_npwp text null,
  commissioner_details jsonb null,
  rups_approval_details jsonb null,
  constraint clients_pkey primary key (id),
  constraint clients_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint clients_client_type_check check (
    (
      client_type = any (array['individual'::text, 'corporate'::text])
    )
  )
) TABLESPACE pg_default;

-- Ensure trigger function exists (repository already has this function in prior migrations)
-- Create trigger to update updated_at on row update
create trigger update_clients_updated_at BEFORE
  update on clients for EACH row
  execute FUNCTION update_updated_at_column();
