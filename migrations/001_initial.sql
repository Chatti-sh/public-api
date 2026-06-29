-- Cached version of a F-List profile, generated from the F-List API.
-- Only the Chattish exclusive fields are stored, then re-generated once
-- the cache expires, the F-List hash doesn't match.
CREATE TABLE profile (
  character_name  TEXT PRIMARY KEY,
  updated_at      INTEGER NOT NULL,
  cached_at       INTEGER NOT NULL,

  -- Chattish fields
  profile_picture TEXT NOT NULL,    -- resolved avatar URL
  gender_color    TEXT NOT NULL,
  age_range       TEXT,             -- JSON array [min, max], nullable if unparseable
  is_hub          INTEGER NOT NULL  -- boolean
);