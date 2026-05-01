-- Supabase Schema for CBT112JKT PWA

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES

-- Users Profiles Table (Extends Supabase Auth Auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('admin', 'guru', 'pengawas', 'siswa')),
  username text unique not null,
  nama_lengkap text not null,
  nip text unique,
  is_wali_kelas boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Master Data Tables
create table public.master_level (
  id uuid default uuid_generate_v4() primary key,
  nama_level text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.master_kelas (
  id uuid default uuid_generate_v4() primary key,
  nama_kelas text not null,
  level_id uuid references public.master_level on delete cascade,
  wali_kelas_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.master_ruangan (
  id uuid default uuid_generate_v4() primary key,
  nama_ruangan text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.master_sesi (
  id uuid default uuid_generate_v4() primary key,
  nama_sesi text not null,
  waktu_mulai time not null,
  waktu_selesai time not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.master_server (
  id uuid default uuid_generate_v4() primary key,
  nama_server text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.master_mapel (
  id uuid default uuid_generate_v4() primary key,
  nama_mapel text not null,
  kode_mapel text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.master_jenis_ujian (
  id uuid default uuid_generate_v4() primary key,
  nama_ujian text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Peserta Ujian (Siswa Details)
create table public.peserta_ujian (
  id uuid references public.profiles(id) on delete cascade primary key,
  nomor_peserta text unique not null,
  foto_url text,
  agama text,
  kelas_id uuid references public.master_kelas on delete set null,
  ruangan_id uuid references public.master_ruangan on delete set null,
  sesi_id uuid references public.master_sesi on delete set null,
  server_id uuid references public.master_server on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bank Soal
create table public.bank_soal (
  id uuid default uuid_generate_v4() primary key,
  kode_bank_soal text not null unique,
  mapel_id uuid references public.master_mapel on delete cascade,
  level_id uuid references public.master_level on delete restrict,
  kelas_id uuid references public.master_kelas on delete restrict,
  guru_id uuid references public.profiles(id) on delete restrict,
  kkm integer default 0,
  tipe text check (tipe in ('agama', 'non-agama')) default 'non-agama',
  status text check (status in ('draft', 'aktif', 'arsip')) default 'draft',
  pg_jumlah integer default 0,
  pg_bobot integer default 0,
  essay_jumlah integer default 0,
  essay_bobot integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Soal (Terkait dengan Bank Soal)
create table public.soal (
  id uuid default uuid_generate_v4() primary key,
  bank_soal_id uuid references public.bank_soal on delete cascade,
  tipe_soal text check (tipe_soal in ('pg', 'essay')) not null,
  pertanyaan text not null,
  opsi_a text,
  opsi_b text,
  opsi_c text,
  opsi_d text,
  opsi_e text,
  kunci_jawaban text, -- Untuk PG: A, B, C, D, atau E.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Jadwal Ujian
create table public.jadwal_ujian (
  id uuid default uuid_generate_v4() primary key,
  nama_ujian text not null,
  jenis_ujian_id uuid references public.master_jenis_ujian on delete restrict,
  bank_soal_id uuid references public.bank_soal on delete restrict,
  tanggal date not null,
  waktu_mulai timestamp with time zone not null,
  waktu_selesai timestamp with time zone not null,
  durasi_menit integer not null,
  sesi_id uuid references public.master_sesi on delete restrict,
  status_ujian text check (status_ujian in ('menunggu', 'aktif', 'selesai')) default 'menunggu',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ujian Aktif (Jawaban & Sesi Siswa)
create table public.ujian_aktif (
  id uuid default uuid_generate_v4() primary key,
  jadwal_ujian_id uuid references public.jadwal_ujian on delete cascade,
  siswa_id uuid references public.profiles(id) on delete cascade,
  waktu_mulai_ujian timestamp with time zone default timezone('utc'::text, now()),
  waktu_selesai_ujian timestamp with time zone,
  jawaban_pg jsonb default '{}'::jsonb, -- format: { "soal_id": "jawaban" }
  jawaban_essay jsonb default '{}'::jsonb,
  status text check (status in ('belum_mulai', 'sedang_ujian', 'selesai')) default 'belum_mulai',
  peringatan_nyontek integer default 0,
  is_blocked boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (jadwal_ujian_id, siswa_id)
);

-- Hasil Nilai
create table public.hasil_nilai (
  id uuid default uuid_generate_v4() primary key,
  jadwal_ujian_id uuid references public.jadwal_ujian on delete cascade,
  siswa_id uuid references public.profiles(id) on delete cascade,
  pg_benar integer default 0,
  pg_salah integer default 0,
  pg_kosong integer default 0,
  nilai_pg numeric(5,2) default 0,
  nilai_essay numeric(5,2) default 0,
  nilai_total numeric(5,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (jadwal_ujian_id, siswa_id)
);

-- 3. RLS (Row Level Security) POLICIES
alter table public.profiles enable row level security;
alter table public.master_level enable row level security;
alter table public.master_kelas enable row level security;
alter table public.master_ruangan enable row level security;
alter table public.master_sesi enable row level security;
alter table public.master_server enable row level security;
alter table public.master_mapel enable row level security;
alter table public.master_jenis_ujian enable row level security;
alter table public.peserta_ujian enable row level security;
alter table public.bank_soal enable row level security;
alter table public.soal enable row level security;
alter table public.jadwal_ujian enable row level security;
alter table public.ujian_aktif enable row level security;
alter table public.hasil_nilai enable row level security;

-- Policies for Profiles (Anyone can view profiles for relational data, but only update their own)
create policy "Public or Auth profiles are viewable by everyone in school" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- (For production, you'd limit these with functions checking role='admin', but for rapid dev we'll allow authenticated users to view)
create policy "Master data viewable by all authenticated" on public.master_level for select using (auth.role() = 'authenticated');
create policy "Master data viewable by all authenticated" on public.master_kelas for select using (auth.role() = 'authenticated');
create policy "Master data viewable by all authenticated" on public.master_ruangan for select using (auth.role() = 'authenticated');
create policy "Master data viewable by all authenticated" on public.master_sesi for select using (auth.role() = 'authenticated');
create policy "Master data viewable by all authenticated" on public.master_server for select using (auth.role() = 'authenticated');
create policy "Master data viewable by all authenticated" on public.master_mapel for select using (auth.role() = 'authenticated');
create policy "Master data viewable by all authenticated" on public.master_jenis_ujian for select using (auth.role() = 'authenticated');
create policy "Peserta viewable by all authenticated" on public.peserta_ujian for select using (auth.role() = 'authenticated');
create policy "Bank soal viewable by all authenticated" on public.bank_soal for select using (auth.role() = 'authenticated');
create policy "Soal viewable by all authenticated" on public.soal for select using (auth.role() = 'authenticated');
create policy "Jadwal viewable by all authenticated" on public.jadwal_ujian for select using (auth.role() = 'authenticated');

-- Ujian Aktif (Siswa update their own, admin/pengawas can view all)
create policy "Siswa can update their own answers" on public.ujian_aktif for all using (auth.uid() = siswa_id);
create policy "Admin can see all ujian aktif" on public.ujian_aktif for select using (auth.role() = 'authenticated');

-- Hasil Nilai
create policy "Hasil nilai viewable by all authenticated" on public.hasil_nilai for select using (auth.role() = 'authenticated');

-- 4. REALTIME SETUP
alter publication supabase_realtime add table public.ujian_aktif;
alter publication supabase_realtime add table public.jadwal_ujian;
alter publication supabase_realtime add table public.hasil_nilai;
