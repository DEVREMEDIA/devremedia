// Απογραφή του -v2 δέντρου: stub / re-export / own ανά page.tsx.
// Τρέχει από τη ρίζα του repo: node scripts/v2-route-inventory.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src/app/admin-v2', 'src/app/client-v2', 'src/app/employee-v2', 'src/app/salesman-v2'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === 'page.tsx') out.push(p);
  }
  return out;
}

for (const root of roots) {
  for (const f of walk(root).sort()) {
    const src = readFileSync(f, 'utf8');
    const rel = f.replaceAll('\\', '/');
    const stub = src.match(/redirect\('([^']+)'\)/);
    const reexp = src.match(/from '@\/app\/([^']+)'/);
    if (stub) console.log(`STUB  ${rel} -> ${stub[1]}`);
    else if (reexp) console.log(`REEXP ${rel} <- @/app/${reexp[1]}`);
    else console.log(`OWN   ${rel}`);
  }
}
