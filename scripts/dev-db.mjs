import 'dotenv/config';
import { assertDevDatabase } from './safety.mjs';
import { run, nodeRun } from './process.mjs';
const action = process.argv[2];
assertDevDatabase(process.env.DATABASE_URL);
try {
  if (action === 'up') {
    await run('docker', ['info', '--format', '{{.ServerVersion}}']);
    await run('docker', ['compose', 'up', '-d', '--wait', '--wait-timeout', '90', 'db']);
  } else if (action === 'setup') {
    // Apply SQL first; introspect the resulting database into Prisma afterwards.
    await nodeRun('node_modules/prisma/build/index.js', ['migrate', 'deploy']);
    await nodeRun('node_modules/prisma/build/index.js', ['db', 'pull']);
    await nodeRun('node_modules/prisma/build/index.js', ['generate']);
    await nodeRun('node_modules/tsx/dist/cli.mjs', ['prisma/seed.ts']);
  } else if (action === 'pull') {
    await nodeRun('node_modules/prisma/build/index.js', ['db', 'pull']);
    await nodeRun('node_modules/prisma/build/index.js', ['generate']);
  } else if (action === 'seed') await nodeRun('node_modules/tsx/dist/cli.mjs', ['prisma/seed.ts']);
  else if (action === 'studio') await nodeRun('node_modules/prisma/build/index.js', ['studio']);
  else throw new Error('Unknown database action');
} catch (error) { console.error(error.message); process.exitCode = 1; }
