/**
 * Mock data entry point. Server components can import anything from here;
 * pass only the slices a client component needs as props.
 */
export * from "./now";
export {
  PROJECTS,
  CURRENT_PROJECT_ID,
  SERVERS,
  TEAM,
  CAMPAIGNS,
  CALENDAR,
  KRAKEN_WIPES,
  EXPERIMENTS,
  INTEGRATIONS,
} from "./catalog";
export { ORDERS, PLAYERS, PRODUCTS, PROMO_CODES, CREATORS } from "./orders";
export {
  DAILY,
  HOURLY_HEATMAP,
  METHOD_SPLIT,
  COUNTRY_SPLIT,
  CATEGORY_SPLIT,
  SERVER_SPLIT,
  FUNNEL,
  FORECAST,
  BALANCE,
  PAYOUTS,
  TAX,
  ACTIVITY,
  ONLINE_NOW,
  BUYERS_ONLINE,
  CAMPAIGN_REVENUE_30D,
  splitAmount,
} from "./analytics";
export * from "./selectors";
export { buildTrace, withTrace } from "./trace";
