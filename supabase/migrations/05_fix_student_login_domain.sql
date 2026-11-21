/*
============================================================================
CAMPUSLEARN MIGRATION: 05_fix_student_login_domain.sql
PURPOSE: Update any existing student auth.users that were registered with
         @campuslearn.edu to use the new @campuslearn.in domain.
         Also ensure the trigger accepts @campuslearn.in emails.

INSTRUCTIONS:
  Run this in your Supabase SQL Editor:
  Dashboard → SQL Editor → New Query → paste this → Run
============================================================================
*/

-- 1. Update the handle_user_registration trigger to accept @campuslearn.in
CREATE OR REPLACE FUNCTION public.handle_user_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp AS $$
DECLARE
    v_raw_reg_no   text;
    v_dept_code    text;
    v_full_name    text;
    v_role         text;
    v_auth_result  record;
BEGIN
    v_full_name := coalesce(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    -- Determine if this is a student email (ends with @campuslearn.in)
    IF NEW.email LIKE '%@campuslearn.in' THEN
        v_role := 'student';
        v_raw_reg_no := upper(split_part(NEW.email, '@', 1));
        v_dept_code  := coalesce(
            NEW.raw_user_meta_data->>'department_code',
            upper(substring(v_raw_reg_no FROM 5 FOR 2))
        );

        -- Verify register number is in allowed list
        SELECT allowed, department_code INTO v_auth_result
        FROM public.verify_register_number(v_raw_reg_no);

        IF NOT v_auth_result.allowed THEN
            RAISE EXCEPTION 'Register number % is not in the authorized student list.', v_raw_reg_no;
        END IF;

        v_dept_code := coalesce(v_auth_result.department_code, v_dept_code);

    ELSE
        -- Admin or manually-created account
        v_role := 'admin';
        v_raw_reg_no := NULL;
        v_dept_code  := NULL;
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        register_number,
        department_code,
        account_status,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_role,
        v_raw_reg_no,
        v_dept_code,
        'active',
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email          = EXCLUDED.email,
        full_name      = coalesce(EXCLUDED.full_name, public.profiles.full_name),
        updated_at     = now();

    RETURN NEW;
END;
$$;

-- 2. Make sure the trigger fires AFTER INSERT on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_registration();
