export const DEV_URL = 'postgresql://rental_dev:rental_dev@127.0.0.1:5434/rental_dev';
export const TEST_URL = 'postgresql://rental_test:rental_test@127.0.0.1:5435/rental_test';
export function assertTestDatabase(url = process.env.TEST_DATABASE_URL) {
  // Fixed local Compose target: no remote host, alternate database, role or query options.
  if (url !== TEST_URL || url === process.env.DEVELOPMENT_DATABASE_URL) {
    throw new Error('Unsafe test database URL. Use the exact local TEST_DATABASE_URL from .env.example.');
  }
  return url;
}
export function assertDevDatabase(url) {
  if (url !== DEV_URL) throw new Error('Development commands require the local DATABASE_URL from .env.example.');
  return url;
}
