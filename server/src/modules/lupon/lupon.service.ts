import { prisma } from "../../db.js";
import { Prisma } from "../../generated/prisma/client.js";
import { CustomError } from "../../utils/custom.exception.js";
import type {
  CreateLuponMemberInput,
  UpdateLuponMemberInput,
} from "./lupon.schema.js";

const memberSelect = {
  id: true,
  fullName: true,
  contact: true,
  isActive: true,
} as const;

const luponService = {
  async list() {
    return prisma.luponMember.findMany({
      orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
      select: memberSelect,
    });
  },

  // What the public site may say about the body: names of current members only.
  async listPublicNames() {
    const members = await prisma.luponMember.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
      select: { fullName: true },
    });

    return members.map((member) => member.fullName);
  },

  async create(input: CreateLuponMemberInput) {
    return prisma.luponMember.create({
      data: { fullName: input.fullName, contact: input.contact },
      select: memberSelect,
    });
  },

  async update(id: number, input: UpdateLuponMemberInput) {
    const existing = await prisma.luponMember.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new CustomError("Lupon member not found", undefined, 404);
    }

    const data: Prisma.LuponMemberUpdateInput = {};
    if (input.fullName !== undefined) data.fullName = input.fullName;
    if (input.contact !== undefined) data.contact = input.contact;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    return prisma.luponMember.update({
      where: { id },
      data,
      select: memberSelect,
    });
  },

  async remove(id: number) {
    const existing = await prisma.luponMember.findUnique({
      where: { id },
      select: { id: true, fullName: true },
    });

    if (!existing) {
      throw new CustomError("Lupon member not found", undefined, 404);
    }

    // Cases keep their own snapshots, so removing a member from the roster
    // never rewrites a Pangkat that already handled a case.
    await prisma.luponMember.delete({ where: { id } });

    return { fullName: existing.fullName };
  },
};

export default luponService;
