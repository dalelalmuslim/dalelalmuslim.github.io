PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    section_id TEXT NOT NULL,
    version TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    actor_provider TEXT NOT NULL DEFAULT 'cloudflare-access',
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_section_created_at
    ON admin_audit_log (section_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor_created_at
    ON admin_audit_log (actor_email, created_at DESC);
