import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../utils/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import generateToken from "../utils/generateToken.js";
import { purgeCanaries } from "../utils/janitor.js";

// Runtime
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const register = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400);
    throw new Error("Invalid email or password.");
  }

  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409);
    throw new Error("Email already registered.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true, createdAt: true },
  });

  res.status(201).json(user);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user && (await bcrypt.compare(password, user.passwordHash))) {
    generateToken(res, user.id);

    // 2. Wrap the Janitor in a try/catch so it CANNOT break the login
    let cleanupCount = 0;
    try {
      const cleanup = await purgeCanaries();
      cleanupCount = cleanup.count || 0;
    } catch (janitorErr) {
      console.error("JANITOR_FAILED_BUT_LOGIN_CONTINUING:", janitorErr);
      // We don't throw here; we want the user to get their 200 OK regardless
    }

    // 3. Return the exact same structure you had before, plus the count
    return res.json({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      message: "Logged in",
      cleaned: cleanupCount, // Frontend will use this for the log
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

export const logout = (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  res.status(200).json({ message: "Logged out" });
};
