import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import dotenv from "dotenv"
import path from "path"

// Load .env from the backend directory (relative to this file's location)
dotenv.config({ path: path.resolve(__dirname, "../../.env") })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export default prisma;