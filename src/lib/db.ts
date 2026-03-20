import { PrismaClient } from '@prisma/client'
import path from 'path'

const dbPath = path.join(process.cwd(), 'prisma', 'data', 'ayur-retail.db')
console.log('DB Path:', dbPath)

const prisma = new PrismaClient({
  datasources: {
    db: { url: `file:${dbPath}` },
  },
})

export default prisma