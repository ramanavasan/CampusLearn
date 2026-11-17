/*
============================================================================
CAMPUSLEARN MIGRATION: 04_materials_instant_download_and_permissions.sql
1. Auto-approve uploaded PDF & image materials so everybody can download them immediately.
2. Allow everyone (students, admins, visitors) to view and download approved materials.
3. Only admins can delete materials.
============================================================================
*/

-- A. Update Materials Select Policy (Everyone can view approved materials)
drop policy if exists "Materials select policy" on public.materials;
create policy "Materials select policy" on public.materials
    for select to authenticated, anon using (
        status = 'approved' or
        (auth.uid() is not null and uploaded_by = auth.uid() and status <> 'deleted') or
        public.is_admin()
    );

-- B. Update Storage Helper so everybody can download approved materials
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
    select status, uploaded_by into v_status, v_uploader
    from public.materials where file_path = p_object_name;

    -- If record missing or marked deleted, access is denied
    if not found or v_status = 'deleted' then
        return false;
    end if;

    -- Approved materials can be downloaded by everyone
    if v_status = 'approved' then
        return true;
    end if;

    if auth.uid() is null then
        return false;
    end if;

    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin' and account_status = 'active'
    ) into v_is_active_admin;

    if v_is_active_admin then
        return true;
    end if;

    if v_uploader = auth.uid() and v_status in ('pending', 'rejected') then
        return true;
    end if;

    return false;
end;
$$;

-- C. Update Storage Read Policy
drop policy if exists "Secure storage read access" on storage.objects;
create policy "Secure storage read access" on storage.objects
    for select to authenticated, anon
    using (bucket_id = 'campus_materials' and public.can_access_storage_object(name));

-- D. Auto-approve student uploads so they are immediately downloadable
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
        if v_user_dept is not null and new.department_code is null then
            new.department_code := v_user_dept;
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

    v_ext := lower(trim(new.file_extension));

    case new.category
        when 'notes' then
            if new.file_size_bytes > 52428800 then raise exception 'Notes files cannot exceed 50 MB.'; end if;
            if v_ext not in ('pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt') then
                raise exception 'Invalid format for Notes. Allowed: PDF, Word, PowerPoint, TXT.';
            end if;

        when 'question_papers' then
            if new.file_size_bytes > 26214400 then raise exception 'Question Papers cannot exceed 25 MB.'; end if;
            if v_ext <> 'pdf' then
                raise exception 'Question Papers must be in PDF format.';
            end if;

        when 'videos' then
            if new.file_size_bytes > 104857600 then raise exception 'Videos cannot exceed 100 MB.'; end if;
            if v_ext not in ('mp4', 'webm', 'mkv') then
                raise exception 'Invalid video format. Allowed: MP4, WebM, MKV.';
            end if;

        when 'images' then
            if new.file_size_bytes > 15728640 then raise exception 'Images cannot exceed 15 MB.'; end if;
            if v_ext not in ('png', 'jpg', 'jpeg', 'webp') then
                raise exception 'Invalid image format. Allowed: PNG, JPG, JPEG, WEBP.';
            end if;

        when 'study_materials' then
            if new.file_size_bytes > 52428800 then raise exception 'Study materials cannot exceed 50 MB.'; end if;
            if v_ext not in ('pdf', 'zip', 'doc', 'docx') then
                raise exception 'Invalid format for Study Materials. Allowed: PDF, ZIP, DOC, DOCX.';
            end if;
    end case;

    -- Auto-approve so everybody can download immediately
    new.status := 'approved';
    new.moderated_at := now();
    new.download_request_count := 0;

    return new;
end;
$$;
