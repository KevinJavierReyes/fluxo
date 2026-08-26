import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((chunk) =>
      chunk
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter((s) => s.length > 0);
}

async function main() {
  const file = process.argv[2];
  const sql = readFileSync(join(process.cwd(), file), 'utf-8');
  const statements = splitStatements(sql);
  for (const stmt of statements) {
    const label = stmt.split('\n')[0].slice(0, 80);
    console.log('Running:', label);
    await prisma.$executeRawUnsafe(stmt);
    console.log('  OK');
  }
}

main()
  .catch((e) => {
    console.error('FAILED:', e.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
