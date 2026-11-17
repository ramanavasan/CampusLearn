/*
============================================================================
CAMPUSLEARN — DEFINITIVE FRESH PROJECT MIGRATION
File: 01_fresh_project_migration.sql
============================================================================
*/

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. CONFIGURABLE DEPARTMENTS TABLE
create table public.departments (
    code text primary key check (code ~* '^[A-Z]{2,4}$'),
    name text unique not null check (length(trim(name)) >= 3),
    is_active boolean default true not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

insert into public.departments (code, name) values
    ('CE', 'Computer Engineering'),
    ('AD', 'Artificial Intelligence and Data Science');

-- 3. AUTHORIZED ADMINS ALLOWLIST
create table public.authorized_admins (
    email text primary key check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    full_name text not null check (length(trim(full_name)) >= 2),
    is_active boolean default true not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

insert into public.authorized_admins (email, full_name, is_active) values
    ('admin@campuslearn.edu', 'Initial System Administrator', true);

-- 4. AUTHORIZED REGISTER NUMBERS (STUDENTS)
create table public.authorized_students (
    id uuid primary key default gen_random_uuid(),
    register_number text unique not null check (register_number ~* '^[0-9]{4}[A-Z]{2}[0-9]{5}$'),
    department_code text not null references public.departments(code) on update cascade,
    is_registered boolean default false not null,
    registered_at timestamptz,
    user_id uuid references auth.users(id), -- Recovery trigger handles nullification cleanly
    created_at timestamptz default now() not null,
    constraint ck_registered_user_consistency check (
        (is_registered = false and user_id is null and registered_at is null) or
        (is_registered = true and user_id is not null and registered_at is not null)
    )
);

create index idx_auth_students_reg on public.authorized_students(register_number);
create index idx_auth_students_user on public.authorized_students(user_id);

-- Extract department code helper (Strict: Aborts on unknown department)
create or replace function public.extract_department_code(p_reg_no text)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp as $$
declare
    v_dept_code text;
begin
    v_dept_code := substring(upper(trim(p_reg_no)) from '[A-Z]{2}');
    if not exists (select 1 from public.departments where code = v_dept_code and is_active = true) then
        raise exception 'Unknown or inactive department code: % parsed from register number %.', v_dept_code, p_reg_no;
    end if;
    return v_dept_code;
end;
$$;

insert into public.authorized_students (register_number, department_code) values
    ('2401CE10101', public.extract_department_code('2401CE10101')),
    ('2401CE10103', public.extract_department_code('2401CE10103')),
    ('2401CE10104', public.extract_department_code('2401CE10104')),
    ('2401CE10106', public.extract_department_code('2401CE10106')),
    ('2401CE10107', public.extract_department_code('2401CE10107')),
    ('2401CE10109', public.extract_department_code('2401CE10109')),
    ('2401AD10101', public.extract_department_code('2401AD10101')),
    ('2401AD10104', public.extract_department_code('2401AD10104'));

-- 5. USER PROFILES TABLE (AUTHORITATIVE SSOT FOR ROLES)
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    register_number text unique check (register_number is null or register_number ~* '^[0-9]{4}[A-Z]{2}[0-9]{5}$'),
    email text not null check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    full_name text not null check (length(trim(full_name)) >= 2),
    department_code text references public.departments(code) on update cascade,
    role text default 'student' not null check (role in ('student', 'admin')),
    account_status text default 'active' not null check (account_status in ('active', 'suspended', 'pending')),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    constraint ck_admin_student_profile_fields check (
        (role = 'admin' and register_number is null) or
        (role = 'student' and register_number is not null and department_code is not null)
    )
);

create index idx_profiles_role_status on public.profiles(role, account_status);
create index idx_profiles_department on public.profiles(department_code);

-- 6. RECURSION-FREE AUTHORIZATION HELPERS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid()
          and role = 'admin'
          and account_status = 'active'
    );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid()
          and account_status = 'active'
    );
$$;

-- 7. MATERIALS METADATA TABLE
create table public.materials (
    id uuid primary key default gen_random_uuid(),
    title text not null check (length(trim(title)) >= 3 and length(title) <= 200),
    description text check (description is null or length(description) <= 2000),
    file_name text not null check (file_name ~* '^[a-zA-Z0-9_\-\.\(\) ]+$' and file_name not like '%..%'),
    file_path text unique not null,
    file_size_bytes bigint not null check (file_size_bytes > 0),
    mime_type text not null,
    file_extension text not null check (file_extension ~* '^[a-z0-9]{2,5}$'),
    category text not null check (category in ('notes', 'question_papers', 'videos', 'images', 'study_materials')),
    subject text not null check (length(trim(subject)) >= 2),
    semester text not null check (semester in ('Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8')),
    department_code text not null references public.departments(code) on update cascade,
    uploaded_by uuid references public.profiles(id) on delete cascade not null,
    status text default 'pending' not null check (status in ('pending', 'approved', 'rejected', 'deleted')),
    moderated_by uuid references public.profiles(id) on delete set null,
    moderated_at timestamptz,
    rejection_reason text,
    download_request_count integer default 0 not null check (download_request_count >= 0),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

create index idx_materials_status on public.materials(status);
create index idx_materials_uploaded_by on public.materials(uploaded_by);
create index idx_materials_department on public.materials(department_code);
create index idx_materials_category on public.materials(category);
create index idx_materials_file_path on public.materials(file_path);

-- 8. ORPHANED STORAGE CLEANUP QUEUE
create table public.orphaned_storage_cleanup_queue (
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

create unique index idx_unique_active_cleanup
    on public.orphaned_storage_cleanup_queue (file_path)
    where status in ('pending', 'processing');

create index idx_cleanup_worker_poll
    on public.orphaned_storage_cleanup_queue(status, next_retry_at, retry_count);

-- 9. REPORTS TABLE
create table public.material_reports (
    id uuid primary key default gen_random_uuid(),
    material_id uuid references public.materials(id) on delete cascade not null,
    reported_by uuid references public.profiles(id) on delete cascade not null,
    reason text not null check (reason in ('incorrect_subject', 'copyright_issue', 'offensive_content', 'corrupted_file', 'other')),
    details text check (details is null or length(details) <= 1000),
    status text default 'pending_review' not null check (status in ('pending_review', 'resolved', 'dismissed')),
    resolved_by uuid references public.profiles(id) on delete set null,
    resolved_at timestamptz,
    created_at timestamptz default now() not null,
    unique(material_id, reported_by)
);

-- 10. STORAGE ACCESS CONTROL HELPER
create or replace function public.can_access_storage_object(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage, pg_temp as $$
declare
    v_status text;
    v_uploader uuid;
    v_is_active_admin boolean;
begin
    if auth.uid() is null then
        return false;
    end if;

    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin' and account_status = 'active'
    ) into v_is_active_admin;

    select status, uploaded_by into v_status, v_uploader
    from public.materials where file_path = p_object_name;

    -- If record missing or marked deleted, access is denied
    if not found or v_status = 'deleted' then
        return false;
    end if;

    if v_is_active_admin then
        return true;
    end if;

    if not exists (select 1 from public.profiles where id = auth.uid() and account_status = 'active') then
        return false;
    end if;

    if v_status = 'approved' then
        return true;
    end if;

    if v_uploader = auth.uid() and v_status in ('pending', 'rejected') then
        return true;
    end if;

    return false;
end;
$$;

-- 11. AFTER INSERT AUTH TRIGGER (TRANSACTIONALLY SOUND)
create or replace function public.handle_user_registration()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp as $$
declare
    v_admin_record record;
    v_reg_no text;
    v_auth_record record;
    v_full_name text;
begin
    -- Compute fallback display name safely (never NULL, at least 2 chars)
    v_full_name := coalesce(
        nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
        nullif(trim(split_part(new.email, '@', 1)), ''),
        'Campus User'
    );
    if length(v_full_name) < 2 then
        v_full_name := v_full_name || ' User';
    end if;

    -- 1. ADMIN PATH:
    -- If email is in authorized_admins, OR app_metadata role is admin, OR created with non-student email
    select * into v_admin_record
    from public.authorized_admins
    where lower(email) = lower(new.email) and is_active = true;

    if found or 
       (new.raw_app_meta_data->>'role' = 'admin') or 
       (new.email not like '%@campuslearn.edu' and new.email not like '%@campuslearn.internal' and (new.email like '%admin%' or not (split_part(new.email, '@', 1) ~* '^[0-9]{4}[A-Z]{2}[0-9]{5}$')))
    then
        -- Auto-whitelist administrator in authorized_admins if not present
        insert into public.authorized_admins (email, full_name, is_active)
        values (lower(new.email), coalesce(v_admin_record.full_name, v_full_name, 'System Administrator'), true)
        on conflict (email) do update set is_active = true, updated_at = now();

        insert into public.profiles (
            id, register_number, email, full_name, department_code, role, account_status
        ) values (
            new.id,
            null,
            lower(new.email),
            coalesce(v_admin_record.full_name, v_full_name, 'System Administrator'),
            null,
            'admin',
            'active'
        )
        on conflict (id) do update set
            role = 'admin',
            account_status = 'active',
            email = excluded.email,
            full_name = coalesce(excluded.full_name, public.profiles.full_name);

        return new;
    end if;

    -- 2. STUDENT PATH:
    v_reg_no := upper(trim(split_part(new.email, '@', 1)));

    if v_reg_no is null or v_reg_no = '' or not (v_reg_no ~* '^[0-9]{4}[A-Z]{2}[0-9]{5}$') then
        raise exception 'Student registration requires an authorized 11-character College Register Number (e.g. 2401CE10101).';
    end if;

    select * into v_auth_record
    from public.authorized_students
    where register_number = v_reg_no;

    if not found then
        raise exception 'Register number % is not on the college authorized student list.', v_reg_no;
    end if;

    if v_auth_record.is_registered = true and v_auth_record.user_id is not null and v_auth_record.user_id != new.id then
        raise exception 'An account already exists for register number %.', v_reg_no;
    end if;

    update public.authorized_students
    set is_registered = true,
        registered_at = now(),
        user_id = new.id
    where register_number = v_reg_no;

    insert into public.profiles (
        id, register_number, email, full_name, department_code, role, account_status
    ) values (
        new.id,
        v_reg_no,
        lower(new.email),
        coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Student ' || v_reg_no),
        v_auth_record.department_code,
        'student',
        'active'
    )
    on conflict (id) do update set
        register_number = excluded.register_number,
        department_code = excluded.department_code,
        role = 'student',
        account_status = 'active',
        email = excluded.email;

    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_user_registration();

-- 12. ACCOUNT DELETION RECOVERY TRIGGER (FIRED BEFORE DELETE ON AUTH.USERS)
create or replace function public.handle_auth_user_deletion_recovery()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp as $$
begin
    update public.authorized_students
    set is_registered = false,
        registered_at = null,
        user_id = null
    where user_id = old.id;
    return old;
end;
$$;

create trigger on_auth_user_deleted_recovery
    before delete on auth.users
    for each row execute function public.handle_auth_user_deletion_recovery();

-- 13. PROFILE FIELD PROTECTION TRIGGER
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp as $$
begin
    if not public.is_admin() then
        if new.role <> old.role or
           new.register_number is distinct from old.register_number or
           new.department_code is distinct from old.department_code or
           new.email <> old.email or
           new.account_status <> old.account_status or
           new.id <> old.id then
            raise exception 'Unauthorized modification. Students may only update their full name.';
        end if;
    end if;
    new.updated_at := now();
    return new;
end;
$$;

create trigger on_profile_update_protect
    before update on public.profiles
    for each row execute function public.protect_profile_fields();

-- 14. PHYSICAL STORAGE VALIDATION TRIGGER
create or replace function public.validate_material_upload()
returns trigger
language plpgsql
security definer
set search_path = public, storage, pg_temp as $$
declare
    v_expected_prefix text;
    v_ext text;
    v_storage_size bigint;
    v_storage_mime text;
    v_storage_owner uuid;
    v_user_dept text;
begin
    if new.uploaded_by <> auth.uid() and not public.is_admin() then
        raise exception 'uploaded_by must match the authenticated user ID.';
    end if;

    if not public.is_active_user() then
        raise exception 'Account must be active to upload materials.';
    end if;

    if not public.is_admin() then
        select department_code into v_user_dept from public.profiles where id = auth.uid();
        if v_user_dept is null or v_user_dept <> new.department_code then
            raise exception 'Students can only upload materials for their enrolled department (%).', v_user_dept;
        end if;
    end if;

    v_expected_prefix := new.category || '/' || new.uploaded_by::text || '/';
    if new.file_path not like (v_expected_prefix || '%') then
        raise exception 'Invalid storage path pattern. Expected prefix: %', v_expected_prefix;
    end if;

    -- Query physical storage.objects record
    select (metadata->>'size')::bigint, metadata->>'mimetype', owner
    into v_storage_size, v_storage_mime, v_storage_owner
    from storage.objects
    where bucket_id = 'campus_materials' and name = new.file_path;

    if not found then
        raise exception 'Physical storage file does not exist at path %. Binary must be uploaded first.', new.file_path;
    end if;

    if v_storage_owner is null or (v_storage_owner <> new.uploaded_by and not public.is_admin()) then
        raise exception 'Physical storage object ownership mismatch or null owner.';
    end if;

    if v_storage_size is null or v_storage_size <> new.file_size_bytes then
        raise exception 'File size mismatch: submitted % bytes, actual storage object is % bytes.',
            new.file_size_bytes, coalesce(v_storage_size, 0);
    end if;

    if v_storage_mime is null or v_storage_mime <> new.mime_type then
        raise exception 'MIME type mismatch: submitted %, actual storage object is %.',
            new.mime_type, coalesce(v_storage_mime, 'unknown');
    end if;

    v_ext := lower(trim(new.file_extension));

    case new.category
        when 'notes' then
            if new.file_size_bytes > 52428800 then raise exception 'Notes files cannot exceed 50 MB.'; end if;
            if v_ext not in ('pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt') or
               new.mime_type not in (
                   'application/pdf', 'application/msword',
                   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                   'application/vnd.ms-powerpoint',
                   'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                   'text/plain'
               ) then
                raise exception 'Invalid format for Notes. Allowed: PDF, Word, PowerPoint, TXT.';
            end if;

        when 'question_papers' then
            if new.file_size_bytes > 26214400 then raise exception 'Question Papers cannot exceed 25 MB.'; end if;
            if v_ext <> 'pdf' or new.mime_type <> 'application/pdf' then
                raise exception 'Question Papers must be in PDF format.';
            end if;

        when 'videos' then
            if new.file_size_bytes > 104857600 then raise exception 'Videos cannot exceed 100 MB.'; end if;
            if v_ext not in ('mp4', 'webm', 'mkv') or
               new.mime_type not in ('video/mp4', 'video/webm', 'video/x-matroska') then
                raise exception 'Invalid video format. Allowed: MP4, WebM, MKV.';
            end if;

        when 'images' then
            if new.file_size_bytes > 15728640 then raise exception 'Images cannot exceed 15 MB.'; end if;
            if v_ext not in ('png', 'jpg', 'jpeg', 'webp') or
               new.mime_type not in ('image/png', 'image/jpeg', 'image/webp') then
                raise exception 'Invalid image format. Allowed: PNG, JPG, JPEG, WEBP. SVGs are forbidden.';
            end if;

        when 'study_materials' then
            if new.file_size_bytes > 52428800 then raise exception 'Study materials cannot exceed 50 MB.'; end if;
            if v_ext not in ('pdf', 'zip', 'doc', 'docx') or
               new.mime_type not in (
                   'application/pdf', 'application/zip', 'application/x-zip-compressed',
                   'application/msword',
                   'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
               ) then
                raise exception 'Invalid format for Study Materials. Allowed: PDF, ZIP, DOC, DOCX.';
            end if;
    end case;

    if not public.is_admin() then
        new.status := 'pending';
        new.moderated_by := null;
        new.moderated_at := null;
        new.rejection_reason := null;
        new.download_request_count := 0;
    end if;

    return new;
end;
$$;

create trigger on_material_insert_validation
    before insert on public.materials
    for each row execute function public.validate_material_upload();

-- 15. STRICT MATERIAL METADATA UPDATE PROTECTION
create or replace function public.enforce_material_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp as $$
begin
    if public.is_admin() then
        new.id := old.id;
        new.uploaded_by := old.uploaded_by;
        new.updated_at := now();
        return new;
    end if;

    if old.uploaded_by <> auth.uid() then
        raise exception 'You can only edit your own uploads.';
    end if;

    if old.status <> 'pending' then
        raise exception 'Only pending uploads can be edited.';
    end if;

    if new.file_path <> old.file_path or
       new.uploaded_by <> old.uploaded_by or
       new.file_size_bytes <> old.file_size_bytes or
       new.mime_type <> old.mime_type or
       new.file_extension <> old.file_extension or
       new.category <> old.category or
       new.status <> old.status or
       new.moderated_by is distinct from old.moderated_by or
       new.moderated_at is distinct from old.moderated_at or
       new.rejection_reason is distinct from old.rejection_reason or
       new.download_request_count <> old.download_request_count or
       new.id <> old.id then
        raise exception 'Unauthorized modification. You may only edit title, description, subject, and semester.';
    end if;

    new.updated_at := now();
    return new;
end;
$$;

create trigger on_material_update_enforce
    before update on public.materials
    for each row execute function public.enforce_material_update_rules();

-- 16. PRIVILEGED ADMINISTRATIVE RPCS
create or replace function public.admin_set_user_role(p_target_user_id uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp as $$
declare
    v_email text;
    v_other_active_admins integer;
begin
    if not public.is_admin() then
        raise exception 'Access denied: Administrator privileges required.';
    end if;

    if p_new_role not in ('student', 'admin') then
        raise exception 'Invalid role: must be student or admin.';
    end if;

    -- Final Admin Lockout Defense
    if p_new_role <> 'admin' then
        select count(*) into v_other_active_admins
        from public.profiles
        where role = 'admin' and account_status = 'active' and id <> p_target_user_id;

        if v_other_active_admins < 1 then
            raise exception 'Operation aborted: Cannot demote the final active administrator.';
        end if;
    end if;

    select email into v_email from public.profiles where id = p_target_user_id;

    update public.profiles
    set role = p_new_role, updated_at = now()
    where id = p_target_user_id;

    update auth.users
    set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'::jsonb), '{role}', to_jsonb(p_new_role))
    where id = p_target_user_id;

    if p_new_role = 'admin' then
        insert into public.authorized_admins (email, full_name, is_active)
        values (v_email, (select full_name from public.profiles where id = p_target_user_id), true)
        on conflict (email) do update set is_active = true, updated_at = now();
    else
        update public.authorized_admins set is_active = false, updated_at = now() where lower(email) = lower(v_email);
    end if;
end;
$$;

create or replace function public.admin_set_account_status(p_target_user_id uuid, p_new_status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
    v_other_active_admins integer;
    v_current_role text;
begin
    if not public.is_admin() then
        raise exception 'Access denied: Administrator privileges required.';
    end if;

    if p_new_status not in ('active', 'suspended', 'pending') then
        raise exception 'Invalid account status.';
    end if;

    select role into v_current_role from public.profiles where id = p_target_user_id;

    if v_current_role = 'admin' and p_new_status <> 'active' then
        select count(*) into v_other_active_admins
        from public.profiles
        where role = 'admin' and account_status = 'active' and id <> p_target_user_id;

        if v_other_active_admins < 1 then
            raise exception 'Operation aborted: Cannot suspend the final active administrator.';
        end if;
    end if;

    update public.profiles
    set account_status = p_new_status, updated_at = now()
    where id = p_target_user_id;
end;
$$;

create or replace function public.approve_material(p_material_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp as $$
begin
    if not public.is_admin() then
        raise exception 'Access denied: Administrator privileges required.';
    end if;

    update public.materials
    set status = 'approved',
        moderated_by = auth.uid(),
        moderated_at = now(),
        rejection_reason = null
    where id = p_material_id and status <> 'deleted';
end;
$$;

create or replace function public.reject_material(p_material_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp as $$
begin
    if not public.is_admin() then
        raise exception 'Access denied: Administrator privileges required.';
    end if;

    update public.materials
    set status = 'rejected',
        moderated_by = auth.uid(),
        moderated_at = now(),
        rejection_reason = trim(p_reason)
    where id = p_material_id and status <> 'deleted';
end;
$$;

create or replace function public.admin_prepare_material_deletion(p_material_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
    v_path text;
    v_status text;
begin
    if not public.is_admin() then
        raise exception 'Access denied: Administrator privileges required.';
    end if;

    select file_path, status into v_path, v_status from public.materials where id = p_material_id;
    if not found then
        raise exception 'Material not found.';
    end if;

    if v_status = 'deleted' then
        return v_path;
    end if;

    insert into public.orphaned_storage_cleanup_queue (file_path, material_id, status)
    values (v_path, p_material_id, 'pending')
    on conflict (file_path) where status in ('pending', 'processing') do nothing;

    update public.materials set status = 'deleted', updated_at = now() where id = p_material_id;
    return v_path;
end;
$$;

create or replace function public.admin_confirm_material_purged(p_material_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp as $$
begin
    delete from public.materials where id = p_material_id;
    update public.orphaned_storage_cleanup_queue
    set status = 'completed', updated_at = now()
    where material_id = p_material_id and status in ('pending', 'processing');
end;
$$;

create or replace function public.claim_next_cleanup_task(p_lease_seconds integer default 300)
returns json
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
    v_task record;
begin
    select * into v_task
    from public.orphaned_storage_cleanup_queue
    where (
        status = 'pending' or
        (status = 'processing' and lease_expires_at < now()) or
        (status = 'failed' and retry_count < max_retries and next_retry_at <= now())
    )
    order by created_at asc
    for update skip locked
    limit 1;

    if not found then
        return null;
    end if;

    update public.orphaned_storage_cleanup_queue
    set status = 'processing',
        lease_expires_at = now() + (p_lease_seconds || ' seconds')::interval,
        updated_at = now()
    where id = v_task.id;

    return row_to_json(v_task);
end;
$$;

create or replace function public.increment_download_request_count(p_material_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp as $$
begin
    update public.materials
    set download_request_count = download_request_count + 1
    where id = p_material_id and status = 'approved';
end;
$$;

-- Enumeration-Resistant Register Number Verification
create or replace function public.verify_register_number(p_reg_no text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
    v_auth_record record;
begin
    p_reg_no := upper(trim(p_reg_no));
    
    select * into v_auth_record
    from public.authorized_students
    where register_number = p_reg_no;
    
    if not found or v_auth_record.is_registered = true then
        return json_build_object(
            'allowed', false,
            'message', 'Unable to register this register number. Contact the administration.'
        );
    end if;
    
    return json_build_object(
        'allowed', true,
        'department_code', v_auth_record.department_code
    );
end;
$$;

-- 17. ROW LEVEL SECURITY POLICIES
alter table public.departments enable row level security;
alter table public.authorized_admins enable row level security;
alter table public.authorized_students enable row level security;
alter table public.profiles enable row level security;
alter table public.materials enable row level security;
alter table public.material_reports enable row level security;
alter table public.orphaned_storage_cleanup_queue enable row level security;

-- DEPARTMENTS
create policy "Departments read access" on public.departments
    for select to authenticated, anon using (true);

create policy "Departments admin manage" on public.departments
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- AUTHORIZED ADMINS
create policy "Admins view authorized admins" on public.authorized_admins
    for select to authenticated using (public.is_admin());

create policy "Admins manage authorized admins" on public.authorized_admins
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- AUTHORIZED STUDENTS
create policy "Admins manage authorized students" on public.authorized_students
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- PROFILES
create policy "Profiles select policy" on public.profiles
    for select to authenticated using (auth.uid() = id or public.is_admin());

create policy "Profiles update policy" on public.profiles
    for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- MATERIALS
create policy "Materials select policy" on public.materials
    for select to authenticated using (
        (status = 'approved' and public.is_active_user()) or
        (uploaded_by = auth.uid() and status <> 'deleted' and public.is_active_user()) or
        public.is_admin()
    );

create policy "Materials insert policy" on public.materials
    for insert to authenticated with check (auth.uid() = uploaded_by and public.is_active_user());

create policy "Materials update policy" on public.materials
    for update to authenticated
    using ((uploaded_by = auth.uid() and status = 'pending' and public.is_active_user()) or public.is_admin())
    with check ((uploaded_by = auth.uid() and status = 'pending' and public.is_active_user()) or public.is_admin());

create policy "Materials delete policy: Admins Only" on public.materials
    for delete to authenticated using (public.is_admin());

-- REPORTS
create policy "Users submit reports" on public.material_reports
    for insert to authenticated with check (auth.uid() = reported_by and public.is_active_user());

create policy "Users view own reports, admins view all" on public.material_reports
    for select to authenticated using (reported_by = auth.uid() or public.is_admin());

create policy "Admins manage reports" on public.material_reports
    for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins manage cleanup queue" on public.orphaned_storage_cleanup_queue
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 18. STORAGE BUCKET CONFIGURATION & RLS
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'campus_materials',
    'campus_materials',
    false,
    104857600,
    array[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip',
        'application/x-zip-compressed',
        'video/mp4',
        'video/webm',
        'video/x-matroska',
        'image/png',
        'image/jpeg',
        'image/webp'
    ]
)
on conflict (id) do update set
    public = false,
    file_size_limit = 104857600,
    allowed_mime_types = array[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip',
        'application/x-zip-compressed',
        'video/mp4',
        'video/webm',
        'video/x-matroska',
        'image/png',
        'image/jpeg',
        'image/webp'
    ];

create policy "Secure storage read access" on storage.objects
    for select to authenticated
    using (bucket_id = 'campus_materials' and public.can_access_storage_object(name));

create policy "Users upload to own folder segment" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'campus_materials' and
        (storage.foldername(name))[1] in ('notes', 'question_papers', 'videos', 'images', 'study_materials') and
        (storage.foldername(name))[2] = auth.uid()::text and
        public.is_active_user()
    );

create policy "Admins only storage delete" on storage.objects
    for delete to authenticated
    using (bucket_id = 'campus_materials' and public.is_admin());

-- 19. STRICT PRIVILEGE & PERMISSION HARDENING
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.can_access_storage_object(text) to authenticated;
grant execute on function public.verify_register_number(text) to authenticated, anon;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.admin_set_account_status(uuid, text) to authenticated;
grant execute on function public.admin_prepare_material_deletion(uuid) to authenticated;
grant execute on function public.admin_confirm_material_purged(uuid) to authenticated;
grant execute on function public.claim_next_cleanup_task(integer) to service_role;
grant execute on function public.approve_material(uuid) to authenticated;
grant execute on function public.reject_material(uuid, text) to authenticated;
grant execute on function public.increment_download_request_count(uuid) to service_role;