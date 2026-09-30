import { spawn } from 'node:child_process';
import { mkdirSync, createWriteStream, writeFileSync } from 'node:fs';

const mode = process.argv[2];
const commands = {
  static: [
    ['prisma-generate', 'prisma/build/index.js', 'generate'],
    ['lint', 'eslint/bin/eslint.js', '{src,test}/**/*.ts'],
    [
      'format',
      'prettier/bin/prettier.cjs',
      '--check',
      'src/**/*.ts',
      'test/**/*.ts',
      'prisma/seed.ts',
      'scripts/**/*.mjs',
      '*.json',
      '*.ts',
      '*.mjs',
      '.github/**/*.yml',
    ],
    ['types', 'typescript/bin/tsc', '--noEmit'],
    ['build', '@nestjs/cli/bin/nest.js', 'build'],
  ],
  unit: [
    [
      'unit',
      'jest/bin/jest.js',
      '--runInBand',
      '--json',
      '--outputFile=evidence/unit.json',
    ],
  ],
  database: [
    ['migrations-commercial', 'prisma/build/index.js', 'migrate', 'deploy'],
    [
      'acceptance',
      'jest/bin/jest.js',
      '--config',
      'jest.e2e.config.ts',
      '--runInBand',
      '--json',
      '--outputFile=evidence/acceptance.json',
    ],
  ],
  seed: [
    ['migrations-seed', 'prisma/build/index.js', 'migrate', 'deploy'],
    [
      'seed',
      'jest/bin/jest.js',
      '--config',
      'jest.seed.config.ts',
      '--runInBand',
      '--json',
      '--outputFile=evidence/seed.json',
    ],
  ],
};
if (!commands[mode]) throw new Error('Expected static, unit, database or seed');
if (mode === 'database' || mode === 'seed') {
  const name = new URL(process.env.DATABASE_URL ?? '').pathname;
  const expected =
    mode === 'seed'
      ? /^\/foundation_seed(?:_\w+)?$/
      : /^\/foundation_commercial(?:_\w+)?$/;
  if (process.env.FOUNDATION_DATABASE_TESTS !== 'true' || !expected.test(name))
    throw new Error(
      'Provide an explicitly disposable foundation database and FOUNDATION_DATABASE_TESTS=true',
    );
}
mkdirSync('evidence', { recursive: true });
const results = [];
for (const [name, bin, ...args] of commands[mode]) {
  const log = createWriteStream(`evidence/${name}.log`);
  const started = Date.now();
  const child = spawn(process.execPath, [`node_modules/${bin}`, ...args], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (data) => {
      log.write(data);
      process.stdout.write(data);
    });
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  await new Promise((resolve) => log.end(resolve));
  results.push({ name, exitCode: code, durationMs: Date.now() - started });
  writeFileSync(
    `evidence/${mode}-commands.json`,
    JSON.stringify(results, null, 2),
  );
  if (code !== 0) {
    process.exitCode = code ?? 1;
    break;
  }
}
