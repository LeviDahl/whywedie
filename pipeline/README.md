# whywedie data pipeline

CDC WONDER XML API → cPanel MySQL → static JSON snapshots served by the site
at `/data/*.json`.

Self-contained: its own `package.json`, its own `node_modules`, three
dependencies (`axios`, `mysql2`, `fast-xml-parser`). Nothing here is imported
by the Vite frontend and vice-versa.

```
pipeline/
  schema.sql            two tables: mortality, natality  (apply once)
  apply-schema.js       runs schema.sql (or just paste it into phpMyAdmin)
  fetch.js              one (type, era) chunk: WONDER -> parse -> upsert
  build-snapshots.js    DB -> mortality.json / natality.json / meta.json
  app.js                placeholder HTTP listener — ONLY needed if you deploy
                        this to a Passenger/PaaS host that requires a server
  lib/                  config, dataset registry, template loader, WONDER
                        client, XML table parser, row mapper, DB
  templates/            six hand-exported WONDER request XMLs (see its README)
  .env.example          copy to .env, fill in, never commit
```

## Where this runs

**Not on cPanel.** GoDaddy replaced the cPanel Node.js selector with a
managed-deploy platform that can't reach the cPanel database, so there is no
Node runtime on the box that holds MySQL. This pipeline therefore runs
**somewhere else with Node ≥ 20.6** and connects to the cPanel database over
the network:

| host option | scheduling | notes |
|---|---|---|
| A small always-on box / VPS with a **fixed public IP** | its own `cron` | cleanest — one IP to allow-list, real cron |
| The GoDaddy managed-deploy (Passenger) app | needs an in-process scheduler (see `app.js`) or an external ping | check whether it exposes a stable egress IP |
| **GitHub Actions** (`schedule:` workflow) | cron-like | runner IPs rotate across huge ranges — you'd have to allow `%` (any host) for the DB user, which is only acceptable with a strong password + SSL + least-privilege grants |

Whatever you pick, its **public IP must be in cPanel → Remote MySQL**.
GoDaddy shared MySQL has **TLS disabled on the wire**, so leave `DB_SSL`
empty — the connection is plaintext over the internet (the CDC data is
public; tunnel through SSH to `127.0.0.1` if exposing the DB password in
transit is a concern).

## What it can and can't get

- **Can:** national deaths by cause 1968→present across three ICD eras, with
  population + crude rate + age-adjusted rate; national births 1995→present
  (2003–2006 excepted — no database for it in the configured set).
- **Can't:** anything sub-national. The WONDER API refuses
  State/County/Region/Division/Urbanization grouping or filtering for vital
  statistics. `state_code` is always `'US'`. If state data is wanted later,
  add a separate source — the schema already has the column and keys.

---

## Setup

### 1. Create the tables

Easiest, no remote access needed: **cPanel → phpMyAdmin →** select the
database **→ SQL tab →** paste [`schema.sql`](schema.sql) → Go.

Or, from a machine that's already allow-listed in Remote MySQL:

```
cp .env.example .env      # fill in DB_* and DB_SSL
node --env-file=.env apply-schema.js
```

`schema.sql` is idempotent (`CREATE TABLE IF NOT EXISTS`) — safe to re-run.

### 2. cPanel → Remote MySQL

Add the **public IP** of the machine that will run the pipeline. Confirm your
GoDaddy plan actually permits remote MySQL — some don't; if connections time
out from an allow-listed IP, that's the likely reason (open a support ticket
or reconsider the host).

### 3. Configure the pipeline host

Put the code on it (git clone, or copy the `pipeline/` folder), then:

```
npm install
cp .env.example .env       # DB_HOST = cPanel shared IP / server hostname
                           # DB_SSL  = (empty) — GoDaddy MySQL has no TLS
                           # SNAPSHOT_OUT_DIR = a local dir, e.g. ./snapshots
```

Or skip the file and set those keys in the host's secrets/env panel.

### 4. Export the six WONDER templates

See [`templates/README.md`](templates/README.md). Verify each before trusting
it:

```
node --env-file=.env fetch.js --type=mortality --era=icd10 --dry-run
node --env-file=.env fetch.js --type=mortality --era=icd10 --out=rows.json --dump
```

`--out` writes mapped rows to JSON and never touches the database; `--dump`
saves the raw WONDER XML. If `rows.json` is empty or columns are shifted, the
template's Group By / Measure order doesn't match `lib/datasets.js`.

### 5. First run

```
node --env-file=.env fetch.js --type=mortality --era=icd10
node --env-file=.env fetch.js --type=mortality --era=icd9
node --env-file=.env fetch.js --type=mortality --era=icd8
node --env-file=.env fetch.js --type=natality  --era=modern
node --env-file=.env fetch.js --type=natality  --era=mid
node --env-file=.env fetch.js --type=natality  --era=old
node --env-file=.env build-snapshots.js
```

`ON DUPLICATE KEY UPDATE` makes every run re-runnable. If a mortality era
errors on size/timeout, slice it (needs the `{{YEAR_LIST}}` token in that
template):

```
node --env-file=.env fetch.js --type=mortality --era=icd10 --years=1999-2010
node --env-file=.env fetch.js --type=mortality --era=icd10 --years=2011-2023
```

### 6. Publishing snapshots to the site

`build-snapshots.js` writes JSON to a **local** `SNAPSHOT_OUT_DIR` on the
pipeline host. The site is static files in cPanel `public_html`, on a
different box, so a separate step moves them into `public_html/data/`. Pick
one (none needs a new npm dependency):

- **FTPS upload with `curl`** (works from any cron/CI shell):

  ```
  for f in mortality natality meta; do
    curl -sS --ftp-ssl -T "$SNAPSHOT_OUT_DIR/$f.json" \
      "ftp://$FTP_HOST/public_html/data/$f.json" --user "$FTP_USER:$FTP_PASS"
  done
  ```

  FTP credentials come from cPanel → FTP Accounts. Keep them in the same
  `.env` / secrets store.

- **Commit to the repo** — point `SNAPSHOT_OUT_DIR` at a checked-out
  `data/` path, `git commit && git push` in the workflow, and let the
  normal site deploy carry them.

- **Serve from the pipeline host** — if it already serves HTTP, expose
  `/data/*.json` there and have the Vue app fetch it cross-origin (that host
  must send permissive CORS headers, and the site loses same-origin
  simplicity).

### 7. Schedule

On a VPS/box, a `crontab` — monthly is plenty (the data is annual), stagger
so no two overlap. `NODE` = absolute path to node (or a `source …/activate`
line if it's a venv); `DIR` = the pipeline directory.

```
5  3 1 * *  cd DIR && NODE --env-file=.env fetch.js --type=mortality --era=icd10 >> logs/cron.log 2>&1
20 3 1 * *  cd DIR && NODE --env-file=.env fetch.js --type=mortality --era=icd9  >> logs/cron.log 2>&1
35 3 1 * *  cd DIR && NODE --env-file=.env fetch.js --type=mortality --era=icd8  >> logs/cron.log 2>&1
50 3 1 * *  cd DIR && NODE --env-file=.env fetch.js --type=natality  --era=modern >> logs/cron.log 2>&1
5  4 1 * *  cd DIR && NODE --env-file=.env fetch.js --type=natality  --era=mid    >> logs/cron.log 2>&1
20 4 1 * *  cd DIR && NODE --env-file=.env fetch.js --type=natality  --era=old    >> logs/cron.log 2>&1
40 4 1 * *  cd DIR && NODE --env-file=.env build-snapshots.js >> logs/cron.log 2>&1
# 55 4 1 * *  ...then the snapshot-publish step from section 6
```

On GitHub Actions, one workflow with `on: schedule: - cron: '0 3 1 * *'`
running the same commands in sequence, DB_* and FTP_* from Actions secrets.

`fetch.js` exits non-zero on failure, so cron mail / `logs/cron.log` /
the Actions run status will show a bad run.

---

## Local development

No database needed to work on parsing/mapping:

```
npm install
node --check fetch.js && node --check build-snapshots.js
node --env-file=.env fetch.js --type=mortality --era=icd10 --dry-run
node --env-file=.env fetch.js --type=mortality --era=icd10 --out=rows.json --dump
```

`--dry-run` and `--out` make no DB connection. To exercise the DB path
locally, point `.env` at any MySQL 8 / MariaDB 10 (`brew install mysql` or a
`mysql:8` container) and run `apply-schema.js` against it.

## Output shapes

`build-snapshots.js` writes (minified) into `$SNAPSHOT_OUT_DIR`:

- **`mortality.json`** — `{ source, fetchedAt, coverage, years, causes,
  byYear: { <year>: [ { code, name, icdVersion, deaths, population,
  crudeRate, ageAdjustedRate, suppressed } ] }, byCause: { "<icd>:<code>":
  { name, icdVersion, years[], deaths[], crudeRate[], ageAdjustedRate[] } } }`
- **`natality.json`** — `{ source, fetchedAt, coverage, years, byYear:
  { <year>: { births, population, birthRate, suppressed } } }`
- **`meta.json`** — generation time, per-era row counts + year spans,
  caveats.

`byYear` / `byCause` mirror `src/api/causesOfDeath.js` so the frontend swap
from Socrata to `fetch('/data/mortality.json')` is small.
