/**
 * Live "game rules" check for the product editor. Scans what the player will
 * read (description, perks) and what the server will execute (commands) for
 * pay-to-win signals. Pure function — runs on every keystroke.
 */

export type RuleKind = "advantage" | "grey" | "cosmetic";
export type RuleWhere = "description" | "perk" | "command";

export interface RuleHit {
  term: string;
  kind: RuleKind;
  where: RuleWhere;
  /** perk / command index */
  index?: number;
  text: string;
}

export interface RulesVerdict {
  level: "ok" | "warn" | "risk" | "none";
  hits: RuleHit[];
  advantage: RuleHit[];
  grey: RuleHit[];
  cosmetic: RuleHit[];
}

const NOT_LETTER = "(?<![\\p{L}])";

const RULES: { re: RegExp; term: string; kind: RuleKind }[] = [
  // gameplay advantage — the rules forbid selling these
  { re: /\/fly|\bfly\b/iu, term: "/fly", kind: "advantage" },
  { re: /\/god|\bgod\b|бессмерт/iu, term: "god", kind: "advantage" },
  { re: /брон[яеиюё]/iu, term: "броня", kind: "advantage" },
  { re: new RegExp(`${NOT_LETTER}набор`, "iu"), term: "набор", kind: "advantage" },
  { re: /\bkits?\b/iu, term: "kit", kind: "advantage" },
  { re: /алмаз|незерит/iu, term: "алмазы", kind: "advantage" },
  { re: /ресурс/iu, term: "ресурсы", kind: "advantage" },
  { re: /урон|\bdamage\b/iu, term: "урон", kind: "advantage" },
  { re: /оружи|\bweapon/iu, term: "оружие", kind: "advantage" },
  // grey zone — depends on how it's worded
  { re: new RegExp(`${NOT_LETTER}дом(а|ов)?(?![\\p{L}])`, "iu"), term: "дома", kind: "grey" },
  { re: /приват/iu, term: "приват", kind: "grey" },
  { re: /\bxp\b|опыт/iu, term: "опыт", kind: "grey" },
  // cosmetic & server-wide — allowed
  { re: /префикс|prefix/iu, term: "префикс", kind: "cosmetic" },
  { re: /питом|\bpets?\./iu, term: "питомец", kind: "cosmetic" },
  { re: /частиц|particle/iu, term: "частицы", kind: "cosmetic" },
  { re: /плащ|\bcapes?\./iu, term: "плащ", kind: "cosmetic" },
  { re: /цвет\p{L}* ник|ник\p{L}* цвет/iu, term: "цвет ника", kind: "cosmetic" },
  { re: /для всего сервера|для всех игроков|общесервер|\bglobal\b/iu, term: "общесерверный бонус", kind: "cosmetic" },
];

export function checkRules(input: { description: string; perks: string[]; commands: string[] }): RulesVerdict {
  const hits: RuleHit[] = [];
  const scan = (text: string, where: RuleWhere, index?: number) => {
    if (!text.trim()) return;
    for (const r of RULES) {
      if (r.re.test(text)) hits.push({ term: r.term, kind: r.kind, where, index, text });
    }
  };
  scan(input.description, "description");
  input.perks.forEach((p, i) => scan(p, "perk", i));
  input.commands.forEach((c, i) => scan(c, "command", i));

  const advantage = hits.filter((h) => h.kind === "advantage");
  const grey = hits.filter((h) => h.kind === "grey");
  const cosmetic = hits.filter((h) => h.kind === "cosmetic");
  // a global booster mentions "опыт" but is allowed — server-wide cancels the grey flag
  const serverWide = cosmetic.some((h) => h.term === "общесерверный бонус");
  const greyEffective = serverWide ? grey.filter((h) => h.term !== "опыт") : grey;

  const level: RulesVerdict["level"] = advantage.length
    ? "risk"
    : greyEffective.length
      ? "warn"
      : cosmetic.length
        ? "ok"
        : "none";
  return { level, hits, advantage, grey: greyEffective, cosmetic };
}

export function uniqueTerms(hits: RuleHit[]) {
  return [...new Set(hits.map((h) => h.term))];
}
