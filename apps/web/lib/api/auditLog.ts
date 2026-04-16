type AuditEvent =
  | "auth.login_failed"
  | "auth.login_success"
  | "auth.rate_limited"
  | "token.created"
  | "token.revoked"
  | "user.deleted"
  | "user.password_changed"
  | "collection.deleted"
  | "link.deleted"
  | "import.completed";

interface AuditEntry {
  event: AuditEvent;
  userId?: number;
  ip?: string;
  detail?: string;
}

/**
 * Structured audit logger for security-sensitive operations.
 * Outputs JSON to stdout for easy ingestion by log aggregators.
 */
export function auditLog({ event, userId, ip, detail }: AuditEntry) {
  const entry = {
    level: "audit",
    event,
    userId: userId ?? null,
    ip: ip ?? null,
    detail: detail ?? null,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(entry));
}
