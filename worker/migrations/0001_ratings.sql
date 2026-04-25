CREATE TABLE IF NOT EXISTS ratings (
  id          TEXT    PRIMARY KEY,
  place_id    TEXT    NOT NULL,
  place_name  TEXT    NOT NULL,
  place_addr  TEXT    NOT NULL DEFAULT '',
  allergen    TEXT    NOT NULL,
  safety      INTEGER NOT NULL CHECK(safety BETWEEN 1 AND 5),
  notes       TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ratings_place    ON ratings(place_id);
CREATE INDEX IF NOT EXISTS idx_ratings_allergen ON ratings(place_id, allergen);
