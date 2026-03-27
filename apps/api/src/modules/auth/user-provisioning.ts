import { prisma } from "../../lib/prisma.js";

export async function createUser(params: {
  username: string;
  passwordHash: string;
}) {
  return prisma.user.create({
    data: {
      username: params.username,
      passwordHash: params.passwordHash,
    },
  });
}
