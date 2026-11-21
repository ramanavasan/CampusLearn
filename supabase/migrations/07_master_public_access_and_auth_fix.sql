/*
============================================================================
CAMPUSLEARN MASTER FIX: 07_master_public_access_and_auth_fix.sql
============================================================================
INSTRUCTIONS:
  1. Open Supabase Dashboard -> SQL Editor -> New Query.
  2. Paste this entire script and click "Run".
============================================================================
*/

-- 1. Auto-confirm trigger for all new student signups
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp AS $$
BEGIN
    IF NEW.email_confirmed_at IS NULL THEN
        NEW.email_confirmed_at := now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_confirm_user();

-- 2. Confirm 2401CE10104 and any existing accounts immediately
UPDATE auth.users
SET email_confirmed_at = coalesce(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- 3. Update the material update rules trigger so migrations & admins can update materials
CREATE OR REPLACE FUNCTION public.enforce_material_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
    -- Allow migrations / direct SQL (where auth.uid() is null) and active admins
    IF auth.uid() IS NULL OR public.is_admin() THEN
        new.id := old.id;
        new.uploaded_by := old.uploaded_by;
        new.updated_at := now();
        RETURN new;
    END IF;

    IF old.uploaded_by <> auth.uid() THEN
        RAISE EXCEPTION 'You can only edit your own uploads.';
    END IF;

    IF old.status <> 'pending' THEN
        RAISE EXCEPTION 'Only pending uploads can be edited.';
    END IF;

    new.updated_at := now();
    RETURN new;
END;
$$;

-- 4. Make all uploaded materials (including your 2 images) approved and publicly visible
UPDATE public.materials
SET status = 'approved',
    moderated_at = now()
WHERE status <> 'deleted';

-- 5. Allow everyone (even without login) to view approved materials
DROP POLICY IF EXISTS "Materials select policy" ON public.materials;
CREATE POLICY "Materials select policy" ON public.materials
    FOR SELECT TO authenticated, anon
    USING (
        status = 'approved' OR
        (auth.uid() IS NOT NULL AND uploaded_by = auth.uid() AND status <> 'deleted') OR
        public.is_admin()
    );

-- 6. Allow everyone to read profiles for uploader names
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
CREATE POLICY "Profiles select policy" ON public.profiles
    FOR SELECT TO authenticated, anon
    USING (true);

-- 7. Allow everyone (even without login) to download approved materials
CREATE OR REPLACE FUNCTION public.can_access_storage_object(p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage, pg_temp AS $$
DECLARE
    v_status text;
BEGIN
    SELECT status INTO v_status FROM public.materials WHERE file_path = p_object_name;
    IF NOT FOUND OR v_status = 'deleted' THEN
        RETURN false;
    END IF;
    IF v_status = 'approved' THEN
        RETURN true;
    END IF;
    RETURN false;
END;
$$;

DROP POLICY IF EXISTS "Secure storage read access" ON storage.objects;
CREATE POLICY "Secure storage read access" ON storage.objects
    FOR SELECT TO authenticated, anon
    USING (bucket_id = 'campus_materials' AND public.can_access_storage_object(name));

-- 8. Auto-approve all future uploads
CREATE OR REPLACE FUNCTION public.validate_material_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp AS $$
BEGIN
    new.status := 'approved';
    new.moderated_at := now();
    new.download_request_count := 0;
    RETURN new;
END;
$$;
