import { PrismaClient } from "@prisma/client";[[1](https://www.google.com/url?sa=E&q=https%3A%2F%2Fvertexaisearch.cloud.google.com%2Fgrounding-api-redirect%2FAUZIYQE_oA9yZP1l8YP6cyTt1ctyFQU3jDHsVS5B3BZ30HtzJ8Pg8uIGBcbr9bj1n63QEliMHsj3F798pepah23p40UTSteSp26bhSdEu7Nw0X3WsMSbSaZqsb5QPuZx8i2s15r1_j7Ky-Kx2oSEk4DMbr52aLV5_KLuANFgd6wgsJPB7NInOxbKbtEOv7YkvkR_NkY%3D)]

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;