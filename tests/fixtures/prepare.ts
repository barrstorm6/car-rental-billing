import {prisma} from '@/lib/prisma';
import {resetDatabase} from './database';

try {
  // Recover test-only fault injection after a forcibly interrupted previous run.
  const {assertTestDatabase} = await import('../../scripts/safety.mjs');
  assertTestDatabase(process.env.DATABASE_URL);
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS reject_close ON rentals');
  await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS reject_rental_close()');
  await resetDatabase(prisma);
} finally {
  await prisma.$disconnect();
}
