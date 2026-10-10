"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024;

// Ficheros de la sesión (fase 9): bucket privado `aula`, carpeta = id de la reserva.
// Solo las dos partes los ven (políticas de Storage). Descarga con URL firmada.
export function AulaFicheros({ bookingId }: { bookingId: string }) {
  const t = useTranslations("aula");
  const sb = useMemo(() => createClient(), []);
  const [lista, setLista] = useState<{ name: string; size: number }[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listar = useCallback(
    () =>
      sb.storage
        .from("aula")
        .list(bookingId, { sortBy: { column: "created_at", order: "desc" } })
        .then(({ data }) =>
          (data ?? []).filter((f) => f.name !== ".emptyFolderPlaceholder").map((f) => ({ name: f.name, size: f.metadata?.size ?? 0 })),
        ),
    [sb, bookingId],
  );
  const cargar = async () => setLista(await listar());
  useEffect(() => {
    let vivo = true;
    listar().then((l) => vivo && setLista(l));
    return () => {
      vivo = false;
    };
  }, [listar]);

  async function subir(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) return setError(t("fileTooBig"));
    setSubiendo(true);
    const limpio = file.name.normalize("NFD").replace(/[^\w.\-]+/g, "_").slice(-80);
    const { error: e } = await sb.storage.from("aula").upload(`${bookingId}/${Date.now()}-${limpio}`, file, { upsert: false });
    setSubiendo(false);
    if (e) setError(t("fileError"));
    else cargar();
  }

  async function abrir(name: string) {
    const { data } = await sb.storage.from("aula").createSignedUrl(`${bookingId}/${name}`, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <section aria-labelledby="ficheros-t" className="rounded-2xl border bg-card p-4">
      <h2 id="ficheros-t" className="font-mono text-sm font-semibold">
        {t("filesTitle")}
      </h2>
      <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] border border-dashed px-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
        {subiendo ? t("uploading") : t("upload")}
        <input
          type="file"
          className="sr-only"
          disabled={subiendo}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) subir(f);
            e.target.value = "";
          }}
        />
      </label>
      {error && <p className="mt-2 text-sm text-sos-text">{error}</p>}
      {lista.length === 0 ? (
        <p className="mt-3 text-xs text-label">{t("filesEmpty")}</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {lista.map((f) => (
            <li key={f.name}>
              <button
                type="button"
                onClick={() => abrir(f.name)}
                className="flex min-h-10 w-full items-center justify-between gap-2 rounded-[8px] px-2 text-left text-sm hover:bg-surface-2"
              >
                <span className="truncate">{f.name.replace(/^\d+-/, "")}</span>
                <span className="shrink-0 font-mono text-xs text-label">{Math.max(1, Math.round(f.size / 1024))} KB</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-label">{t("filesNote")}</p>
    </section>
  );
}
