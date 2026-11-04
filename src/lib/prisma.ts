import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
export function createPrisma(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalDb.prisma ?? createPrisma();
if (process.env.NODE_ENV !== 'production') globalDb.prisma = prisma;
