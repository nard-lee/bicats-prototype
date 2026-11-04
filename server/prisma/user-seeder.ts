import "../src/utils/load-env.js";
import argon2 from "argon2";
import { prisma } from "../src/db";
import type { Role } from "../src/utils/roles.js";
import {
  BARANGAY_DEMO_OFFICIALS,
  DEMO_SECRETARY,
  LUPON_DEMO_MEMBERS,
} from "./demo-roster.js";

// One login for everyone the barangay actually has: each elected official, the
// secretary, and each lupon member. The Kagawad who also sit on the lupon keep
// their elected-post account instead of getting a second one.
// Every account signs in with its username and password123.

const PASSWORD = "password123";

type Account = {
  fullName: string;
  position: string;
  role: Role;
  username: string;
  email: string;
  phone: string;
};

// "Hon. Mario D. Santos" -> ["mario","d","santos"]
function nameWords(fullName: string): string[] {
  return fullName
    .replace(/\bhon\.?\b/gi, "")
    .split(/[^A-Za-z]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

// "Hon. Mario D. Santos" -> "mariosantos"
function usernameOf(fullName: string): string {
  const words = nameWords(fullName);
  const first = words[0] ?? "user";
  const last = words[words.length - 1] ?? first;
  return first === last ? first : `${first}${last}`;
}

// Two spellings of the same person are one person: the Kagawad "Hon. Alfredo
// Tan" and the lupon member "Alfredo Tan" both key to "alfredotan".
function personKey(fullName: string): string {
  return nameWords(fullName).join("");
}

function buildAccounts(): Account[] {
  const people: { fullName: string; position: string; role: Role }[] = [];

  for (const entry of BARANGAY_DEMO_OFFICIALS) {
    const [rawName, rawPosition] = entry.split(" — ");
    const fullName = rawName!.trim();
    const position = (rawPosition ?? "Barangay Official").trim();
    people.push({
      fullName,
      position,
      // The Punong Barangay chairs the lupon and runs the office, so only the
      // PB account may manage accounts and settings.
      role: position === "Punong Barangay" ? "admin" : "staff",
    });
  }

  people.push({ ...DEMO_SECRETARY, role: "secretary" });

  const officials = new Set(people.map((person) => personKey(person.fullName)));
  for (const member of LUPON_DEMO_MEMBERS) {
    if (officials.has(personKey(member.fullName))) continue;
    people.push({ fullName: member.fullName, position: "Lupon Member", role: "lupon" });
  }

  const used = new Set<string>();
  return people.map((person, index) => {
    let username = usernameOf(person.fullName);
    if (used.has(username)) username = `${username}${index + 1}`;
    used.add(username);

    return {
      ...person,
      username,
      email: `${username}@kabayanihan.demo`,
      phone: `+639175550${String(index + 1).padStart(3, "0")}`,
    };
  });
}

const ACCOUNTS = buildAccounts();

async function main() {
  console.log("🌱 Seeding staff accounts...");

  const passwordHash = await argon2.hash(PASSWORD);

  for (const account of ACCOUNTS) {
    await prisma.user.upsert({
      where: { username: account.username },
      update: { ...account, passwordHash, isActive: true },
      create: { ...account, passwordHash },
    });

    console.log(
      `   ↳ ${account.role.padEnd(9)} ${account.username.padEnd(20)} ${account.fullName}`,
    );
  }

  const admin = ACCOUNTS.find((account) => account.role === "admin");
  console.log(
    `✅ Seeded ${ACCOUNTS.length} accounts (password123). Full access: ${admin?.username}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
