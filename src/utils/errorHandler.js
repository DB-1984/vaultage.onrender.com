import { Prisma } from "@prisma/client";

const errorHandler = (err, req, res, next) => {
  // Prefer an explicit statusCode on the error if present
  let statusCode =
    err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || "Server error";

  // ---------- Prisma error handling ----------
  // Unique constraint failed (e.g. duplicate email)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = 409;
      // err.meta?.target is often something like ["email"]
      const target = Array.isArray(err.meta?.target)
        ? err.meta.target.join(", ")
        : "field";
      message = `Duplicate value for ${target}.`;
    }

    // Record not found (common when updating/deleting with a where that doesn't exist)
    if (err.code === "P2025") {
      statusCode = 404;
      message = "Resource not found.";
    }

    // Foreign key constraint failed
    if (err.code === "P2003") {
      statusCode = 400;
      message = "Invalid reference (foreign key constraint).";
    }
  }

  // Prisma validation errors (wrong types, missing required fields, etc.)
  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Invalid request data.";
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export { errorHandler };
