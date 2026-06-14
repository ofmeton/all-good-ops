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
}
