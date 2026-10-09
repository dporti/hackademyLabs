import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // /familias se integró en /tutor247 (DISENO.md §2, decisión 5): redirección permanente (308).
  async redirects() {
    return [
      { source: "/familias", destination: "/tutor247#familias", permanent: true },
      { source: "/:locale(ca)/familias", destination: "/:locale/tutor247#familias", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
