import { prisma } from "../../db.js";
import type { UpdateSettingsInput } from "./setting.schema.js";

// The profile lives in a single row (id = 1). Create it on first read so the
// defaults in the schema always apply.
async function ensure() {
  return prisma.barangaySettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

const settingService = {
  get: ensure,

  async update(input: UpdateSettingsInput) {
    return prisma.barangaySettings.upsert({
      where: { id: 1 },
      update: input,
      create: { id: 1, ...input },
    });
  },
};

export default settingService;
