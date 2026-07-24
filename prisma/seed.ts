import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@1234", 10);

  const admin = await prisma.user.upsert({
    where: { email: "invetechs@gmail.com" },
    update: {},
    create: {
      email: "invetechs@gmail.com",
      name: "Invetechs Admin",
      passwordHash,
      isSuperAdmin: true,
    },
  });

  const companies = [
    { name: "Azoom", slug: "azoom", brandColor: "#e11d48" },
    { name: "Alarrab", slug: "alarrab", brandColor: "#0d9488" },
    { name: "MCC (Hadathah)", slug: "mcc-hadathah", brandColor: "#7c3aed" },
  ];

  for (const c of companies) {
    const org = await prisma.organization.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, plan: "enterprise" },
    });
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
      update: { role: "owner" },
      create: { userId: admin.id, organizationId: org.id, role: "owner" },
    });
  }

  console.log("Seed complete.");
  console.log("Login: invetechs@gmail.com / Admin@1234  (change this password!)");
  console.log("Workspaces: Azoom, Alarrab, MCC (Hadathah)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
