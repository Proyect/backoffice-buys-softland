import { beforeAll } from 'vitest'

// Configure test environment
process.env.NODE_ENV = 'test'

// If DATABASE_URL_TEST is defined, override DATABASE_URL for Prisma
if (process.env.DATABASE_URL_TEST && process.env.DATABASE_URL_TEST.trim()) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST.trim()
}

// Optionally, you can run migrations/seed here if needed.
// For safety and speed, we assume the DB is already migrated and seeded via docker-compose or manual scripts.
// Uncomment below if you want automatic migrate+seed on test start.
/*
import { execa } from 'execa'

beforeAll(async () => {
  // Run migrations
  await execa('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit' })
  // Seed
  await execa('npm', ['run', 'prisma:seed'], { stdio: 'inherit' })
}, 30_000)
*/
