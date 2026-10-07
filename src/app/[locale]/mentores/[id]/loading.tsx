import { PageSkeleton } from "@/components/page-skeleton";

// Suspense de la ruta: `params` se lee dentro y la navegación es instantánea.
export default function Loading() {
  return <PageSkeleton />;
}
