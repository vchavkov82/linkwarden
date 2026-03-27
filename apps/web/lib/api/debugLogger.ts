import { NextApiRequest, NextApiResponse } from "next";

const DEBUG_ENABLED = process.env.DEBUG_API === "true";

interface DebugLogEntry {
  timestamp: string;
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
  body?: any;
  responseStatus?: number;
  responseBody?: any;
  duration?: number;
}

function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string | string[] | undefined> {
  const sanitized = { ...headers };
  const sensitiveHeaders = ["authorization", "cookie", "set-cookie"];
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      const value = sanitized[key];
      if (typeof value === "string" && value.length > 20) {
        sanitized[key] = value.substring(0, 20) + "...[REDACTED]";
      }
    }
  }
  
  return sanitized;
}

function formatLog(entry: DebugLogEntry): string {
  const separator = "─".repeat(80);
  const lines = [
    "",
    `┌${separator}`,
    `│ 🔍 API DEBUG: ${entry.method} ${entry.url}`,
    `│ ⏰ ${entry.timestamp}`,
    `├${separator}`,
    `│ Headers:`,
    ...Object.entries(entry.headers).map(
      ([k, v]) => `│   ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
    ),
  ];

  if (Object.keys(entry.query).length > 0) {
    lines.push(`├${separator}`);
    lines.push(`│ Query Parameters:`);
    lines.push(`│   ${JSON.stringify(entry.query, null, 2).replace(/\n/g, "\n│   ")}`);
  }

  if (entry.body && Object.keys(entry.body).length > 0) {
    lines.push(`├${separator}`);
    lines.push(`│ Request Body:`);
    const bodyStr = JSON.stringify(entry.body, null, 2);
    lines.push(`│   ${bodyStr.replace(/\n/g, "\n│   ")}`);
  }

  if (entry.responseStatus !== undefined) {
    lines.push(`├${separator}`);
    const statusEmoji = entry.responseStatus < 400 ? "✅" : "❌";
    lines.push(`│ ${statusEmoji} Response: ${entry.responseStatus}`);
    if (entry.duration) {
      lines.push(`│ ⏱️  Duration: ${entry.duration}ms`);
    }
    if (entry.responseBody) {
      const respStr = JSON.stringify(entry.responseBody, null, 2);
      if (respStr.length < 2000) {
        lines.push(`│ Response Body:`);
        lines.push(`│   ${respStr.replace(/\n/g, "\n│   ")}`);
      } else {
        lines.push(`│ Response Body: [${respStr.length} chars - truncated]`);
        lines.push(`│   ${respStr.substring(0, 500).replace(/\n/g, "\n│   ")}...`);
      }
    }
  }

  lines.push(`└${separator}`);
  lines.push("");

  return lines.join("\n");
}

export function debugLog(message: string, data?: any): void {
  if (!DEBUG_ENABLED) return;
  
  console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

export function withDebugLogging<T extends (...args: any[]) => any>(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (!DEBUG_ENABLED) {
      return handler(req, res);
    }

    const startTime = Date.now();
    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      method: req.method || "UNKNOWN",
      url: req.url || "",
      headers: sanitizeHeaders(req.headers as Record<string, string | string[] | undefined>),
      query: req.query as Record<string, string | string[] | undefined>,
      body: req.body,
    };

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const originalEnd = res.end.bind(res);

    let responseBody: any;

    res.json = (body: any) => {
      responseBody = body;
      return originalJson(body);
    };

    res.send = (body: any) => {
      responseBody = body;
      return originalSend(body);
    };

    try {
      await handler(req, res);
    } catch (error) {
      entry.responseStatus = 500;
      entry.responseBody = { error: String(error) };
      entry.duration = Date.now() - startTime;
      console.log(formatLog(entry));
      throw error;
    }

    entry.responseStatus = res.statusCode;
    entry.responseBody = responseBody;
    entry.duration = Date.now() - startTime;

    console.log(formatLog(entry));
  };
}

export function logApiCall(
  method: string,
  url: string,
  status: number,
  duration: number,
  error?: string
): void {
  if (!DEBUG_ENABLED) return;

  const emoji = status < 400 ? "✅" : "❌";
  console.log(
    `[API] ${emoji} ${method} ${url} - ${status} (${duration}ms)${error ? ` - ${error}` : ""}`
  );
}
