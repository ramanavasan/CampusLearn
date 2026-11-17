-- ============================================================================
-- CAMPUSLEARN — TESTED ROLLBACK PROCEDURE
-- File: 03_rollback_migration.sql
-- ============================================================================

-- Step 1: Revert triggers
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_deleted_recovery on auth.users;
drop trigger if exists on_profile_update_protect on public.profiles;
drop trigger if exists on_profile_deleted_recovery on public.profiles;
drop trigger if exists on_material_insert_validation on public.materials;
drop trigger if exists on_material_update_enforce on public.materials;

-- Step 2: Non-Destructive Data Restoration from Backup Schema
do $$
begin
    if exists (select 1 from information_schema.schemata where schema_name = '_campuslearn_pre_upgrade_backup') then
        -- Restore Profiles
        delete from public.profiles where id in (select id from _campuslearn_pre_upgrade_backup.profiles);
        insert into public.profiles select * from _campuslearn_pre_upgrade_backup.profiles;

        -- Restore Materials
        delete from public.materials where id in (select id from _campuslearn_pre_upgrade_backup.materials);
        insert into public.materials select * from _campuslearn_pre_upgrade_backup.materials;
    end if;
end $$;