export function applyRecurringMigrations(db) {
  const cols = db
    .prepare("PRAGMA table_info(recurring_items)")
    .all()
    .map((c) => c.name);

  if (!cols.includes("frequency")) {
    db.exec(
      "ALTER TABLE recurring_items ADD COLUMN frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly','weekly'))",
    );
  }
  if (!cols.includes("weekday")) {
    db.exec("ALTER TABLE recurring_items ADD COLUMN weekday INTEGER");
  }
  if (!cols.includes("amount_type")) {
    db.exec(
      "ALTER TABLE recurring_items ADD COLUMN amount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (amount_type IN ('fixed','variable'))",
    );
  }
  if (!cols.includes("account")) {
    db.exec("ALTER TABLE recurring_items ADD COLUMN account TEXT");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recurring_id INTEGER NOT NULL REFERENCES recurring_items(id) ON DELETE CASCADE,
      occurrence_date TEXT NOT NULL,
      skip INTEGER NOT NULL DEFAULT 0 CHECK (skip IN (0,1)),
      amount INTEGER,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      UNIQUE (recurring_id, occurrence_date)
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_recurring_overrides_rid ON recurring_overrides (recurring_id)");

  const proposalTable = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'optimizer_proposals'")
    .get();
  if (proposalTable?.sql && !proposalTable.sql.includes("suggest_transfer")) {
    db.transaction(() => {
      db.exec(`
        DROP TABLE IF EXISTS optimizer_proposals_next;
        CREATE TABLE optimizer_proposals_next (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
          kind            TEXT NOT NULL CHECK (kind IN (
                            'classify_unknown','fixed_vs_variable','relabel',
                            'transfer_pair','rule_suggest','rule_conflict',
                            'label_add','category_regroup','suggest_transfer')),
          source          TEXT NOT NULL CHECK (source IN ('signal','llm')),
          status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                            'pending','accepted','rejected','dismissed','superseded')),
          title           TEXT NOT NULL,
          rationale       TEXT,
          confidence      TEXT NOT NULL DEFAULT 'med' CHECK (confidence IN ('high','med','low')),
          target_ref      TEXT,
          proposed_action TEXT,
          dedup_key       TEXT,
          decided_at      TEXT,
          decided_note    TEXT
        );
        INSERT INTO optimizer_proposals_next
          (id, created_at, kind, source, status, title, rationale, confidence, target_ref, proposed_action, dedup_key, decided_at, decided_note)
        SELECT id, created_at, kind, source, status, title, rationale, confidence, target_ref, proposed_action, dedup_key, decided_at, decided_note
          FROM optimizer_proposals;
        DROP TABLE optimizer_proposals;
        ALTER TABLE optimizer_proposals_next RENAME TO optimizer_proposals;
        CREATE INDEX IF NOT EXISTS idx_proposals_status_kind ON optimizer_proposals (status, kind);
        CREATE INDEX IF NOT EXISTS idx_proposals_dedup ON optimizer_proposals (dedup_key);
      `);
    })();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS transfer_fees (
      from_account TEXT PRIMARY KEY,
      fee INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS manual_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_account TEXT NOT NULL,
      to_account TEXT NOT NULL,
      amount INTEGER NOT NULL,
      scheduled_date TEXT NOT NULL,
      name TEXT,
      fee INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','done','cancelled')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      done_at TEXT
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_manual_transfers_date_status ON manual_transfers (scheduled_date, status)");
}
