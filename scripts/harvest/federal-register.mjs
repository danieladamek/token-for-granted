#!/usr/bin/env node
// The newest 200 Federal Register notices matching "notice of funding opportunity" (KICKOFF §4c); see recent.mjs.
process.argv.push('federal-register');
await import('./recent.mjs');
