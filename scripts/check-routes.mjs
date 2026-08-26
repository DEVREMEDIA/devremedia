// scripts/check-routes.mjs — guard: κανένα revalidatePath σε stub route, κανένα stub χωρίς υπαρκτό target.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const pages = walk('src/app').filter((p) => p.endsWith('page.tsx'));
const stubs = new Map(); // route path -> target
for (const p of pages) {
  const src = readFileSync(p, 'utf8');
  const m = src.match(/redirect\('([^']+)'\)/);
  if (m && !src.includes('supabase') && src.length < 600) {
    const route = '/' + p.replaceAll('\\', '/').replace('src/app/', '').replace('/page.tsx', '');
    stubs.set(route, m[1]);
  }
}

const errors = [];
for (const [route, target] of stubs) {
  const clean = target.split('?')[0];
  const targetPage = join('src/app', clean === '/' ? '' : clean, 'page.tsx');
  if (!existsSync(targetPage)) errors.push(`stub ${route} -> ${target}: target page missing`);
}

const files = walk('src').filter((p) => /\.(ts|tsx)$/.test(p));
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/revalidatePath\(\s*'([^']+)'/g)) {
    if (stubs.has(m[1])) errors.push(`${f}: revalidatePath('${m[1]}') targets a stub (use ${stubs.get(m[1]).split('?')[0]})`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`ok — ${stubs.size} stubs, no revalidatePath targets a stub`);
