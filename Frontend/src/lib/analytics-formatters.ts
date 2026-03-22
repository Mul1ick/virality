const ACTION_TYPE_LABELS: Record<string, string> = {
  add_payment_info: "Add payment info",
  add_to_cart: "Add to cart",
  app_install: "App installs",
  begin_checkout: "Checkout starts",
  checkout_initiated: "Checkout starts",
  complete_registration: "Registrations",
  initiate_checkout: "Checkout starts",
  landing_page_view: "Landing page views",
  lead: "Leads",
  link_click: "Link clicks",
  page_engagement: "Page engagements",
  page_view: "Page views",
  post_engagement: "Post engagements",
  purchase: "Purchases",
  purchase_roas: "Purchase ROAS",
  search: "Searches",
  subscribe: "Subscriptions",
  view_content: "Product views",
};

const MONEY_KEYS = [
  "spend",
  "revenue",
  "sales",
  "cost",
  "amount",
  "price",
  "cpc",
  "cpm",
  "aov",
  "avg_order_value",
  "average_order_value",
];

const PERCENT_KEYS = ["ctr", "roas", "rate", "percentage"];

const PRIMARY_DETAIL_KEYS = [
  "platform",
  "date",
  "date_start",
  "date_stop",
  "spend",
  "totalSpend",
  "revenue",
  "totalRevenue",
  "impressions",
  "reach",
  "clicks",
  "link_clicks",
  "purchases",
  "conversions",
  "orders",
  "add_to_cart",
  "ctr",
  "cpc",
  "cpm",
];

const NAME_KEYS = [
  "campaign_name",
  "adset_name",
  "ad_name",
  "name",
  "title",
  "product_name",
  "order_name",
];

const IGNORED_KEYS = new Set([
  "id",
  "_id",
  "actions",
  "action_breakdown",
  "action_breakdowns",
  "campaign_name",
  "adset_name",
  "ad_name",
  "name",
  "title",
  "product_name",
  "order_name",
]);

type UnknownRecord = Record<string, unknown>;

const isObject = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isMeaningfulValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return true;
};

export const safeParseJsonDeep = <T>(
  value: T,
  depthLimit = 5,
  depth = 0
): unknown => {
  if (depth >= depthLimit) return value;

  if (typeof value === "string") {
    const candidate = value.trim();
    if (!candidate) return value;

    const looksLikeJson =
      (candidate.startsWith("{") && candidate.endsWith("}")) ||
      (candidate.startsWith("[") && candidate.endsWith("]"));

    if (!looksLikeJson) return value;

    try {
      const parsed = JSON.parse(candidate);
      if (parsed === value) return value;
      return safeParseJsonDeep(parsed, depthLimit, depth + 1);
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => safeParseJsonDeep(item, depthLimit, depth + 1));
  }

  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        safeParseJsonDeep(nestedValue, depthLimit, depth + 1),
      ])
    );
  }

  return value;
};

export const formatCurrencyINR = (
  value: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {}
) => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number.parseFloat(value)
      : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(0);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(numericValue);
};

export const formatNumberIN = (
  value: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {}
) => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number.parseFloat(value)
      : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return new Intl.NumberFormat("en-IN", options).format(0);
  }

  return new Intl.NumberFormat("en-IN", options).format(numericValue);
};

export const formatCompactNumberIN = (
  value: number | string | null | undefined
) =>
  formatNumberIN(value, {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  });

export const formatPercentage = (
  value: number | string | null | undefined,
  digits = 2
) => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number.parseFloat(value)
      : Number.NaN;

  return `${Number.isFinite(numericValue) ? numericValue.toFixed(digits) : "0.00"}%`;
};

export const formatActionTypeLabel = (actionType: string) =>
  ACTION_TYPE_LABELS[actionType] ||
  actionType.replace(/\./g, " ").replace(/_/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());

const isNumericLike = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;
  const normalized = value.trim().replace(/,/g, "");
  return normalized.length > 0 && !Number.isNaN(Number(normalized));
};

const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDateLabel = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: parsed.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
};

const getNestedValue = (row: UnknownRecord, keys: string[]) => {
  for (const key of keys) {
    if (key in row && isMeaningfulValue(row[key])) return row[key];
  }

  if (isObject(row._id)) {
    for (const key of keys) {
      if (key in row._id && isMeaningfulValue(row._id[key])) return row._id[key];
    }
  }

  return null;
};

const aggregateActions = (value: unknown) => {
  const totals: Record<string, number> = {};
  const sources = Array.isArray(value) ? value : isObject(value) ? [value] : [];

  for (const source of sources) {
    if (Array.isArray(source)) continue;

    if (isObject(source) && ("action_type" in source || "type" in source)) {
      const actionType = String(source.action_type || source.type || "").trim();
      const actionValue = toNumber(source.value);
      if (actionType && actionValue !== null) {
        totals[actionType] = (totals[actionType] || 0) + actionValue;
      }
      continue;
    }

    if (isObject(source)) {
      for (const [actionType, actionValue] of Object.entries(source)) {
        const numericValue = toNumber(actionValue);
        if (numericValue !== null) {
          totals[actionType] = (totals[actionType] || 0) + numericValue;
        }
      }
    }
  }

  return totals;
};

const resolveRowName = (row: UnknownRecord, fallbackIndex: number) => {
  for (const key of NAME_KEYS) {
    const value = getNestedValue(row, [key]);
    if (isMeaningfulValue(value)) return String(value);
  }

  if (typeof row._id === "string" && row._id.trim()) return row._id;
  return `Item ${fallbackIndex + 1}`;
};

const formatLabel = (key: string) =>
  formatActionTypeLabel(key)
    .replace(/\bCtr\b/g, "CTR")
    .replace(/\bCpc\b/g, "CPC")
    .replace(/\bCpm\b/g, "CPM")
    .replace(/\bRoas\b/g, "ROAS");

const formatMetricValue = (key: string, value: unknown) => {
  if (!isMeaningfulValue(value)) return null;

  const normalizedKey = key.toLowerCase();
  const numericValue = toNumber(value);

  if (normalizedKey.includes("date")) {
    return formatDateLabel(value);
  }

  if (numericValue !== null) {
    if (MONEY_KEYS.some((moneyKey) => normalizedKey.includes(moneyKey))) {
      return formatCurrencyINR(numericValue);
    }
    if (PERCENT_KEYS.some((percentKey) => normalizedKey.includes(percentKey))) {
      return formatPercentage(numericValue);
    }
    if (Number.isInteger(numericValue)) {
      return formatNumberIN(numericValue, { maximumFractionDigits: 0 });
    }
    return formatNumberIN(numericValue, { maximumFractionDigits: 2 });
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const scalarValues = value.filter(
      (item) =>
        typeof item === "string" || typeof item === "number" || typeof item === "boolean"
    );
    if (scalarValues.length === value.length) {
      return scalarValues.join(", ");
    }
  }

  return null;
};

const buildRowEntries = (row: UnknownRecord) => {
  const entries: string[] = [];
  const usedKeys = new Set<string>();

  for (const key of PRIMARY_DETAIL_KEYS) {
    const value = getNestedValue(row, [key]);
    const formatted = formatMetricValue(key, value);
    if (formatted) {
      entries.push(`${formatLabel(key)}: ${formatted}`);
      usedKeys.add(key);
    }
  }

  const actionTotals = {
    ...aggregateActions(row.actions),
    ...aggregateActions(row.action_breakdown),
    ...aggregateActions(row.action_breakdowns),
  };

  for (const [actionType, total] of Object.entries(actionTotals)) {
    const actionLabel = formatActionTypeLabel(actionType);
    entries.push(`${actionLabel}: ${formatNumberIN(total, { maximumFractionDigits: 0 })}`);
  }

  for (const [key, value] of Object.entries(row)) {
    if (usedKeys.has(key) || IGNORED_KEYS.has(key)) continue;
    const formatted = formatMetricValue(key, value);
    if (formatted) {
      entries.push(`${formatLabel(key)}: ${formatted}`);
    }
  }

  return entries;
};

const summarizeResults = (platform: string, normalizedResults: UnknownRecord[]) => {
  const totals = {
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
  };
  let purchases = 0;
  let addToCart = 0;
  let topRow: UnknownRecord | null = null;
  let topScore: number | null = null;

  for (const row of normalizedResults) {
    totals.spend += toNumber(getNestedValue(row, ["spend", "totalSpend", "total_spend"])) || 0;
    totals.impressions +=
      toNumber(getNestedValue(row, ["impressions", "totalImpressions", "total_impressions"])) || 0;
    totals.clicks += toNumber(getNestedValue(row, ["clicks", "totalClicks", "total_clicks"])) || 0;
    totals.conversions +=
      toNumber(
        getNestedValue(row, ["conversions", "totalConversions", "total_conversions", "purchases"])
      ) || 0;
    totals.revenue +=
      toNumber(getNestedValue(row, ["revenue", "totalRevenue", "total_revenue", "sales"])) || 0;

    const actionTotals = aggregateActions(row.actions);
    purchases += actionTotals.purchase || 0;
    addToCart += actionTotals.add_to_cart || 0;

    const rowScore =
      (actionTotals.purchase || 0) * 100000 +
      (toNumber(getNestedValue(row, ["conversions", "totalConversions"])) || 0) * 10000 +
      (toNumber(getNestedValue(row, ["clicks", "totalClicks"])) || 0);

    if (topScore === null || rowScore > topScore) {
      topScore = rowScore;
      topRow = row;
    }
  }

  const subjectMap: Record<string, string> = {
    meta: "Meta campaigns",
    meta_ads: "Meta ads",
    meta_adsets: "Meta ad sets",
    google_campaigns: "Google campaigns",
    google_ads: "Google ads",
    google_adsets: "Google ad groups",
    shopify: "Shopify data",
  };

  const subject = subjectMap[platform] || "Selected data";
  const sentences: string[] = [];
  const primaryBits: string[] = [];

  if (totals.spend > 0) primaryBits.push(`spent ${formatCurrencyINR(totals.spend, { maximumFractionDigits: 0 })}`);
  if (totals.revenue > 0) primaryBits.push(`generated ${formatCurrencyINR(totals.revenue, { maximumFractionDigits: 0 })} in revenue`);
  if (totals.impressions > 0) primaryBits.push(`delivered ${formatCompactNumberIN(totals.impressions)} impressions`);
  if (totals.clicks > 0) primaryBits.push(`drove ${formatNumberIN(totals.clicks, { maximumFractionDigits: 0 })} clicks`);

  if (primaryBits.length === 1) {
    sentences.push(`${subject} ${primaryBits[0]}.`);
  } else if (primaryBits.length > 1) {
    sentences.push(
      `${subject} ${primaryBits.slice(0, -1).join(", ")} and ${
        primaryBits[primaryBits.length - 1]
      }.`
    );
  }

  const conversionBits: string[] = [];
  if (purchases > 0) conversionBits.push(`${formatNumberIN(purchases, { maximumFractionDigits: 0 })} purchases`);
  if (addToCart > 0) conversionBits.push(`${formatNumberIN(addToCart, { maximumFractionDigits: 0 })} add-to-cart actions`);
  if (totals.conversions > 0 && purchases === 0) {
    conversionBits.push(`${formatNumberIN(totals.conversions, { maximumFractionDigits: 0 })} conversions`);
  }

  if (conversionBits.length > 0) {
    sentences.push(`There were ${conversionBits.join(" and ")}.`);
  }

  if (topRow) {
    const topName = resolveRowName(topRow, 0);
    const topDate =
      formatDateLabel(getNestedValue(topRow, ["date_start", "date", "created_at"])) || null;
    if (topName) {
      const suffix = topDate ? ` on ${topDate}` : "";
      sentences.push(`The strongest row was ${topName}${suffix}.`);
    }
  }

  if (totals.clicks > 0 && purchases === 0) {
    sentences.push(
      "Traffic is coming through, but it is not converting into purchases yet, which suggests a landing-page or audience-quality issue."
    );
  }

  return sentences.slice(0, 4).join(" ");
};

export const normalizeAnalyticsResults = (results: unknown): UnknownRecord[] => {
  const parsed = safeParseJsonDeep(results);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isObject);
};

export const buildMarketingSummary = (platform: string, results: unknown) =>
  summarizeResults(platform, normalizeAnalyticsResults(results));

export const buildReadableBreakdown = (results: unknown, limit = 5) => {
  const normalizedResults = normalizeAnalyticsResults(results);
  if (normalizedResults.length === 0) return "";

  const lines = normalizedResults.slice(0, limit).map((row, index) => {
    const rowName = resolveRowName(row, index);
    const entries = buildRowEntries(row).filter(Boolean);
    if (entries.length === 0) return `• ${rowName}`;
    return `• ${rowName}: ${entries.slice(0, 8).join(", ")}`;
  });

  if (normalizedResults.length > limit) {
    lines.push(`• ${formatNumberIN(normalizedResults.length - limit, { maximumFractionDigits: 0 })} more items not shown`);
  }

  return lines.join("\n");
};

export const buildDebugJson = (value: unknown) =>
  JSON.stringify(safeParseJsonDeep(value), null, 2);
