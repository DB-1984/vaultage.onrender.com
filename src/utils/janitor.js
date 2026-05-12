// utils/janitor.js
import { success } from "zod";
import prisma from "./prisma.js";
import supabaseAdmin from "./supabaseAdmin.js";

export const purgeCanaries = async () => {
  try {
    // 1. Find the targets
    const canaries = await prisma.file.findMany({
      where: {
        name: {
          equals: "example.txt",
          mode: "insensitive", // <--- This is the magic line for Postgres
        },
      },
      select: { id: true, storageKey: true },
    });

    if (canaries.length === 0) return { success: true, count: 0 };
    console.log(success);
    const paths = canaries.map((f) => f.storageKey);

    // 2. Wipe Cloud Storage
    const { error } = await supabaseAdmin.storage
      .from("Vaultage")
      .remove(paths);

    if (error) throw error;

    // 3. Wipe Database Registry
    await prisma.file.deleteMany({
      where: { id: { in: canaries.map((f) => f.id) } },
    });

    return { success: true, count: canaries.length };
  } catch (err) {
    console.error("!! JANITOR_ERROR:", err.message);
    return { success: false, error: err.message };
  }
};
