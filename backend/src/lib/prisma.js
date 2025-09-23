import { PrismaClient } from '@prisma/client'

// Create a single PrismaClient instance for the process
// This avoids exhausting database connections in dev with hot reload
export const prisma = new PrismaClient()
