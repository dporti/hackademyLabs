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
    20261007090100_student_modulo.sql     Módulos que prepara el alumno (F1.4)
    20261007090200_role_guards.sql        Guardas de rol/verificación (F1.5)
    20261007090300_family_link.sql        Vinculación familia ↔ alumno + consentimiento
    20261008090100_tickets_bookings.sql   Tickets y reservas: tarifas, RPC de cobro, ganancias (F2.1)
  seed.sql                                Catálogo + RA (0485/0484) + 3 mentores de prueba
  apply_all.sql                           Todo junto, re-ejecutable (generado)
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
`apply_all.sql` se regenera con `node scripts/build-apply-all.mjs` tras tocar
migraciones o seed (no editarlo a mano).
Aplica las migraciones en orden y luego `seed.sql` (SQL Editor del panel, la CLI
con `supabase db push`, o el MCP de Supabase). Copia URL y keys a `.env.local`.

## Reglas que refleja el esquema
- **Ledger inmutable**: `credit_ledger` sin UPDATE/DELETE (triggers lo bloquean).
  El saldo se calcula con `credit_balance(student)` / `my_credit_balance()`.
- **Consumo de créditos (F2.1)**: tickets y reservas se crean, cancelan y completan
  SOLO con RPC (`create_ticket`, `create_booking`…) ejecutables por service role; cobro
  y alta en la misma transacción, precio desde `product_price`, devoluciones como
  movimiento `devolucion` y ganancias del mentor en `mentor_earning` (inmutable).
- **RLS en todo**: catálogo de lectura pública; datos personales solo el dueño/admin.
- **Anti-bypass**: mentores públicos vía vista `mentor_public` (sin email/contacto).
- **Verificación de mentor**: solo admin cambia `status`/`level`; un alta de mentor
  entra siempre como pendiente (trigger `guard_mentor_status`).
- **Roles**: nadie se cambia su propio `role` (trigger `guard_profile_role`) y el
  registro solo admite alumno/familia/mentor. Admin: `node scripts/make-admin.mjs <email>`.

## Pendiente de validar en los datos
- RA de 0485/0484 son orientativos → contrastar con BOE/decreto autonómico.
- `modulo_equiv_cat` lleva equivalencias catalanas **de ejemplo** → completar mapeo real.
- Precios de `plan` = extremo bajo de los rangos de los docs.
