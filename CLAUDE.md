# PayMC — web (landing + owner dashboard)

PayMC is a SaaS for monetizing game servers (Minecraft, Rust, GTA V RP, ARK, Unturned, …) for the RU/CIS market:
owners create a donation store, players pay (СБП, cards, SberPay, T-Pay, mobile balance, Kaspi, ЕРИП…), purchases are
delivered in-game automatically (plugin / mod / RCON), owners get daily payouts. This repo is the **frontend concept**:
a selling landing page and the owner dashboard («личный кабинет»), running on deterministic mock data. **No backend.**

@AGENTS.md

## Stack

- Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript strict, pnpm.
- Tailwind CSS v4 — tokens live in `src/app/globals.css` (`@theme`). The default Tailwind palette is **disabled**:
  only brand colors exist (see below). Classes like `bg-blue-500`, `text-gray-400`, `purple-*` do not exist.
- UI primitives: `src/components/ui/*` (Radix via the `radix-ui` package, cva, `cn()` from `@/lib/utils`).
- Charts: `src/components/charts` (Recharts 3, pre-styled: `AreaTrend`, `BarTrend`, `ComboChart`, `Donut`,
  `ChartLegend`, `Heatmap`). Tiny inline charts: `Sparkline` in `src/components/ui/sparkline.tsx`.
- Animation: `motion` (`import { motion, AnimatePresence } from "motion/react"`). Icons: `lucide-react`.
- Toasts: `toast` from `@/components/ui/toaster` (sonner). Command palette: `cmdk`.
- Fonts: Onest (sans, Cyrillic-first) + JetBrains Mono (numbers, labels, code) via `@fontsource-variable`.
- `cacheComponents` is OFF (see `next.config.ts`). Route `params`/`searchParams` are Promises in Next 16 — `await` them
  in server components or use `React.use()`; in client components prefer `useSearchParams()`/`useParams()`.
  Pages using `useSearchParams()` must be wrapped in `<Suspense>`.

## Commands

- `pnpm dev` — dev server. `pnpm typecheck` — `next typegen && tsc --noEmit`. `pnpm lint` — ESLint. `pnpm build`.
- Visual check: Chromium + Playwright are preinstalled (`require('playwright')` with `NODE_PATH=$(npm root -g)`).

## Directory map

```
src/app/(marketing)/…        landing (/) and other public pages — SiteHeader/SiteFooter layout
src/app/dashboard/…          owner dashboard — DashboardShell (sidebar, topbar, ⌘K palette, g+key hotkeys)
src/app/s/[slug]             public demo storefront (what players see)
src/app/design               design-system showcase (/design)
src/components/ui            primitives (Button, Badge, Card, Input/Field, Dialog, Sheet, DropdownMenu, Popover,
                             Tooltip, Tabs, Select, Switch, Checkbox, Slider, Accordion, Segmented, Table, Kbd,
                             Progress, StatusDot, PixelAvatar/Avatar, EmptyState, CodeBlock, CopyButton, Sparkline, Delta)
src/components/charts        chart components
src/components/dashboard     shell + shared dashboard components (PageHeader, SectionTitle, GameChip, nav config)
src/components/marketing     landing sections + SiteHeader/SiteFooter
src/components/brand         Logo / LogoMark
src/lib/mock                 domain types (types.ts = contract) + deterministic mock data + selectors + RU labels (meta.ts)
src/lib/format.ts            ALL number/money/date formatting (ru-RU, Moscow time, plural())
src/lib/games.ts, payments.ts  game + payment-method metadata
```

## Design rules (anti-"AI slop")

The product must look like a crafted, opinionated fintech/devtool — not a template. Hard rules:

- **Palette:** near-black blue-tinted surfaces (`canvas` < `surface` < `surface-2` < `surface-3` < `surface-4`),
  hairlines `line-soft` / `line` / `line-strong`, text `fg` / `fg-2` / `fg-3` / `fg-4`, accents `azure-*` (primary blue),
  `ice-*` (light blue/cyan), `white`. Semantic `ok` / `warn` / `bad` (+ `-soft` backgrounds) only for status.
  No purple, no pink, no rainbow gradients, no gradient text except very rare emphasis.
- **No decorative icon tiles** (icon in a colored rounded square above a feature title). Visuals must be real UI
  fragments, data, consoles, diagrams. Icons are small, inline, functional.
- **No emoji** anywhere in UI. No fake company logos. No stock-photo testimonials.
- **No glassmorphism/blobs/glow orbs.** Depth comes from layered surfaces, 1px hairlines, `shadow-raise`/`shadow-pop`.
  Glow only for focus or a live indicator.
- **Typography:** big confident headings with tight tracking (`text-display`, `text-h1`, `text-h2`, `text-h3`),
  body `text-fg-2`, numbers in `font-mono` + `nums` (tabular). Eyebrows/labels: `label-mono` (mono, uppercase, tracked).
  Left-aligned, asymmetric layouts; don't center everything.
- **Radii** small and consistent: controls `rounded-md`, cards `rounded-xl`, never > `rounded-2xl`.
- **Density:** dashboard is data-dense (13px base text, 32–36px controls, tables h-12 rows). Marketing breathes
  (section padding `py-24`–`py-32`).
- **Motion:** purposeful only — 150–250 ms UI transitions with `ease-[var(--ease-snappy)]`; marketing reveals ≤ 600 ms;
  respect `prefers-reduced-motion` (`useReducedMotion`). No bouncing, no parallax gimmicks.
- **Copy (Russian):** concrete, short, numbers over adjectives. Banned words: «революционный», «инновационный»,
  «уникальный», «раскройте потенциал», «бесшовный», «магия», «будущее уже здесь», «на новый уровень», «мощный».
  Use «вы», sentence case, «ё» where needed, non-breaking spaces before units (helpers in `format.ts` handle numbers).
- Every interactive element needs hover/focus states; every list/table needs an empty state; loading uses `skeleton`.

## Data layer API (`@/lib/mock`)

Demo project: **ArcticMC** (Minecraft network, plan «Рост · 3,9 %»), owner Артём Ковалёв. NOW = 6 Nov 2026 12:00 MSK.

- Time: `NOW`, `NOW_MS`, `DAY`/`HOUR`/`MINUTE`, `daysAgo(n, h, m)`, `ago(ms)`, `later(ms)`, `msk(y, m, d, h)`, `mskDayStart(n)`.
- Catalog: `PROJECTS`, `CURRENT_PROJECT_ID`, `SERVERS` (Лобби, Выживание, Анархия — degraded, SkyBlock — offline),
  `TEAM` (split 60/25/15), `CAMPAIGNS`, `CALENDAR`, `KRAKEN_WIPES`, `EXPERIMENTS`, `INTEGRATIONS`.
- Commerce: `ORDERS` (~5.5k, 90 days, oldest first, **`trace` is empty — call `getOrder(id)` for the full trace**),
  `PLAYERS` (1 180), `PRODUCTS` (24, with `sales30d`, `revenue30d`, `salesTrend`, `eula`, `pool`), `PROMO_CODES`, `CREATORS`.
- Analytics: `DAILY` (200 days of `DailyPoint`), `HOURLY_HEATMAP` (7×24, Mon..Sun × MSK hours, revenue), `METHOD_SPLIT`,
  `COUNTRY_SPLIT`, `CATEGORY_SPLIT`, `SERVER_SPLIT`, `FUNNEL`, `FORECAST` (next 30 days low/mid/high), `ONLINE_NOW`,
  `BUYERS_ONLINE`, `CAMPAIGN_REVENUE_30D`.
- Money: `BALANCE`, `PAYOUTS` (daily, one failed + retried via backup bank), `TAX` (НПД limit tracker data).
- Feed: `ACTIVITY` (newest first).
- Selectors: `getOrders({status|"issues", method, serverId, query, days, productId, playerId})` (newest first),
  `getOrder(id)` (with trace), `getPlayer(id)`, `getPlayerByName(name)`, `getPlayers({segment, query, online, flagged,
  sort})`, `getProduct(id)`, `getServer(id)`, `getOrdersByPlayer(id)`, `getOrdersByProduct(id)`, `getDailySeries(days)`,
  `getKpis(7|30|90)` (+ `pct(cur, prev)`; previous period has the same length — today is only half over),
  `getIssues()`, `getTopProducts(n)`, `getRecentOrders(n)`, `isPaid(order)`, `windowStart(days, offset)` (calendar
  window start, same as `DAILY.slice(-days)` — use it for any «last N days» figure), `splitAmount(gross, members)`
  (exact payout split, remainder to the owner).
- Other libs: `@/lib/games` (`GAMES`, `GAME_LIST` — 16 games with integration info and rules),
  `@/lib/payments` (`PAYMENT_METHODS` with `availability: live|soon`, `LIVE_METHODS`, `COUNTRIES`, `PLAN_FEES`,
  `PLAN_META`, `MOBILE_FEE`, `feeRateFor(turnover)`, `TYPICAL_PLATFORM` / `TYPICAL_WITHDRAWAL_FEE` for anonymous
  competitor comparisons), `@/lib/format` also has `typo()` (no line-leading dashes, sticky prepositions/units),
  `@/lib/command-library` (`COMMAND_LIBRARY`, `VARIABLES`,
  `templatesFor(game)`, `pluginsFor(game)`, `unknownVariables(tpl, game)`).
- `ORDERS`/`PLAYERS` are large: filter/paginate on the server (URL `searchParams`) and pass only the visible slice to
  client components. Never ship the whole array to the browser.

Business facts to keep consistent in copy: one all-inclusive rate **4,9 %** (auto tiers: 3,9 % from 500 тыс ₽/мес,
2,9 % from 3 млн ₽/мес), no subscription; daily payouts at **12:00 МСК** to card/СБП with a backup bank route;
card payments held 24 h, СБП without hold; automatic НПД receipts via «Мой налог» partner access, 54-ФЗ cloud
receipts for ИП/ООО; RU rails live (СБП, Мир, SberPay, T-Pay, ЮMoney, mobile balance), Kaspi/ЕРИП/foreign cards
«скоро»; **no crypto for RU players**; Discord is blocked in RU → Telegram/VK first; FiveM requires Tebex → GTA RP
means RAGE:MP / alt:V.

## Data rules

- Import data from `@/lib/mock` (types from `@/lib/mock/types`, labels/tones from `@/lib/mock/meta`).
- Mock data is deterministic: **never** use `Math.random()`, `Date.now()`, argless `new Date()` in render paths.
  Use `NOW` from `@/lib/mock/now` and `createRng(seed)` from `@/lib/utils`. Hydration must be stable.
- Format everything through `src/lib/format.ts` (`formatMoney`, `formatNumber`, `formatPercent`, `formatDate`,
  `formatRelative(date, NOW)`, `pluralize`, …). Dates render in Moscow time.
- Prefer server components for pages; pass serializable props to small client components for interactivity.
- Mutations are simulated locally (React state + `toast`) — no network calls.

## Done criteria for any page

`pnpm typecheck` and `pnpm lint` clean for your files; renders without console errors; looks right at 1440px and
390px widths (no horizontal page scroll); all copy in Russian.
