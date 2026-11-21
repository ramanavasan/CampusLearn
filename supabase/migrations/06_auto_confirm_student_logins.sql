/*
============================================================================
CAMPUSLEARN MIGRATION: 06_auto_confirm_student_logins.sql
PURPOSE:
  1. Fix "Email not confirmed" error by immediately confirming all existing accounts (e.g. 2401CE10104).
  2. Add an automatic BEFORE INSERT trigger on auth.users so all future student signups are instantly confirmed without needing an email verification link.
  3. Ensure profiles and authorized_students sync properly.

INSTRUCTIONS:
  Run this in Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run.
============================================================================
*/

-- 1. Auto-confirm function and BEFORE INSERT trigger on auth.users
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp AS $$
BEGIN
    -- Automatically confirm email so students can log in immediately
    IF NEW.email_confirmed_at IS NULL THEN
        NEW.email_confirmed_at := now();
    END IF;
    IF NEW.confirmed_at IS NULL THEN
        NEW.confirmed_at := now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_confirm_user();

-- 2. Immediately confirm existing users who are stuck on "Email not confirmed"
UPDATE auth.users
SET email_confirmed_at = coalesce(email_confirmed_at, now()),
    confirmed_at = coalesce(confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- 3. Update the handle_user_registration trigger to support both @campuslearn.in and @campuslearn.edu
CREATE OR REPLACE FUNCTION public.handle_user_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp AS $$
DECLARE
    v_admin_record record;
    v_reg_no text;
    v_auth_record record;
    v_full_name text;
    v_dept_code text;
BEGIN
    v_full_name := coalesce(
        nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
        nullif(trim(split_part(new.email, '@', 1)), ''),
        'Campus User'
    );
    IF length(v_full_name) < 2 THEN
        v_full_name := v_full_name || ' User';
    END IF;

    -- Check if student domain
    IF new.email LIKE '%@campuslearn.in' OR new.email LIKE '%@campuslearn.edu' THEN
        v_reg_no := upper(trim(split_part(new.email, '@', 1)));

        IF v_reg_no IS NULL OR v_reg_no = '' OR NOT (v_reg_no ~* '^[0-9]{4}[A-Z]{2}[0-9]{5}$') THEN
            RAISE EXCEPTION 'Student registration requires an authorized 11-character College Register Number (e.g. 2401CE10101).';
        END IF;

        SELECT * INTO v_auth_record
        FROM public.authorized_students
        WHERE register_number = v_reg_no;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Register number % is not on the college authorized student list.', v_reg_no;
        END IF;

        -- Update authorized_students status
        UPDATE public.authorized_students
        SET is_registered = true,
            registered_at = now(),
            user_id = new.id
        WHERE register_number = v_reg_no;

        v_dept_code := coalesce(
            new.raw_user_meta_data->>'department_code',
            v_auth_record.department_code,
            upper(substring(v_reg_no FROM 5 FOR 2))
        );

        INSERT INTO public.profiles (
            id, register_number, email, full_name, department_code, role, account_status
        ) VALUES (
            new.id,
            v_reg_no,
            lower(new.email),
            coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Student ' || v_reg_no),
            v_dept_code,
            'student',
            'active'
        )
        ON CONFLICT (id) DO UPDATE SET
            register_number = excluded.register_number,
            department_code = excluded.department_code,
            role = 'student',
            account_status = 'active',
            email = excluded.email,
            updated_at = now();

        RETURN NEW;
    ELSE
        -- Admin / faculty path
        SELECT * INTO v_admin_record
        FROM public.authorized_admins
        WHERE lower(email) = lower(new.email) AND is_active = true;

        INSERT INTO public.authorized_admins (email, full_name, is_active)
        VALUES (lower(new.email), coalesce(v_admin_record.full_name, v_full_name, 'System Administrator'), true)
        ON CONFLICT (email) DO UPDATE SET is_active = true, updated_at = now();

        INSERT INTO public.profiles (
            id, register_number, email, full_name, department_code, role, account_status
        ) VALUES (
            new.id,
            null,
            lower(new.email),
            coalesce(v_admin_record.full_name, v_full_name, 'System Administrator'),
            null,
            'admin',
            'active'
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin',
            account_status = 'active',
            email = excluded.email,
            full_name = coalesce(excluded.full_name, public.profiles.full_name),
            updated_at = now();

        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_registration();

-- 4. Sync profile for existing 2401CE10104 user if profile row was missed
DO $$
DECLARE
    r record;
    v_reg text;
    v_dept text;
BEGIN
    FOR r IN SELECT id, email FROM auth.users WHERE email LIKE '%@campuslearn.in' OR email LIKE '%@campuslearn.edu' LOOP
        v_reg := upper(split_part(r.email, '@', 1));
        SELECT department_code INTO v_dept FROM public.authorized_students WHERE register_number = v_reg;
        IF v_dept IS NULL THEN
            v_dept := upper(substring(v_reg FROM 5 FOR 2));
        END IF;

        INSERT INTO public.profiles (id, register_number, email, full_name, department_code, role, account_status)
        VALUES (r.id, v_reg, r.email, 'Student ' || v_reg, v_dept, 'student', 'active')
        ON CONFLICT (id) DO UPDATE SET
            account_status = 'active',
            role = 'student',
            register_number = v_reg,
            department_code = v_dept;

        UPDATE public.authorized_students
        SET is_registered = true, registered_at = now(), user_id = r.id
        WHERE register_number = v_reg;
    END LOOP;
END $$;
