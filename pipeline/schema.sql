-- whywedie.org data pipeline schema
-- Target: MySQL 5.7+/8.0 or MariaDB 10.x (GoDaddy cPanel shared hosting).
-- Apply once with:  node --env-file=.env apply-schema.js
-- (or paste this file into phpMyAdmin > SQL against the pipeline database).
--
-- Statements are idempotent (CREATE TABLE IF NOT EXISTS). Re-running is safe
-- and will NOT drop or alter existing data.
--
-- Location note: the CDC WONDER *API* only returns NATIONAL vital-statistics
-- data — it refuses any Region/Division/State/County grouping or filter. So
-- `state_code` is always 'US' for every row this pipeline writes. The column
-- and the composite keys are kept as designed so a state-level source (e.g.
-- Socrata, or manual WONDER web-UI exports) can be added later without a
-- migration.

-- ---------------------------------------------------------------------------
-- mortality : one row per (year, state, ICD revision, cause) from the WONDER
--             "underlying cause of death" databases D176 / D16 / D15.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mortality (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  year               SMALLINT UNSIGNED NOT NULL,
  state_code         VARCHAR(2)   NOT NULL DEFAULT 'US',
  icd_version        TINYINT UNSIGNED NOT NULL,          -- 10 = ICD-10, 9 = ICD-9, 8 = ICDA-8
  cause_code         VARCHAR(255) NOT NULL,              -- WONDER 113-list label verbatim incl. leading '#' (its only stable identifier); acts as the key
  cause_name         VARCHAR(255) NOT NULL,              -- same label, leading '#' stripped, for display
  cause_level        TINYINT UNSIGNED NULL,              -- WONDER hierarchy depth (h="1" top level, 2 = sub-category, ...)
  death_count        INT UNSIGNED NULL,                  -- NULL when WONDER suppressed / not-applicable the cell
  population         BIGINT UNSIGNED NULL,
  crude_rate         DECIMAL(12,4) NULL,                 -- deaths per 100,000
  age_adjusted_rate  DECIMAL(12,4) NULL,                 -- age-adjusted to the 2000 US standard population
  suppressed         TINYINT(1)   NOT NULL DEFAULT 0,    -- 1 when death_count was withheld (WONDER "Suppressed")
  status             VARCHAR(24)  NULL,                  -- raw WONDER cell flag: Suppressed / Unreliable / Not Applicable / Missing
  updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_mortality (year, state_code, icd_version, cause_code),
  KEY idx_mortality_year (year),
  KEY idx_mortality_cause (cause_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- natality : one row per (year, state) from the WONDER natality databases
--            D149 / D66 / D27.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS natality (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  year         SMALLINT UNSIGNED NOT NULL,
  state_code   VARCHAR(2)   NOT NULL DEFAULT 'US',
  birth_count  INT UNSIGNED NULL,
  population   BIGINT UNSIGNED NULL,                     -- female population 15-44 where WONDER supplies it, else total
  birth_rate   DECIMAL(12,4) NULL,                       -- births per 1,000 (crude), as returned by WONDER
  suppressed   TINYINT(1)   NOT NULL DEFAULT 0,
  status       VARCHAR(24)  NULL,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_natality (year, state_code),
  KEY idx_natality_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
