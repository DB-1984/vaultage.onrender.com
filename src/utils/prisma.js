import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export default prisma;

// using pooler for URL & npx prisma migrate dev --name init
