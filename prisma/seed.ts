import { PrismaClient } from '@prisma/client'
import { hashSync } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create default admin user
  const existingAdmin = await prisma.user.findUnique({ where: { username: 'shobhit' } })
  if (!existingAdmin) {
    const hashedPassword = hashSync('Shobhit@1502', 10)
    await prisma.user.create({
      data: {
        username: 'shobhit',
        password: hashedPassword,
        role: 'ADMIN',
        name: 'Shobhit Admin',
      },
    })
    console.log('Admin user created: shobhit / Shobhit@1502')
  } else {
    console.log('Admin user already exists')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
