// Pinta el resumen de sesión que redacta Bit: párrafos y **negritas** (nada más; el
// texto se trata como datos, sin HTML).
export function Resumen({ texto }: { texto: string }) {
  return (
    <div className="mt-2 space-y-2 text-sm">
      {texto
        .split(/\n+/)
        .filter((l) => l.trim())
        .map((l, i) => (
          <p key={i}>
            {l
              .replace(/^#+\s*/, "")
              .split(/(\*\*[^*]+\*\*)/g)
              .map((trozo, j) =>
                trozo.startsWith("**") && trozo.endsWith("**") ? (
                  <strong key={j} className="font-semibold">
                    {trozo.slice(2, -2)}
                  </strong>
                ) : (
                  <span key={j}>{trozo.replace(/^[-*]\s+/, "• ")}</span>
                ),
              )}
          </p>
        ))}
    </div>
  );
}
