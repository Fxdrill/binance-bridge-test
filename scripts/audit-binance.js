import { writeFile } from 'node:fs/promises';
import { createAudit } from '../src/audit.js';
import { createTransport } from '../src/transport.js';
import { createProviders } from '../src/providers/index.js';

const call = createTransport();
const report = await createAudit(createProviders(call), call)();
await writeFile(new URL('../audit/local-results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (Object.values(report.results).some(result => result.status === 'NOT_WORKING')) process.exitCode = 1;
