#!/usr/bin/env node
// The NSF funding RSS items (KICKOFF §4c); see recent.mjs.
process.argv.push('nsf-rss');
await import('./recent.mjs');
