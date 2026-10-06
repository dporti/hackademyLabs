# Supabase — Tutor247

Esquema (migraciones) y datos iniciales (seed) de la base de datos.

```
supabase/
  migrations/
    20261006090100_enums.sql              Enums del dominio
    20261006090200_profiles_roles.sql     profile, family, student/mentor/tutor, helpers RLS
    20261006090300_catalog.sql            ciclo, modulo, ra, equivalencias, packs, planes
    20261006090400_credit_ledger.sql      Ledger inmutable + función de saldo
    20261006090500_future_scaffolding.sql Tablas de fases futuras (tickets, Bit, informes…)
  seed.sql                                Catálogo + RA (0485/0484) + 3 mentores de prueba
```

## Aplicar (elige una vía)

### A) Supabase CLI + Docker (local, recomendado para desarrollo)
```powershell
# Requiere Docker Desktop y la CLI de Supabase instalados.
supabase init          # solo la primera vez (conserva migrations/ y seed.sql)
supabase start         # levanta el stack local
supabase db reset      # aplica migraciones + seed desde cero
```
Las claves locales salen de `supabase start`; cópialas a `.env.local`.

### B) Proyecto en la nube
Aplica las migraciones en orden y luego `seed.sql` (SQL Editor del panel, la CLI
con `supabase db push`, o el MCP de Supabase). Copia URL y keys a `.env.local`.

## Reglas que refleja el esquema
- **Ledger inmutable**: `credit_ledger` sin UPDATE/DELETE (triggers lo bloquean).
  El saldo se calcula con `credit_balance(student)` / `my_credit_balance()`.
- **RLS en todo**: catálogo de lectura pública; datos personales solo el dueño/admin.
- **Anti-bypass**: mentores públicos vía vista `mentor_public` (sin email/contacto).
- **Verificación de mentor**: solo admin cambia `status` (trigger `guard_mentor_status`).

## Pendiente de validar en los datos
- RA de 0485/0484 son orientativos → contrastar con BOE/decreto autonómico.
- `modulo_equiv_cat` lleva equivalencias catalanas **de ejemplo** → completar mapeo real.
- Precios de `plan` = extremo bajo de los rangos de los docs.
