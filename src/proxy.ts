import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Aplica a todas las rutas salvo API, estáticos de Next, y ficheros con extensión.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
