import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import prisma from "../utils/prisma.js";

export const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.jwt;

  if (!token) {
    res.status(401);
    throw new Error("Not authorised");
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error("Not authorised");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true },
  });

  if (!user) {
    res.status(401);
    throw new Error("Not authorised");
  }

  req.user = user;
  next();
});
