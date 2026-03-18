import { createFileRoute } from "@tanstack/react-router";

import ComputoApp from "@/features/computo/components/computo-app";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ComputoApp />;
}
