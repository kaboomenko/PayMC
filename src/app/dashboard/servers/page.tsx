import type { Metadata } from "next";
import { CURRENT_PROJECT_ID, NOW_MS, PROJECTS } from "@/lib/mock";
import { ServersView } from "@/components/dashboard/servers/servers-view";
import { buildServersData } from "@/components/dashboard/servers/server-data";

export const metadata: Metadata = { title: "Серверы" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ServersPage({ searchParams }: PageProps<"/dashboard/servers">) {
  const sp = await searchParams;
  const project = PROJECTS.find((p) => p.id === CURRENT_PROJECT_ID)!;
  const { servers, queues, journals, incident } = buildServersData();

  return (
    <ServersView
      servers={servers}
      queues={queues}
      journals={journals}
      incident={incident}
      initialServerId={one(sp.server) ?? null}
      initialConnect={one(sp.connect) === "1"}
      connectKey="pk_live_7Hq2Xc9LmV4tRb8NwK3d"
      game={project.game}
      now={NOW_MS}
    />
  );
}
