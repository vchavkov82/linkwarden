import fetch from "node-fetch";
import https from "https";
import http from "http";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

export default async function fetchTitleAndHeaders(
  url: string,
  content?: string
) {
  if (!url?.startsWith("http://") && !url?.startsWith("https://"))
    return { title: "", headers: null };

  try {
    const httpsAgent = url?.startsWith("http://")
      ? new http.Agent({})
      : new https.Agent({
          rejectUnauthorized:
            process.env.IGNORE_UNAUTHORIZED_CA === "true" ? false : true,
        });

    // fetchOpts allows a proxy to be defined
    let fetchOpts = {
      agent: httpsAgent,
    };

    if (process.env.PROXY) {
      // parse proxy url
      let proxy = new URL(process.env.PROXY);
      // if authentication set, apply to proxy URL
      if (process.env.PROXY_USERNAME) {
        proxy.username = process.env.PROXY_USERNAME;
        proxy.password = process.env.PROXY_PASSWORD || "";
      }

      const proxyAgent = proxy.protocol.includes("http")
        ? HttpsProxyAgent
        : SocksProxyAgent;

      // add socks5/http/https proxy to fetchOpts
      fetchOpts = { agent: new proxyAgent(proxy.toString()) };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2 * 1000);

    let response;
    try {
      response = await fetch(url, { ...fetchOpts, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if ((response as any)?.status) {
      let text: string;

      if (content) {
        text = content;
      } else {
        text = await (response as any).text();
      }

      const headers = (response as unknown as Response)?.headers || null;

      // regular expression to find the <title> tag
      let match = text.match(/<title.*>([^<]*)<\/title>/);

      const title = match?.[1] || "";

      return { title, headers };
    } else {
      return { title: "", headers: null };
    }
  } catch (err: any) {
    if (err?.name !== "AbortError") console.log(err);
    return { title: "", headers: null };
  }
}
