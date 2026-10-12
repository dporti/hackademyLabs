"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/auth";

// Agenda del mentor (fase A): franjas semanales y días bloqueados. Con la sesión del
// usuario: la RLS solo deja tocar las filas propias; el trigger fusiona franjas que se
// solapan. Errores como CÓDIGOS (claves i18n de `agenda.errors`).

export interface AgendaState {
  error?: string;
  ok?: string;
}

const HORA = /^([01]\d|2[0-3]):(00|30)$|^24:00$/;

async function usuario(locale: string) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(localePath(locale, "/entrar"));
  return { sb, userId: user!.id };
}

export async function addSlotAction(_prev: AgendaState, fd: FormData): Promise<AgendaState> {
  const locale = String(fd.get("locale") ?? "es");
  const days = fd.getAll("weekday").map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
  const start = String(fd.get("start") ?? "");
  const end = String(fd.get("end") ?? "");
  if (days.length === 0) return { error: "noDays" };
  if (!HORA.test(start) || !HORA.test(end) || start === "24:00") return { error: "badTime" };
  if (end <= start) return { error: "badRange" };
  const { sb, userId } = await usuario(locale);
  // Una fila por día: el trigger de fusión necesita verlas de una en una.
  for (const weekday of [...new Set(days)]) {
    const { error } = await sb
      .from("availability")
      .insert({ profile_id: userId, weekday, start_time: start, end_time: end });
    if (error) return { error: error.message.includes("tooMany") ? "tooMany" : "generic" };
  }
  refresh();
  return { ok: "slotAdded" };
}

export async function deleteSlotAction(fd: FormData) {
  const { sb } = await usuario(String(fd.get("locale") ?? "es"));
  await sb.from("availability").delete().eq("id", String(fd.get("id") ?? ""));
  refresh();
}

export async function addOffAction(_prev: AgendaState, fd: FormData): Promise<AgendaState> {
  const locale = String(fd.get("locale") ?? "es");
  const from = String(fd.get("from") ?? "");
  const to = String(fd.get("to") ?? "") || from;
  const fecha = /^\d{4}-\d{2}-\d{2}$/;
  if (!fecha.test(from) || !fecha.test(to)) return { error: "badDate" };
  if (to < from) return { error: "badRange" };
  const { sb, userId } = await usuario(locale);
  const { error } = await sb.from("availability_off").insert({ profile_id: userId, from_day: from, to_day: to });
  if (error) return { error: error.message.includes("availability_off_range") ? "tooLong" : "badDate" };
  refresh();
  return { ok: "offAdded" };
}

export async function deleteOffAction(fd: FormData) {
  const { sb } = await usuario(String(fd.get("locale") ?? "es"));
  await sb.from("availability_off").delete().eq("id", String(fd.get("id") ?? ""));
  refresh();
}
