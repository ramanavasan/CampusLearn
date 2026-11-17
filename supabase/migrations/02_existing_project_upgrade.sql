-- ============================================================================
-- CAMPUSLEARN — EXISTING PROJECT UPGRADE & RECONCILIATION
-- File: 02_existing_project_upgrade.sql
-- ============================================================================

-- Step 1: Pre-Migration Health Check & Validation Query
do $$
begin
    if not exists (select 1 from pg_namespace where nspname = 'storage') then
        raise exception 'Pre-check failed: storage schema is not present. Enable Supabase Storage first.';
    end if;
    if not exists (select 1 from pg_namespace where nspname = 'auth') then
        raise exception 'Pre-check failed: auth schema is not present.';
    end if;
end $$;

-- Step 2: Non-Destructive Data Snapshot into Isolated Schema
create schema if not exists _campuslearn_pre_upgrade_backup;

do $$
begin
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name='departments') then
        create table if not exists _campuslearn_pre_upgrade_backup.departments as select * from public.departments;
    end if;
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name='authorized_admins') then
        create table if not exists _campuslearn_pre_upgrade_backup.authorized_admins as select * from public.authorized_admins;
    end if;
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name='authorized_students') then
        create table if not exists _campuslearn_pre_upgrade_backup.authorized_students as select * from public.authorized_students;
    end if;
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles') then
        create table if not exists _campuslearn_pre_upgrade_backup.profiles as select * from public.profiles;
    end if;
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name='materials') then
        create table if not exists _campuslearn_pre_upgrade_backup.materials as select * from public.materials;
    end if;
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name='material_reports') then
        create table if not exists _campuslearn_pre_upgrade_backup.material_reports as select * from public.material_reports;
    end if;
end $$;

-- Step 3: Dynamically Strip All Existing/Obsolete Policies in Public & Storage
do $$
declare
    r record;
begin
    for r in (
        select schemaname, tablename, policyname
        from pg_policies
        where (schemaname = 'public' and tablename in ('departments', 'authorized_admins', 'authorized_students', 'profiles', 'materials', 'material_reports', 'orphaned_storage_cleanup_queue'))
           or (schemaname = 'storage' and tablename = 'objects')
    ) loop
        execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    end loop;
end $$;

-- Step 4: Drop Deprecated Triggers
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_deleted_recovery on auth.users;
drop trigger if exists on_profile_update_protect on public.profiles;
drop trigger if exists on_profile_deleted_recovery on public.profiles;
drop trigger if exists on_material_insert_validation on public.materials;
drop trigger if exists on_material_update_enforce on public.materials;
drop trigger if exists on_material_deleted_cleanup_storage on public.materials;

-- Step 5: Table and Column Reconciliation
do $$
begin
    -- 1. Departments reconciliation
    create table if not exists public.departments (
        code text primary key check (code ~* '^[A-Z]{2,4}$'),
        name text unique not null,
        is_active boolean default true not null,
        created_at timestamptz default now() not null,
        updated_at timestamptz default now() not null
    );

    -- 2. Profiles reconciliation
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='account_status') then
        alter table public.profiles add column account_status text default 'active' not null check (account_status in ('active', 'suspended', 'pending'));
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='department_code') then
        alter table public.profiles add column department_code text references public.departments(code) on update cascade;
    end if;

    -- 3. Materials reconciliation
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='materials' and column_name='download_request_count') then
        if exists (select 1 from information_schema.columns where table_schema='public' and table_name='materials' and column_name='download_count') then
            alter table public.materials rename column download_count to download_request_count;
        else
            alter table public.materials add column download_request_count integer default 0 not null check (download_request_count >= 0);
        end if;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='materials' and column_name='department_code') then
        alter table public.materials add column department_code text references public.departments(code) on update cascade;
    end if;

    -- 4. Cleanup Queue reconciliation
    create table if not exists public.orphaned_storage_cleanup_queue (
        id uuid primary key default gen_random_uuid(),
        file_path text not null,
        material_id uuid,
        status text default 'pending' not null check (status in ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
        retry_count integer default 0 not null,
        max_retries integer default 5 not null,
        lease_expires_at timestamptz,
        last_error text,
        next_retry_at timestamptz default now() not null,
        created_at timestamptz default now() not null,
        updated_at timestamptz default now() not null
    );

    drop index if exists public.idx_unique_active_cleanup;
    create unique index idx_unique_active_cleanup
        on public.orphaned_storage_cleanup_queue (file_path)
        where status in ('pending', 'processing');
end $$;

-- Step 6: Post-Reconciliation
-- Now execute Section 1 (01_fresh_project_migration.sql) from Step 6 onward to rebuild functions, triggers, bucket settings, and policies cleanly.