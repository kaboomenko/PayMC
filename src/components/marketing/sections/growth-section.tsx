import {
  CAMPAIGNS,
  CAMPAIGN_REVENUE_30D,
  CREATORS,
  DAY,
  EXPERIMENTS,
  HOUR,
  KRAKEN_WIPES,
  NOW_MS,
  getOrdersByProduct,
  getProduct,
  getServer,
  msk,
} from "@/lib/mock";
import { channelMeta, creatorPlatformMeta } from "@/lib/mock/meta";
import { formatDate, formatDateShort, formatMoney, formatTime, formatWeekday } from "@/lib/format";
import { Section, SectionHeading } from "@/components/marketing/section";
import { GrowthDemo } from "@/components/marketing/landing-b/growth-demo";
import { GROWTH_SCENARIOS, SCENARIO_CAMPAIGN, type CampaignSummary, type ScenarioId } from "@/components/marketing/landing-b/growth-scenarios";
import { Tile } from "@/components/marketing/landing-b/tile";
import { AbTest, CreatorBoard, WipeStrip, type WipeDay } from "@/components/marketing/landing-b/growth-tiles";
import { PoolTile } from "@/components/marketing/landing-b/pool-tile";
import { SubscriptionTile } from "@/components/marketing/landing-b/subscription-tile";
import { CheckoutTile, type CheckoutItem } from "@/components/marketing/landing-b/checkout-tile";

function campaignSummaries(): Record<ScenarioId, CampaignSummary> {
  const out = {} as Record<ScenarioId, CampaignSummary>;
  for (const s of GROWTH_SCENARIOS) {
    const c = CAMPAIGNS.find((x) => x.id === SCENARIO_CAMPAIGN[s.id]);
    if (!c) continue;
    out[s.id] = {
      name: c.name,
      trigger: c.trigger,
      channels: c.channels.map((ch) => channelMeta[ch].label),
      offer: c.offer?.discountPct ? `−${c.offer.discountPct} % на ${c.offer.ttlHours} ч` : c.offer?.productId ? "подарок при входе" : null,
      reached: c.stats.reached,
      clicked: c.stats.clicked,
      converted: c.stats.converted,
      revenue: c.stats.revenue,
    };
  }
  return out;
}

function countdown(ms: number) {
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  return d > 0 ? `через ${d} дн ${h} ч` : `через ${h} ч`;
}

function wipeCalendar() {
  const start = Date.parse(msk(2026, 11, 2));
  const count = 28;
  const wipes = KRAKEN_WIPES.map((w) => ({ ...w, t: Date.parse(w.start) }));
  const todayIdx = Math.floor((NOW_MS - start) / DAY);
  const raw = Array.from({ length: count }, (_, i) => {
    const t = start + i * DAY + 12 * HOUR;
    const wd = formatWeekday(t);
    const weekend = wd === "сб" || wd === "вс";
    const wipe = wipes.find((w) => w.t >= start + i * DAY && w.t < start + (i + 1) * DAY);
    const afterWipe = wipes.some((w) => w.t >= start + (i - 1) * DAY && w.t < start + i * DAY);
    const v = wipe ? 1 + (wipe.expectedUplift ?? 100) / 100 : afterWipe ? 1.45 : weekend ? 1.15 : 0.92 + ((i * 37) % 9) / 60;
    return {
      n: Number(formatDateShort(t).split(" ")[0]),
      wd,
      weekend,
      past: i < todayIdx,
      today: i === todayIdx,
      v,
      wipe: wipe ? { discount: wipe.discountPct ?? 10, global: wipe.serverIds?.length === 2 } : undefined,
    };
  });
  const max = Math.max(...raw.map((d) => d.v));
  const days: WipeDay[] = raw.map(({ v, ...d }) => ({ ...d, h: v / max }));
  const next = wipes.find((w) => w.t > NOW_MS) ?? wipes[wipes.length - 1];
  return {
    days,
    next: {
      when: `${formatWeekday(next.t)}, ${formatDate(next.t, { year: false })} · ${formatTime(next.t)}`,
      title: next.title,
      discount: next.discountPct ?? 10,
      countdown: countdown(next.t - NOW_MS),
      uplift: next.expectedUplift ?? 100,
    },
  };
}

export function GrowthSection() {
  const campaigns = campaignSummaries();
  const online = getServer("srv-survival")?.online ?? 0;

  const owedCreators = [...CREATORS].filter((c) => c.status === "active" || c.owed > 0).sort((a, b) => b.revenue - a.revenue);
  const creators = owedCreators
    .slice(0, 4)
    .map((c) => ({
      id: c.id,
      name: c.name,
      platform: creatorPlatformMeta[c.platform].label,
      code: c.code,
      share: c.sharePct,
      revenue: c.revenue,
      owed: c.owed,
    }));
  // everyone who is owed money tomorrow — the rows above plus the ones that don't fit
  const hidden = owedCreators.slice(4);
  const creatorsRest = { count: hidden.length, owed: hidden.reduce((a, c) => a + c.owed, 0) };
  const totalOwed = owedCreators.reduce((a, c) => a + c.owed, 0);

  const pool = getProduct("p-pool-xp");
  const poolNames = [...new Set(getOrdersByProduct("p-pool-xp", 40).map((o) => o.playerName))];

  const exp = EXPERIMENTS.find((e) => e.id === "exp-frost-price") ?? EXPERIMENTS[0];
  const [va, vb] = exp.variants.map((v) => ({
    name: v.name,
    price: Number(v.name.replace(/\D/g, "")),
    visitors: v.visitors,
    rpv: v.revenue / v.visitors,
    conv: (v.conversions / v.visitors) * 100,
  }));
  const daysLeft = exp.endsAt ? Math.max(0, Math.round((Date.parse(exp.endsAt) - NOW_MS) / DAY)) : 0;

  const sub = getProduct("p-frost-sub");
  const nextCharge = formatDate(NOW_MS + 30 * DAY, { year: false });

  const checkoutItems: CheckoutItem[] = ["p-snow", "p-frost", "p-blizzard", "p-case-ice", "p-coins-1k", "p-pet-fox", "p-kit-start"]
    .map((id) => getProduct(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      glyph: p.glyph,
      caption: p.durationDays ? `${p.category} · ${p.durationDays} дней` : p.category,
    }));

  const wipe = wipeCalendar();

  return (
    <Section id="growth">
      <SectionHeading
        index="02"
        eyebrow="Рост"
        title={"Маркетинг там, где игроки\u00a0—"}
        muted="внутри игры, а не в почте"
        lead="Кампании срабатывают от событий на сервере: брошенная оплата, конец привилегии, игрок пропал на две недели. Сообщение приходит в чат, боссбар или титр — туда, куда игрок и так смотрит."
        aside={
          <div className="border-l border-line pl-4 lg:mb-1">
            <p className="font-mono text-[26px] font-medium tracking-[-0.02em] text-fg nums">{formatMoney(CAMPAIGN_REVENUE_30D)}</p>
            <p className="mt-1 max-w-[220px] text-[12.5px] leading-snug text-fg-3">принесли кампании ArcticMC за 30 дней — без рассылок на почту</p>
          </div>
        }
      />

      <GrowthDemo campaigns={campaigns} online={online} />

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
        <Tile
          className="md:col-span-2 lg:col-span-7"
          title="Вайп-календарь"
          desc="Отметьте вайпы и сезоны один раз — скидка, сообщение в игре и пост в Telegram включатся по расписанию."
          meta={<span className="label-mono hidden text-fg-4 sm:inline">Kraken Rust · ноябрь</span>}
        >
          <WipeStrip days={wipe.days} next={wipe.next} />
        </Tile>

        <Tile
          className="md:col-span-2 lg:col-span-5"
          title="Коды блогеров"
          desc="У каждого блогера свой код и процент. Доля считается с каждой покупки и уходит ему сама."
        >
          <CreatorBoard rows={creators} rest={creatorsRest} totalOwed={totalOwed} />
        </Tile>

        <Tile
          className="md:col-span-1 lg:col-span-5 lg:row-span-2"
          title="Покупка не выходя из игры"
          desc="/donate открывает меню прямо на сервере, а QR для оплаты по СБП рисуется на карте в руке."
        >
          <CheckoutTile items={checkoutItems} />
        </Tile>

        <Tile
          className="md:col-span-1 lg:col-span-7"
          title="Складчина"
          desc="Игроки скидываются на общий бонус для сервера. Не собрали к сроку — взносы вернутся сами."
        >
          {pool?.pool ? (
            <PoolTile
              name={pool.name}
              target={pool.pool.target}
              raised={pool.pool.raised}
              contributors={pool.pool.contributors}
              endsIn={countdown(Date.parse(pool.pool.endsAt) - NOW_MS).replace("через ", "")}
              names={poolNames}
            />
          ) : null}
        </Tile>

        <Tile
          className="md:col-span-1 lg:col-span-4"
          title="A/B-тест цены"
          desc="Половина игроков видит 299 ₽, половина — 349 ₽. Победителя выбирает выручка на посетителя."
        >
          <AbTest a={va} b={vb} probability={exp.probabilityToBeat ?? 0} daysLeft={daysLeft} />
        </Tile>

        <Tile className="md:col-span-1 lg:col-span-3" title="Подписка по СБП" desc="Frost+ продлевается сам. Отмена — в один клик.">
          <SubscriptionTile price={sub?.price ?? 249} subscribers={sub?.sales30d ?? 0} nextCharge={nextCharge} />
        </Tile>
      </div>
    </Section>
  );
}
