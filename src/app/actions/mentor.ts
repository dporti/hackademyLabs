"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/auth";
import { MENTORES_TAG } from "@/lib/catalog";

// Acciones del panel del mentor (F1.5). Todo con el cliente del mentor: la RLS
// limita a sus filas y el trigger guard_mentor_status impide tocar status/level.
// Errores como CÓDIGOS (claves i18n de `mentorPanel.errors`).

export interface MentorFormValues {
  headline: string | null;
  bio: string | null;
  video_url: string | null;
  languages: string[];
  moduloCodes: string[];
}

export interface MentorActionState {
  error?: string;
  ok?: string;
  // En error se devuelven los valores enviados: React 19 resetea el formulario tras
  // la acción y, sin esto, el mentor perdería lo que había escrito.
  values?: MentorFormValues;
}

const IDIOMAS = ["es", "ca"];
const MAX_HEADLINE = 80;
const MAX_BIO = 1200;

export async function updateMentorProfileAction(
  _prev: MentorActionState,
  formData: FormData,
): Promise<MentorActionState> {
  const locale = String(formData.get("locale") ?? "es");
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(localePath(locale, "/entrar"));
  const uid = user!.id;

  const headline = String(formData.get("headline") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const videoUrl = String(formData.get("video_url") ?? "").trim();
  const languages = formData
    .getAll("languages")
    .map(String)
    .filter((l) => IDIOMAS.includes(l));
  const codes = [...new Set(formData.getAll("modulos").map(String))];
  const values: MentorFormValues = {
    headline,
    bio,
    video_url: videoUrl,
    languages,
    moduloCodes: codes,
  };
  const fail = (error: string): MentorActionState => ({ error, values });

  if (headline.length > MAX_HEADLINE || bio.length > MAX_BIO)
    return fail("tooLong");
  if (!languages.length) return fail("noLanguage");
  // Solo enlaces https (vídeo de presentación); nada de javascript:, http:, etc.
  if (videoUrl) {
    try {
      if (new URL(videoUrl).protocol !== "https:") return fail("badUrl");
    } catch {
      return fail("badUrl");
    }
  }

  // update (no upsert): si no existe mentor_profile, no hay fila que tocar.
  const { data: updated, error } = await sb
    .from("mentor_profile")
    .update({
      headline: headline || null,
      bio: bio || null,
      video_url: videoUrl || null,
      languages,
    })
    .eq("profile_id", uid)
    .select("profile_id");
  if (error) return fail("generic");
  if (!updated?.length) return fail("noProfile");

  // Módulos que imparte: se sustituye el conjunto completo por el del formulario.
  const { data: mods } = codes.length
    ? await sb.from("modulo").select("id").in("code", codes)
    : { data: [] as { id: string }[] };
  const ids = (mods ?? []).map((m) => m.id);

  let del = sb.from("mentor_modulo").delete().eq("mentor_id", uid);
  if (ids.length) del = del.not("modulo_id", "in", `(${ids.join(",")})`);
  const { error: delErr } = await del;
  if (delErr) return fail("generic");

  if (ids.length) {
    const { error: upErr } = await sb.from("mentor_modulo").upsert(
      ids.map((modulo_id) => ({ mentor_id: uid, modulo_id })),
      { onConflict: "mentor_id,modulo_id" },
    );
    if (upErr) return fail("generic");
  }

  // Si el mentor está verificado, su ficha pública cambia: invalida la caché.
  updateTag(MENTORES_TAG);
  refresh();
  return { ok: "saved" };
}
