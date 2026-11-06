import { GAMES } from "@/lib/games";
import type { GameId } from "@/lib/mock/types";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const { game } = await searchParams;
  const initial = typeof game === "string" && game in GAMES ? (game as GameId) : "minecraft";
  return <OnboardingWizard initialGame={initial} />;
}
