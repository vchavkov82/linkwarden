const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "gclsrc",
  "dclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "twclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
  "ref_url",
  "_ga",
  "_gl",
]);

export interface NormalizeUrlOptions {
  stripFragment?: boolean;
  stripTrackingParams?: boolean;
  stripWww?: boolean;
  forceHttps?: boolean;
}

const DEFAULT_OPTIONS: NormalizeUrlOptions = {
  stripFragment: true,
  stripTrackingParams: true,
  stripWww: false,
  forceHttps: false,
};

export function normalizeUrl(
  urlString: string | null | undefined,
  options: NormalizeUrlOptions = {}
): string | null {
  if (!urlString) return null;

  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    let url = new URL(urlString.trim());

    url.hostname = url.hostname.toLowerCase();

    if (url.protocol === "http:" && url.port === "80") {
      url.port = "";
    } else if (url.protocol === "https:" && url.port === "443") {
      url.port = "";
    }

    if (opts.forceHttps && url.protocol === "http:") {
      url.protocol = "https:";
    }

    if (opts.stripWww && url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
    }

    if (opts.stripFragment) {
      url.hash = "";
    }

    if (opts.stripTrackingParams) {
      const paramsToDelete: string[] = [];
      url.searchParams.forEach((_, key) => {
        if (TRACKING_PARAMS.has(key.toLowerCase())) {
          paramsToDelete.push(key);
        }
      });
      paramsToDelete.forEach((key) => url.searchParams.delete(key));
    }

    url.searchParams.sort();

    let normalized = url.toString();

    normalized = normalized.replace(/\/+$/, "");

    return normalized;
  } catch {
    return urlString.trim().replace(/\/+$/, "").toLowerCase();
  }
}

export function getUrlVariants(normalizedUrl: string | null): string[] {
  if (!normalizedUrl) return [];

  try {
    const url = new URL(normalizedUrl);
    const variants: string[] = [normalizedUrl];

    if (url.hostname.startsWith("www.")) {
      const withoutWww = new URL(normalizedUrl);
      withoutWww.hostname = withoutWww.hostname.slice(4);
      variants.push(withoutWww.toString().replace(/\/+$/, ""));
    } else {
      const withWww = new URL(normalizedUrl);
      withWww.hostname = "www." + withWww.hostname;
      variants.push(withWww.toString().replace(/\/+$/, ""));
    }

    return Array.from(new Set(variants));
  } catch {
    return [normalizedUrl];
  }
}
