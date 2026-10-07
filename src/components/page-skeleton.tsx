// Skeleton genérico para loading.tsx de fichas (módulo, mentor). Da a la ruta un
// <Suspense> alrededor de la lectura de `params`: la navegación es instantánea y el
// contenido entra en streaming. Respeta prefers-reduced-motion (animate-pulse se
// anula globalmente).
export function PageSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-5xl flex-1 animate-pulse px-4 py-10"
    >
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="mt-3 h-9 w-2/3 rounded bg-muted" />
      <div className="mt-3 h-4 w-1/2 rounded bg-muted" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-lg border bg-card" />
        ))}
      </div>
    </main>
  );
}
