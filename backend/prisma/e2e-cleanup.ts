import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // This prefix is reserved for browser-test accounts. Cascades remove their
  // teams, routines, attendance, assignments, and performed sets.
  const result = await prisma.usuario.deleteMany({
    where: { email: { startsWith: 'teamtrack-e2e-' } },
  });
  console.log(`Removed ${result.count} TeamTrack E2E account(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
