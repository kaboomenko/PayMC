/**
 * Same rule as `splitAmount` in @/lib/mock, which PAYOUTS are built with: floor per member,
 * the rounding remainder goes to the owner, so the parts always add up to `gross` exactly.
 * Kept here so client components don't pull the mock dataset into the browser bundle.
 */
export function splitAmount(gross: number, members: { id: string; splitPct: number; role?: string }[]) {
  const parts = members.map((m) => ({ memberId: m.id, amount: Math.floor((gross * m.splitPct) / 100) }));
  const rest = gross - parts.reduce((a, p) => a + p.amount, 0);
  const ownerIdx = Math.max(0, members.findIndex((m) => m.role === "owner"));
  if (parts[ownerIdx]) parts[ownerIdx].amount += rest;
  return parts;
}
