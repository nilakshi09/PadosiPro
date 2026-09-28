/**
 * prisma.ts — Singleton Prisma client.
 *
 * WHY: We create one PrismaClient instance and reuse it everywhere.
 * Creating multiple clients would open too many database connections.
 */

import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
