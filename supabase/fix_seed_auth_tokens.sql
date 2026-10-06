-- Fix puntual: pone a '' las columnas de token NULL de los mentores del seed,
-- para que GoTrue permita el login. Alternativa no destructiva a re-aplicar todo.
update auth.users
set confirmation_token          = coalesce(confirmation_token, ''),
    recovery_token              = coalesce(recovery_token, ''),
    email_change_token_new      = coalesce(email_change_token_new, ''),
    email_change                = coalesce(email_change, ''),
    email_change_token_current  = coalesce(email_change_token_current, ''),
    phone_change                = coalesce(phone_change, ''),
    phone_change_token          = coalesce(phone_change_token, ''),
    reauthentication_token      = coalesce(reauthentication_token, '')
where email like '%@tutor247.dev';
