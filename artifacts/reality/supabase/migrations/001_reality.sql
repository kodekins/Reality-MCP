create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  timezone text not null default 'UTC',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists cameras (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  name text not null,
  camera_type text not null check (camera_type in ('mobile', 'webcam', 'rtsp', 'onvif')),
  status text not null default 'offline',
  settings jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  camera_id uuid not null references cameras(id) on delete cascade,
  name text not null,
  zone_type text not null default 'desk',
  polygon_coordinates jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (camera_id, name)
);

create table if not exists world_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  camera_id uuid not null references cameras(id) on delete cascade,
  zone_id uuid not null references zones(id) on delete cascade,
  captured_at timestamptz not null,
  scene_summary text not null,
  state jsonb not null,
  snapshot_url text,
  created_at timestamptz not null default now()
);

create table if not exists detected_objects (
  id uuid primary key default gen_random_uuid(),
  world_state_id uuid not null references world_states(id) on delete cascade,
  raw_label text not null,
  normalized_label text not null,
  category text not null,
  object_count integer not null default 1,
  confidence numeric not null,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  camera_id uuid references cameras(id) on delete set null,
  zone_id uuid references zones(id) on delete set null,
  event_type text not null,
  object_label text,
  description text not null,
  severity text not null default 'info',
  previous_state jsonb,
  current_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  snapshot_before_url text,
  snapshot_after_url text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists watches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  condition jsonb not null default '{}'::jsonb,
  action jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists world_states_camera_captured_idx on world_states(camera_id, captured_at desc);
create index if not exists detected_objects_normalized_label_idx on detected_objects(normalized_label);
create index if not exists events_created_at_idx on events(created_at desc);
create index if not exists events_object_label_idx on events(object_label);
create index if not exists cameras_status_idx on cameras(status);

alter table organizations enable row level security;
alter table users enable row level security;
alter table locations enable row level security;
alter table cameras enable row level security;
alter table zones enable row level security;
alter table world_states enable row level security;
alter table detected_objects enable row level security;
alter table events enable row level security;
alter table watches enable row level security;

comment on table world_states is 'Structured Reality observations. Access through the server with a Supabase service-role key.';
