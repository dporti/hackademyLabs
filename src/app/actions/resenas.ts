"use server";

import { refresh, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redactContact } from "@/lib/contact-filter";
import { MENTORES_TAG } from "@/lib/catalog";

// Reseñas de mentores. Las RPC son solo de servidor (service role) para que el texto
// pase SIEMPRE por el filtro de contacto (anti-bypass) antes de guardarse; la identidad
// sale de la sesión, nunca del formulario.

export interface ResenaState {
  ok?: "created" | "replied" | "reported" | "deleted";
  error?: string;
  redacted?: boolean;
}

const ERRORES = ["invalidRating", "invalidText", "notEligible", "tooLate", "alreadyReviewed", "notFound"];
const codigo = (m: string) => ERRORES.find((c) => m.includes(c)) ?? "generic";

const UUID = /^[0-9a-f-]{36}$/i;
const uuid = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return UUID.test(s) ? s : null;
};

async function usuario() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user;
}

export async function createReviewAction(_prev: ResenaState, fd: FormData): Promise<ResenaState> {
  const user = await usuario();
  if (!user) return { error: "notEligible" };
  const source = fd.get("source") === "ticket" ? "ticket" : "sesion";
  const ref = uuid(fd.get("ref"));
  const rating = Number(fd.get("rating"));
  if (!ref) return { error: "notEligible" };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "invalidRating" };
  const comment = redactContact(String(fd.get("comment") ?? "").trim().slice(0, 1000));
  const { error } = await createAdminClient().rpc("create_review", {
    p_student: user.id,
    p_booking: source === "sesion" ? ref : null,
    p_ticket: source === "ticket" ? ref : null,
    p_rating: rating,
    p_comment: comment.text,
    p_anonymous: fd.get("anonymous") === "on",
  });
  if (error) return { error: codigo(error.message) };
  updateTag(MENTORES_TAG);
  refresh();
  return { ok: "created", redacted: comment.redacted };
}

export async function deleteReviewAction(fd: FormData) {
  const user = await usuario();
  const id = uuid(fd.get("review"));
  if (!user || !id) return;
  await createAdminClient().rpc("delete_review", { p_student: user.id, p_review: id });
  updateTag(MENTORES_TAG);
  refresh();
}

export async function replyReviewAction(_prev: ResenaState, fd: FormData): Promise<ResenaState> {
  const user = await usuario();
  const id = uuid(fd.get("review"));
  if (!user || !id) return { error: "notFound" };
  const reply = redactContact(String(fd.get("reply") ?? "").trim().slice(0, 1000));
  const { error } = await createAdminClient().rpc("reply_review", {
    p_mentor: user.id,
    p_review: id,
    p_reply: reply.text,
  });
  if (error) return { error: codigo(error.message) };
  updateTag(MENTORES_TAG);
  refresh();
  return { ok: "replied", redacted: reply.redacted };
}

export async function reportReviewAction(_prev: ResenaState, fd: FormData): Promise<ResenaState> {
  const user = await usuario();
  const id = uuid(fd.get("review"));
  if (!user || !id) return { error: "notFound" };
  const { error } = await createAdminClient().rpc("report_review", {
    p_mentor: user.id,
    p_review: id,
    p_reason: String(fd.get("reason") ?? "").trim().slice(0, 300),
  });
  if (error) return { error: codigo(error.message) };
  refresh();
  return { ok: "reported" };
}

// Admin: ocultar / restaurar / descartar la denuncia. Con la sesión del admin: la RLS
// (mr_admin_all) vuelve a comprobar en BD que quien actúa es admin.
export async function moderateReviewAction(fd: FormData) {
  const id = uuid(fd.get("review"));
  const op = String(fd.get("op") ?? "");
  if (!id || !["hide", "show", "dismiss"].includes(op)) return;
  const sb = await createClient();
  const patch =
    op === "hide"
      ? { status: "oculta" }
      : op === "show"
        ? { status: "publicada", reported_at: null, report_reason: null }
        : { reported_at: null, report_reason: null };
  await sb.from("mentor_review").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  updateTag(MENTORES_TAG);
  refresh();
}
