import argon2 from "argon2";
import type {
    CreateUserInput,
    ListUsersQuery,
    Paginated,
    UpdateUserInput,
    UserDetail,
    UserListRow,
} from "./user.schema.js";

import { prisma } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { CustomError } from "../../utils/custom.exception.js";

const userService = {

    async me(userId: number): Promise<UserDetail> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                fullName: true,
                position: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
            },
        });

        if (!user) throw new CustomError('User not found', { user: 'User no longer exists' });
        return user;
    },
    
    async create(request: CreateUserInput) {
        const { password, ...rest } = request;
        const passwordHash = await argon2.hash(password);

        const existingEmail = await prisma.user.findUnique({
            where: { email: request.email },
            select: { id: true },
        });

        if (existingEmail) throw new CustomError('Registration failed', { email: 'Email already in use' });

        const existingPhone = await prisma.user.findUnique({
            where: { phone: request.phone },
            select: { id: true },
        });

        if (existingPhone) throw new CustomError('Registration failed', { phone: 'Phone already in use' });

        const existingUsername = await prisma.user.findUnique({
            where: { username: request.username },
            select: { id: true },
        });

        if (existingUsername) throw new CustomError('Registration failed', { username: 'Username already in use' });

        return await prisma.user.create({
            data: { ...rest, passwordHash },
            omit: { passwordHash: true },
        });

    },

    async list(query: ListUsersQuery): Promise<Paginated<UserListRow>> {
        const where: Prisma.UserWhereInput = {};
        if (query.role) where.role = query.role;
        if (query.isActive !== undefined) where.isActive = query.isActive;

        const page = query.page;
        const pageSize = query.limit;

        const [items, total] = await Promise.all([
            prisma.user.findMany({
                where,
                orderBy: [{ isActive: "desc" }, { createdAt: "desc" }, { id: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                omit: { passwordHash: true },
            }),
            prisma.user.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
    },

    async update(id: number, input: UpdateUserInput) {
        const { password, ...rest } = input;
        const data = { ...rest } as Prisma.UserUpdateInput;

        if (password) {
            data.passwordHash = await argon2.hash(password);
        }

        if (rest.email) {
            const taken = await prisma.user.findFirst({
                where: { email: rest.email, id: { not: id } },
                select: { id: true },
            });
            if (taken) throw new CustomError('Update failed', { email: 'Email already in use' });
        }

        if (rest.phone) {
            const taken = await prisma.user.findFirst({
                where: { phone: rest.phone, id: { not: id } },
                select: { id: true },
            });
            if (taken) throw new CustomError('Update failed', { phone: 'Phone already in use' });
        }

        if (rest.username) {
            const taken = await prisma.user.findFirst({
                where: { username: rest.username, id: { not: id } },
                select: { id: true },
            });
            if (taken) throw new CustomError('Update failed', { username: 'Username already in use' });
        }

        return prisma.user.update({
            where: { id },
            data,
            omit: { passwordHash: true },
        });
    },
};

export default userService;