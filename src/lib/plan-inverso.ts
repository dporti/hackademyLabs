import type { ProductKind, RaStatus } from "@/lib/db-types";
import { product } from "@/lib/products";

// Plan inverso (docs: "el alumno pone la fecha del examen; la plataforma calcula
// qué RA trabajar cada semana y cuántos créditos necesitará"). Cálculo puro y
// orientativo, en el navegador: sirve para el diagnóstico gratis sin cuenta.

// Horas de trabajo estimadas por RA según cómo lo lleva el alumno.
export const HORAS_POR_ESTADO: Record<RaStatus, number> = {
  rojo: 6,
  ambar: 3,
  verde: 1,
};

export type Veredicto = "holgado" | "justo" | "noLlegas";

export interface PlanSemana {
  semana: number;
  inicio: string; // AAAA-MM-DD
  items: { code: string; horas: number; repaso: boolean }[];
  simulacro: boolean;
}

export interface Recomendacion {
  kind: ProductKind;
  min: number; // créditos
  max: number;
  // Desglose cuando se recomiendan productos sueltos.
  sesiones?: number;
  flash?: number;
}

export interface PlanInverso {
  dias: number;
  horasNecesarias: number;
  horasDisponibles: number;
  veredicto: Veredicto;
  semanas: PlanSemana[];
  recomendacion: Recomendacion;
}

const DIA = 86_400_000;
const toDate = (d: string) => new Date(`${d}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function diasHasta(hoy: string, examen: string) {
  return Math.round((toDate(examen).getTime() - toDate(hoy).getTime()) / DIA);
}

export function calcularPlan({
  ras,
  estados,
  hoy,
  examen,
  horasSemana,
}: {
  ras: { code: string }[];
  estados: Record<string, RaStatus>;
  hoy: string;
  examen: string;
  horasSemana: number;
}): PlanInverso {
  const dias = Math.max(1, diasHasta(hoy, examen));
  const estadoDe = (code: string) => estados[code] ?? "ambar";
  const horasNecesarias = ras.reduce(
    (s, r) => s + HORAS_POR_ESTADO[estadoDe(r.code)],
    0,
  );
  const horasDisponibles = Math.round((dias / 7) * horasSemana * 10) / 10;
  const ratio = horasDisponibles / Math.max(1, horasNecesarias);
  const veredicto: Veredicto =
    ratio >= 1.2 ? "holgado" : ratio >= 0.9 ? "justo" : "noLlegas";

  // Semanas: lo flojo primero en el orden del módulo (los RA se apoyan unos en
  // otros); la última semana, si hay más de una, repaso de lo dominado + simulacro.
  const numSemanas = Math.max(1, Math.ceil(dias / 7));
  const semanas: PlanSemana[] = Array.from({ length: numSemanas }, (_, i) => ({
    semana: i + 1,
    inicio: iso(new Date(toDate(hoy).getTime() + i * 7 * DIA)),
    items: [],
    simulacro: false,
  }));
  const estudio = ras
    .filter((r) => estadoDe(r.code) !== "verde")
    .map((r) => ({ code: r.code, horas: HORAS_POR_ESTADO[estadoDe(r.code)] }));
  const repaso = ras.filter((r) => estadoDe(r.code) === "verde");
  const semanasEstudio = numSemanas > 1 ? numSemanas - 1 : 1;
  // Reparto proporcional: cada semana de estudio absorbe ~lo mismo.
  const totalEstudio = estudio.reduce((s, t) => s + t.horas, 0);
  const cupo = Math.max(1, totalEstudio / semanasEstudio);
  let w = 0;
  let enSemana = 0;
  for (const t of estudio) {
    let resto = t.horas;
    while (resto > 0) {
      const hueco = Math.max(0.5, cupo - enSemana);
      const h = Math.min(resto, hueco);
      semanas[w].items.push({ code: t.code, horas: h, repaso: false });
      resto -= h;
      enSemana += h;
      if (enSemana >= cupo - 0.01 && w < semanasEstudio - 1) {
        w++;
        enSemana = 0;
      }
    }
  }
  const ultima = semanas[numSemanas - 1];
  if (estudio.length) {
    for (const r of repaso)
      ultima.items.push({
        code: r.code,
        horas: HORAS_POR_ESTADO.verde,
        repaso: true,
      });
  } else {
    // Todo dominado: repaso repartido para no dejar semanas vacías.
    repaso.forEach((r, i) =>
      semanas[i % numSemanas].items.push({
        code: r.code,
        horas: HORAS_POR_ESTADO.verde,
        repaso: true,
      }),
    );
  }
  ultima.simulacro = true;
  // Fusiona trozos del mismo RA dentro de una semana.
  for (const s of semanas) {
    const m = new Map<
      string,
      { code: string; horas: number; repaso: boolean }
    >();
    for (const it of s.items) {
      const k = `${it.code}${it.repaso}`;
      const prev = m.get(k);
      if (prev) prev.horas += it.horas;
      else m.set(k, { ...it });
    }
    s.items = [...m.values()].map((it) => ({
      ...it,
      horas: Math.round(it.horas * 2) / 2,
    }));
  }

  // Recomendación (créditos orientativos de docs §5).
  const rojos = ras.filter((r) => estadoDe(r.code) === "rojo").length;
  const ambar = ras.filter((r) => estadoDe(r.code) === "ambar").length;
  let recomendacion: Recomendacion;
  if (dias <= 10 && rojos + ambar > 0) {
    const p = product("rescate_48h");
    recomendacion = { kind: "rescate_48h", min: p.min, max: p.max };
  } else if (veredicto === "noLlegas" || rojos >= 3) {
    const p = product("plan_modulo");
    recomendacion = { kind: "plan_modulo", min: p.min, max: p.max };
  } else {
    // Sueltos: una sesión 1:1 por RA flojo, una flash por cada 2 a medias y un simulacro.
    const s1 = product("sesion_1a1");
    const fl = product("sesion_flash");
    const si = product("simulacro");
    const flash = Math.ceil(ambar / 2);
    if (rojos === 0 && flash === 0) {
      // Lo llevas bien: basta con comprobarlo con un simulacro.
      recomendacion = { kind: "simulacro", min: si.min, max: si.max };
    } else
      recomendacion = {
        kind: "sesion_1a1",
        sesiones: rojos,
        flash,
        min: rojos * s1.min + flash * fl.min + si.min,
        max: rojos * s1.max + flash * fl.max + si.max,
      };
  }

  return {
    dias,
    horasNecesarias,
    horasDisponibles,
    veredicto,
    semanas,
    recomendacion,
  };
}
