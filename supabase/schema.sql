create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  email text not null unique check (email = lower(email) and char_length(email) between 3 and 254),
  password text,
  color text not null default '#6c63ff',
  bio text not null default '',
  online boolean not null default false,
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  push_sub jsonb default null,
  last_seen timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  sender_id uuid references users(id) on delete cascade,
  sender_name text,
  sender_color text,
  text text not null default '',
  type text not null default 'text',
  file_url text,
  file_name text,
  file_size bigint,
  reactions jsonb not null default '{}'::jsonb,
  delivered_at timestamptz,
  read_by uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table messages add column if not exists delivered_at timestamptz;
alter table messages add column if not exists read_by uuid[] not null default '{}';

create index if not exists idx_messages_room_id on messages(room_id);

create table if not exists dms (
  id uuid primary key default gen_random_uuid(),
  members uuid[] not null default '{}',
  room_id text not null unique,
  last_msg text not null default '',
  last_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cliques (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '??',
  color text not null default '#6c63ff',
  members uuid[] not null default '{}',
  created_by uuid references users(id) on delete set null,
  last_msg text not null default '',
  last_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists homework (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  course_id uuid,
  title text not null,
  subject text not null default '',
  due_date timestamptz,
  priority text not null default 'medium',
  done boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table homework add column if not exists course_id uuid;

create table if not exists pomodoros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  sessions_today integer not null default 0,
  total_sessions integer not null default 0,
  date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_pomodoros_user_date on pomodoros(user_id, date);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  code text not null default '',
  description text not null default '',
  owner_id uuid not null references users(id) on delete cascade,
  members uuid[] not null default '{}',
  room_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_courses_members on courses using gin (members);

alter table homework
  drop constraint if exists homework_course_id_fkey,
  add constraint homework_course_id_fkey foreign key (course_id) references courses(id) on delete cascade;

create table if not exists course_notes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  content text not null check (char_length(trim(content)) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_notes_course_id on course_notes(course_id);

create table if not exists course_files (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  uploaded_by uuid not null references users(id) on delete cascade,
  name text not null,
  storage_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  size bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_files_course_id on course_files(course_id);
create table if not exists course_file_folders (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_by uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(course_id, name)
);
alter table course_files add column if not exists folder_id uuid references course_file_folders(id) on delete set null;
create index if not exists idx_course_file_folders_course_id on course_file_folders(course_id);
create index if not exists idx_course_files_folder_id on course_files(folder_id);
insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', false)
on conflict (id) do nothing;

-- The backend uses the Supabase service-role key, so direct public API access
-- must be denied. Service-role requests continue to work because they bypass RLS.
alter table users enable row level security;
alter table messages enable row level security;
alter table dms enable row level security;
alter table cliques enable row level security;
alter table homework enable row level security;
alter table pomodoros enable row level security;
alter table courses enable row level security;
alter table course_notes enable row level security;
alter table course_files enable row level security;
alter table course_file_folders enable row level security;
alter table users alter column password drop not null;
