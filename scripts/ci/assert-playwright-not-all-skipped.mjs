#!/usr/bin/env node
// Fails the build when the E2E suite proves nothing: either no tests were
// collected, or every collected test skipped. Playwright exits 0 in both cases,
// which is how this repo ended up with a green CI that validated no behaviour.
//
// Usage: node scripts/ci/assert-playwright-not-all-skipped.mjs <report.json>
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: assert-playwright-not-all-skipped.mjs <playwright-json-report>');
  process.exit(2);
}

let report;
try {
  report = JSON.parse(readFileSync(path, 'utf8'));
} catch (error) {
  console.error(`Could not read Playwright JSON report at ${path}: ${error.message}`);
  process.exit(2);
}

const tests = [];
const walk = (suite) => {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      tests.push({ title: `${spec.title} › ${test.projectName ?? ''}`.trim(), results: test.results ?? [] });
    }
  }
  for (const child of suite.suites ?? []) walk(child);
};
for (const suite of report.suites ?? []) walk(suite);

const total = tests.length;
const skipped = tests.filter(t => t.results.length === 0).length;
const ran = total - skipped;

console.log(`E2E report: ${total} test(s), ${ran} executed, ${skipped} skipped.`);

if (total === 0) {
  console.error('FAIL: Playwright collected 0 tests. The suite is misconfigured or the config file is not being read.');
  process.exit(1);
}

if (ran === 0) {
  console.error('FAIL: every E2E test skipped — the run validated nothing.');
  console.error('Most specs self-skip without PLAYWRIGHT_* credentials. Set those secrets in CI, or delete the specs.');
  for (const t of tests.slice(0, 10)) console.error(`  - skipped: ${t.title}`);
  process.exit(1);
}

console.log('OK: at least one E2E test executed.');
