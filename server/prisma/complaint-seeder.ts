import "dotenv/config";
import { prisma } from "../src/db";
import { faker } from "@faker-js/faker";

const COMPLAINT_TYPES = [
  "type1", "type2", "type3", "type4", "type5", "type6",
  "type7", "type8", "type9", "type10", "type11", "type12",
];


const STATUSES = ["received", "under_mediation", "settled", "dismissed", "endorsed"];

async function main() {
  console.log("🌱 Starting seed with Faker...");

  // Clean up existing data
  await prisma.statusUpdate.deleteMany();
  await prisma.complaint.deleteMany();

  const complaints = [];

  // Generate 50 random complaints
  for (let i = 0; i < 25; i++) {
    const status = "received"; // default
    const incidentAt = faker.date.past({ years: 1 });
    const createdAt = faker.date.between({ from: incidentAt, to: new Date() });
    const contact = faker.phone.number({ style: 'international' });

    complaints.push({
      reference: `BK-${faker.number.int({ min: 2024, max: 2026 })}-${faker.string.alphanumeric(6).toUpperCase()}`,
      
      // Complainant
      complainantName: faker.person.fullName(),
      complainantAge: faker.number.int({ min: 18, max: 80 }),
      complainantPurok: `Purok ${faker.number.int({ min: 1, max: 10 })}`,
      complainantContact: contact,
      contactNormalized: contact.replace(/\D/g, ''), // Normalize by removing non-digits
      complainantAddress: faker.location.streetAddress(true),
      
      // Respondent
      respondentName: faker.person.fullName(),
      respondentAddress: faker.helpers.maybe(() => faker.location.streetAddress(true), { probability: 0.8 }),
      relationship: faker.helpers.arrayElement(["Neighbor", "Relative", "Friend", "Acquaintance", "Stranger"]),
      
      // Incident
      complaintType: faker.helpers.arrayElement(COMPLAINT_TYPES),
      incidentAt,
      incidentPlace: faker.location.city(),
      narrative: faker.lorem.paragraphs(2), // Assuming narrative is a required field
      
      status,
      createdAt,
      consentAt: faker.date.between({ from: createdAt, to: new Date() }), // Random consent date after filing
    });
  }

  await prisma.complaint.createMany({
    data: complaints,
  });

  console.log(`✅ Seeded ${complaints.length} complaints successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });