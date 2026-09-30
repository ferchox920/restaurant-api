import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const directory = process.argv[2];
if (!directory) throw new Error('Provide the evidence directory');
mkdirSync(directory, { recursive: true });
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run through npm run audit:check');
const results = [];
for (const production of [false, true]) {
  const args = ['audit', '--json', ...(production ? ['--omit=dev'] : [])];
  const result = spawnSync(process.execPath, [npm, ...args], {
    encoding: 'utf8',
  });
  const scope = production ? 'production' : 'all';
  writeFileSync(`${directory}/audit-${scope}.json`, result.stdout || '{}');
  writeFileSync(`${directory}/audit-${scope}.log`, result.stderr || '');
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    /* invalid response fails closed */
  }
  const queryError = Boolean(
    result.error ||
    result.status === null ||
    result.status > 1 ||
    !report?.metadata?.vulnerabilities ||
    report.error,
  );
  const findings = report?.metadata?.vulnerabilities?.total;
  results.push({ scope, exitCode: result.status, queryError, findings });
}
writeFileSync(
  `${directory}/audit-exits.json`,
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results));
// No global severity exemption: every advisory fails, and query failures fail separately.
if (
  results.some(
    (result) =>
      result.queryError || result.findings !== 0 || result.exitCode !== 0,
  )
)
  process.exitCode = 1;
