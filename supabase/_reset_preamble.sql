-- Preámbulo de limpieza: hace apply_all.sql re-ejecutable desde cualquier estado
-- parcial. SOLO toca objetos propios de Tutor247. No forma parte de las migraciones
-- versionadas (que se aplican una vez cada una vía CLI/MCP).

-- Borra los usuarios de prueba para que el seed los recree y dispare el trigger.
delete from auth.users where email like '%@tutor247.dev';

drop view if exists public.mentor_public;

drop table if exists
  public.mentor_payout, public.mentor_badge, public.badge, public.referral,
  public.weekly_report, public.message, public.conversation, public.ticket,
  public.booking, public.ra_assessment, public.diagnostic, public.study_plan,
  public.consent, public.credit_ledger, public.mentor_modulo, public.plan,
  public.pack, public.modulo_equiv_cat, public.ra, public.ciclo_modulo,
  public.modulo, public.ciclo, public.reference_tutor, public.mentor_profile,
  public.student_profile, public.family, public.profile
  cascade;

drop function if exists public.current_user_role() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.guard_mentor_status() cascade;
drop function if exists public.block_ledger_mutation() cascade;
drop function if exists public.credit_balance(uuid) cascade;
drop function if exists public.my_credit_balance() cascade;

drop type if exists
  consent_type, plan_kind, product_kind, ledger_type, ra_status,
  mentor_status, mentor_level, student_mode, user_role, grade_level
  cascade;
