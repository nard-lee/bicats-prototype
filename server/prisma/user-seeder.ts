import "dotenv/config";
import argon2 from "argon2";
import { prisma } from "../src/db";

// 1 admin + 1 staff. Idempotent: safe to re-run (upsert by username).
const USERS = [
  {
    fullName: "James Bond",
    position: "Punong Barangay",
    email: "james@gmail.com",
    phone: "+639386161262",
    username: "james12",
    role: "admin",
    password: "password123",
  },
  {
    fullName: "Jack Andrew",
    position: "Barangay Secretary",
    email: "jack@gmail.com",
    phone: "+639386161263",
    username: "jack123",
    role: "staff",
    password: "password123",
  },
];

async function main() {
  console.log("🌱 Seeding staff accounts...");

  for (const { password, ...rest } of USERS) {
    const passwordHash = await argon2.hash(password);

    await prisma.user.upsert({
      where: { username: rest.username },
      update: { ...rest, passwordHash, isActive: true },
      create: { ...rest, passwordHash },
    });

    console.log(`   ↳ ${rest.role.padEnd(5)}  ${rest.username}  (${rest.email})`);
  }

  console.log(`✅ Seeded ${USERS.length} accounts. Password for both: password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
