-- Staff profiles (linked to Supabase Auth users)
create type staff_role as enum ('admin', 'staff');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role staff_role not null default 'staff',
  created_at timestamptz not null default now()
);

-- Companies
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration_number text,
  address text,
  contact_email text,
  contact_phone text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Verticals (categorization under a company, not plate-issuing)
create table verticals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

-- Vehicles (one plate per vehicle, plate number is permanent)
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  vertical_id uuid references verticals(id) on delete set null,
  plate_number text not null unique,
  make text,
  model text,
  year integer,
  color text,
  chassis_number text,
  vin text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- License periods (history table; one row per issuance/renewal cycle)
create table license_periods (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  issued_date date not null default current_date,
  receipt_reference text not null unique,
  is_initial_issuance boolean not null default false,
  issued_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  constraint period_end_after_start check (period_end > period_start)
);

create index idx_vehicles_company on vehicles(company_id);
create index idx_verticals_company on verticals(company_id);
create index idx_license_periods_vehicle on license_periods(vehicle_id);
create index idx_license_periods_end_date on license_periods(period_end);

-- Sequence-backed receipt numbering (atomic, no collisions)
create sequence receipt_number_seq start 1;

create or replace function next_receipt_reference()
returns text
language sql
set search_path = public
as $$
  select 'RCPT-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('receipt_number_seq')::text, 6, '0');
$$;

-- Enable RLS everywhere (internal staff-only access)
alter table profiles enable row level security;
alter table companies enable row level security;
alter table verticals enable row level security;
alter table vehicles enable row level security;
alter table license_periods enable row level security;

-- Any authenticated staff member can read/write; tighten to admin-only actions later if needed
create policy "staff full access - profiles select" on profiles for select using (auth.role() = 'authenticated');
create policy "staff full access - companies" on companies for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff full access - verticals" on verticals for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff full access - vehicles" on vehicles for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff full access - license_periods" on license_periods for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
