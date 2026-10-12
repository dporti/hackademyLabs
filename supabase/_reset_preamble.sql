-- Preámbulo de limpieza: hace apply_all.sql re-ejecutable desde cualquier estado
-- parcial. SOLO toca objetos propios de Tutor247. No forma parte de las migraciones
-- versionadas (que se aplican una vez cada una vía CLI/MCP).

drop view if exists public.mentor_public;

drop table if exists
  public.availability_off, public.availability, public.aula_stroke, public.aula_doc, public.xp_event, public.quiz, public.material, public.referral_code,
  public.student_activity, public.checkin, public.tutor_assignment, public.ra_evidence,
  public.ra_progress, public.lead, public.mentor_earning, public.ticket_message, public.product_price,
  public.mentor_payout, public.mentor_badge, public.badge, public.referral,
  public.weekly_report, public.message, public.conversation, public.ticket,
  public.booking, public.ra_assessment, public.diagnostic, public.study_plan,
  public.consent, public.family_invite, public.student_modulo, public.credit_ledger, public.mentor_modulo, public.plan,
  public.pack, public.modulo_equiv_cat, public.ra, public.ciclo_modulo,
  public.modulo, public.ciclo, public.reference_tutor, public.mentor_profile,
  public.student_profile, public.family, public.profile
  cascade;

drop function if exists public.current_user_role() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.guard_mentor_status() cascade;
drop function if exists public.guard_profile_role() cascade;
drop function if exists public.is_admin_or_server() cascade;
drop function if exists public.family_can_see(uuid) cascade;
drop function if exists public.guard_student_family() cascade;
drop function if exists public.create_family_invite() cascade;
drop function if exists public.accept_family_invite(text, boolean) cascade;
drop function if exists public.set_family_share(boolean) cascade;
drop function if exists public.leave_family() cascade;
drop function if exists public.my_linked_family() cascade;
drop function if exists public.my_family_students() cascade;
drop function if exists public.block_ledger_mutation() cascade;
drop function if exists public.grant_welcome_credits() cascade;
drop function if exists public.credit_balance(uuid) cascade;
drop function if exists public.my_credit_balance() cascade;
drop function if exists public.product_credits(product_kind, mentor_level) cascade;
drop function if exists public.block_earning_mutation() cascade;
drop function if exists public.mentor_teaches(uuid) cascade;
drop function if exists public.my_student_names(uuid[]) cascade;
drop function if exists public.lock_student_credits(uuid) cascade;
drop function if exists public.is_verified_mentor_of(uuid, uuid) cascade;
drop function if exists public.create_ticket(uuid, text, product_kind, text, text) cascade;
drop function if exists public.cancel_ticket(uuid, uuid) cascade;
drop function if exists public.claim_ticket(uuid, uuid) cascade;
drop function if exists public.release_ticket(uuid, uuid) cascade;
drop function if exists public.post_ticket_message(uuid, uuid, text) cascade;
drop function if exists public.close_ticket(uuid, uuid) cascade;
drop function if exists public.create_booking(uuid, uuid, text, product_kind, timestamp, text) cascade;
drop function if exists public.respond_booking(uuid, uuid, boolean) cascade;
drop function if exists public.cancel_booking(uuid, uuid) cascade;
drop function if exists public.complete_booking(uuid, uuid) cascade;
drop function if exists public.block_evidence_mutation() cascade;
drop function if exists public.is_tutor_of(uuid) cascade;
drop function if exists public.nivel_progress(nivel_dominio) cascade;
drop function if exists public.apply_ra_evidence(uuid, uuid, evidencia_kind, nivel_dominio, boolean, text, uuid, uuid) cascade;
drop function if exists public.touch_activity() cascade;
drop function if exists public.save_self_assessment(text, jsonb) cascade;
drop function if exists public.assess_ra(uuid, uuid, nivel_dominio, boolean, text) cascade;
drop function if exists public.booking_ra_map(uuid) cascade;
drop function if exists public.my_tutor_students() cascade;
drop function if exists public.my_tutor_name() cascade;
drop function if exists public.admin_make_tutor(text) cascade;
drop function if exists public.admin_assign_tutor(uuid, uuid) cascade;
drop function if exists public.block_xp_mutation() cascade;
drop function if exists public.grant_xp(uuid, text, int, text) cascade;
drop function if exists public.xp_from_evidence() cascade;
drop function if exists public.xp_from_booking() cascade;
drop function if exists public.search_material(uuid, text, uuid[], int) cascade;
drop function if exists public.my_referral_code() cascade;
drop function if exists public.my_referrals() cascade;
drop function if exists public.reward_referral(uuid) cascade;
drop function if exists public.is_booking_party(uuid) cascade;
drop function if exists public.is_booking_party_path(text) cascade;
drop function if exists public.guard_aula_doc() cascade;
drop function if exists public.guard_availability() cascade;
drop function if exists public.fits_agenda(uuid, timestamptz, timestamptz) cascade;
drop function if exists public.mentor_slots(uuid, product_kind, int) cascade;

drop type if exists
  consent_type, plan_kind, product_kind, ledger_type, ra_status,
  mentor_status, mentor_level, student_mode, user_role, grade_level,
  lead_kind, lead_status, nivel_dominio, evidencia_kind
  cascade;

-- Borra los usuarios de prueba para que el seed los recree y dispare el trigger.
-- Va DESPUÉS de los drops: con credit_ledger aún presente, el borrado en cascada
-- chocaría con el trigger de inmutabilidad del ledger.
delete from auth.users where email like '%@tutor247.dev';
