/**
 * Published drop chances for the demo cases. The storefront shows them on the
 * case card and in checkout, so «шансы открыты» is something players can check.
 * Each table sums to exactly 100 %.
 */
export interface CaseReward {
  name: string;
  /** percent, 0..100 */
  chance: number;
}

export interface CaseOdds {
  /** shown above the table */
  note: string;
  rewards: CaseReward[];
}

const ICE: CaseReward[] = [
  { name: "150 снежинок", chance: 22 },
  { name: "Частицы «Иней» · 7 дней", chance: 16 },
  { name: "300 снежинок", chance: 14 },
  { name: "Шапка «Ушанка»", chance: 12 },
  { name: "Частицы «Снегопад»", chance: 9 },
  { name: "Титул [Мороз]", chance: 8 },
  { name: "600 снежинок", chance: 6 },
  { name: "Питомец «Снеговик»", chance: 5 },
  { name: "Плащ «Иней»", chance: 4 },
  { name: "След «Северное сияние»", chance: 2.5 },
  { name: "2 000 снежинок", chance: 1 },
  { name: "Питомец «Песец»", chance: 0.5 },
];

const AURORA: CaseReward[] = [
  { name: "300 снежинок", chance: 21 },
  { name: "Частицы «Сияние»", chance: 15 },
  { name: "Плащ «Полярная ночь»", chance: 12 },
  { name: "Питомец «Пингвин»", chance: 11 },
  { name: "Шапка «Ледяная корона»", chance: 10 },
  { name: "Плащ «Северное сияние»", chance: 9 },
  { name: "1 000 снежинок", chance: 8 },
  { name: "Питомец «Белый медведь»", chance: 6 },
  { name: "Питомец «Песец»", chance: 4 },
  { name: "След «Звездопад»", chance: 2.5 },
  { name: "Привилегия Aurora · 7 дней", chance: 1 },
  { name: "Питомец «Ледяной дракон»", chance: 0.5 },
];

const ODDS: Record<string, CaseOdds> = {
  "p-case-ice": { note: "12 наград. Одна и та же не выпадет три раза подряд.", rewards: ICE },
  "p-case-aurora": { note: "12 наград: питомцы, плащи и шанс на Aurora.", rewards: AURORA },
  "p-keys-10": { note: "Ключи от кейса «Ледяной» — шансы те же для каждого ключа.", rewards: ICE },
};

export function caseOdds(productId: string): CaseOdds | null {
  return ODDS[productId] ?? null;
}
