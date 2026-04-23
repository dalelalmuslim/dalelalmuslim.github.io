PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS public_content_documents (
    section_id TEXT NOT NULL,
    version TEXT NOT NULL,
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
    payload_hash TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    source_kind TEXT NOT NULL DEFAULT 'seed-import',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (section_id, version)
);

CREATE INDEX IF NOT EXISTS idx_public_content_documents_section_created_at
    ON public_content_documents (section_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public_content_publications (
    section_id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    published_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    published_by TEXT NOT NULL DEFAULT 'seed-import',
    notes TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (section_id, version)
        REFERENCES public_content_documents (section_id, version)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_public_content_publications_version
    ON public_content_publications (version);
