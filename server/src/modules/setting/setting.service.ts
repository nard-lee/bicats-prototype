import { prisma } from "../../db.js";
import type { UpdateSettingsInput } from "./setting.schema.js";

type Settings = Awaited<ReturnType<typeof load>>;

async function load() {
  return prisma.barangaySettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

// The profile lives in a single row (id = 1) that only changes through
// update(), so the row is read once and refreshed on every write.
let cached: Settings | null = null;

async function ensure(): Promise<Settings> {
  cached ??= await load();
  return cached;
}

const settingService = {
  get: ensure,

  async update(input: UpdateSettingsInput) {
    cached = await prisma.barangaySettings.upsert({
      where: { id: 1 },
      update: input,
      create: { id: 1, ...input },
    });
    return cached;
  },
};

export default settingService;
