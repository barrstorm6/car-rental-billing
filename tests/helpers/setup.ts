import {afterAll, beforeEach} from 'vitest';
import {prisma} from '../../src/lib/prisma';
import {resetDatabase} from '../fixtures/database';

beforeEach(async () => {
  await resetDatabase(prisma);
});
afterAll(async () => {
  await prisma.$disconnect();
});
