import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BookingStatus } from "@/lib/db-types";

// Aula integrada (fase 9, maqueta Aula.html). Solo entran el alumno y el mentor de
// la reserva, desde 15 min antes hasta 30 min después del final. Vídeo: Daily.co si
// hay DAILY_API_KEY (sala privada + token por persona); si no, Jitsi incrustado con la
// sala aleatoria de la reserva (provisional, como hasta ahora).

export const ABRE_ANTES_MIN = 15;
export const CIERRA_DESPUES_MIN = 30;

export interface AulaInfo {
  id: string;
  role: "alumno" | "mentor";
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  abierta: boolean; // dentro de la ventana
  pronto: boolean; // aún no abre
  empezada: boolean; // ya pasó la hora de inicio
  modulo: { code: string; name: string } | null;
  otro: string; // nombre de pila de la otra parte
  meeting_url: string | null;
  aula_room: string | null;
  summary: string | null;
  student_id: string;
}

export async function getAula(bookingId: string, userId: string): Promise<AulaInfo | null> {
  const sb = await createClient();
  const { data: b } = await sb
    .from("booking")
    .select("id, student_id, mentor_id, status, starts_at, ends_at, meeting_url, aula_room, summary, modulo(code, name)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return null;
  const role = b.student_id === userId ? "alumno" : b.mentor_id === userId ? "mentor" : null;
  if (!role || (b.status !== "confirmada" && b.status !== "hecha")) return null;

  const ahora = Date.now();
  const abre = new Date(b.starts_at).getTime() - ABRE_ANTES_MIN * 60_000;
  const cierra = new Date(b.ends_at).getTime() + CIERRA_DESPUES_MIN * 60_000;
  const otroId = role === "alumno" ? b.mentor_id : b.student_id;
  // Nombre de pila de la otra parte (RPC que ya limitan la información).
  let otro = "";
  if (role === "mentor") {
    const { data } = await sb.rpc("my_student_names", { p_ids: [otroId] });
    otro = (data as { first_name: string }[] | null)?.[0]?.first_name ?? "";
  } else {
    const { data } = await sb.from("mentor_public").select("full_name").eq("profile_id", otroId).maybeSingle();
    otro = (data?.full_name ?? "").split(" ")[0];
  }
  return {
    id: b.id,
    role,
    status: b.status as BookingStatus,
    starts_at: b.starts_at,
    ends_at: b.ends_at,
    abierta: ahora >= abre && ahora <= cierra,
    pronto: ahora < abre,
    empezada: ahora >= new Date(b.starts_at).getTime(),
    modulo: b.modulo as unknown as { code: string; name: string } | null,
    otro,
    meeting_url: b.meeting_url,
    aula_room: b.aula_room,
    summary: b.summary,
    student_id: b.student_id,
  };
}

// URL del vídeo para incrustar (iframe). Daily: crea la sala la primera vez.
export async function videoUrl(aula: AulaInfo, nombre: string): Promise<{ url: string; proveedor: "daily" | "jitsi" } | null> {
  const key = process.env.DAILY_API_KEY;
  if (key) {
    try {
      const exp = Math.floor(new Date(aula.ends_at).getTime() / 1000) + CIERRA_DESPUES_MIN * 60;
      let room = aula.aula_room;
      if (!room) {
        const res = await fetch("https://api.daily.co/v1/rooms", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `ca-${aula.id.replace(/-/g, "").slice(0, 20)}`,
            privacy: "private",
            properties: { exp, enable_chat: true, enable_screenshare: true, enable_prejoin_ui: true },
          }),
        });
        if (!res.ok) throw new Error(`daily rooms ${res.status}`);
        room = ((await res.json()) as { url: string }).url;
        await createAdminClient().from("booking").update({ aula_room: room }).eq("id", aula.id);
      }
      const name = new URL(room).pathname.replace(/^\//, "");
      const tok = await fetch("https://api.daily.co/v1/meeting-tokens", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: { room_name: name, user_name: nombre, exp, is_owner: aula.role === "mentor" },
        }),
      });
      if (!tok.ok) throw new Error(`daily token ${tok.status}`);
      const { token } = (await tok.json()) as { token: string };
      return { url: `${room}?t=${encodeURIComponent(token)}`, proveedor: "daily" };
    } catch (e) {
      console.error("[aula]", e);
      // Si Daily falla, se cae a Jitsi para no dejar la sesión sin vídeo.
    }
  }
  if (!aula.meeting_url) return null;
  const nombreJitsi = encodeURIComponent(JSON.stringify(nombre));
  return {
    url: `${aula.meeting_url}#config.prejoinPageEnabled=true&userInfo.displayName=${nombreJitsi}`,
    proveedor: "jitsi",
  };
}
