// cPanel / Passenger startup file ONLY.
//
// This project has NO web surface. The real entrypoints are fetch.js and
// build-snapshots.js, run from the shell and from cron. But cPanel's "Setup
// Node.js App" requires a startup file and an Application URL, and Passenger
// expects that file to keep a listener open — so this answers one plain-text
// line at the app URL and does nothing else. It is safe to never visit.

import http from 'node:http'

const port = process.env.PORT || 3000

http
  .createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('whywedie data pipeline — no web surface. See fetch.js / build-snapshots.js.\n')
  })
  .listen(port, () => {
    console.log(`[pipeline] placeholder listener on :${port}`)
  })
