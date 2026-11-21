/*
============================================================================
CAMPUSLEARN: 08_grant_permissions_and_fix_policy.sql
Grant anon execute on is_admin and fix Materials select policy
============================================================================
*/

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_storage_object(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Materials select policy" ON public.materials;
CREATE POLICY "Materials select policy" ON public.materials
    FOR SELECT TO authenticated, anon
    USING (
        status = 'approved' OR
        (auth.uid() IS NOT NULL AND uploaded_by = auth.uid() AND status <> 'deleted') OR
        (auth.uid() IS NOT NULL AND public.is_admin())
    );
