// controllers/fileController.js
import prisma from "../utils/prisma.js";
import supabase from "../utils/supabaseAdmin.js";
import asyncHandler from "../utils/asyncHandler.js";
import { randomUUID } from "node:crypto";

// controllers/fileController.js

export const stageUploads = async (req, res) => {
  const { files } = req.body;
  const userId = req.user.id;

  // Toggle based on .env (Strings "true"/"false")
  const allowRealUploads = process.env.VLT_ALLOW_REAL_UPLOADS === "true";

  try {
    const stagingManifest = await Promise.all(
      files.map(async (file) => {
        // 1. GATEKEEPER: Check if we are in 'Canary' or 'Production' mode
        if (!allowRealUploads) {
          const isExample = file.name.toLowerCase() === "example.txt";
          const isEmpty = parseInt(file.size) === 0;

          if (!isExample || !isEmpty) {
            throw new Error(
              `SECURITY_RESTRICTION: Demo mode only accepts 0-byte 'example.txt'.`
            );
          }
        }

        // 2. CAPACITY CHECK: Standard 50MB ceiling
        const MAX_FILE_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`FILE_TOO_LARGE: ${file.name} exceeds 50MB.`);
        }

        const fileId = randomUUID();
        const storagePath = `${userId}/${fileId}`;

        // Target folder for the demo
        const targetFolderId = "cmlw75s560001mfjnk36olrvw";

        // 3. PRISMA: Create the record
        // We force 'application/octet-stream' to align with the S3 binary push
        const record = await prisma.file.create({
          data: {
            id: fileId,
            name: file.name,
            size: file.size,
            mimeType: "application/octet-stream",
            folderId: targetFolderId,
            ownerId: userId,
            storageKey: storagePath,
          },
        });

        // 4. SUPABASE: Generate Signed Upload URL
        const { data, error } = await supabase.storage
          .from("Vaultage")
          .createSignedUploadUrl(storagePath);

        if (error) throw error;

        return {
          id: record.id,
          name: file.name,
          uploadUrl: data.signedUrl,
        };
      })
    );

    res.status(200).json({ items: stagingManifest });
  } catch (err) {
    // 403 Forbidden covers both Auth issues and the Canary rejection
    res.status(403).json({ message: err.message });
  }
};

export const getDownloadUrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // 1. Find file and verify ownership
  const file = await prisma.file.findFirst({
    where: { id, ownerId: userId },
  });

  if (!file) {
    res.status(404);
    throw new Error("File not found or unauthorized");
  }

  // 2. Generate Signed Download URL (valid for 60 seconds)
  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .createSignedUrl(file.storageKey, 60, {
      download: file.name,
    });

  if (error) {
    res.status(500);
    throw new Error(`Storage Error: ${error.message}`);
  }

  res.status(200).json({
    signedUrl: data.signedUrl,
    fileName: file.name,
    expiresIn: 60,
  });
});

export const deleteFile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  console.log(`DEBUG: Attempting to delete file ${id} for user ${userId}`);

  const file = await prisma.file.findUnique({ where: { id } });

  if (!file) {
    console.error("DEBUG: File ID does not exist in DB at all.");
    res.status(404);
    throw new Error("File not found");
  }

  if (file.ownerId !== userId) {
    console.error(
      `DEBUG: Ownership Mismatch. File belongs to ${file.ownerId}, but requester is ${userId}`
    );
    res.status(401);
    throw new Error("Unauthorized");
  }
  // -----------------------------------------------------

  // 2. Cloud Storage Cleanup (Supabase/S3)
  const { error: storageError } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .remove([file.storageKey]);

  if (storageError) {
    res.status(500);
    throw new Error(`Cloud Storage Error: ${storageError.message}`);
  }

  // 3. Database Cleanup
  await prisma.file.delete({
    where: { id },
  });

  res.status(200).json({ message: "Object purged successfully" });
});

export const updateFile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, folderId } = req.body;
  const userId = req.user.id;

  const file = await prisma.file.findFirst({
    where: { id, ownerId: userId },
  });

  if (!file) {
    res.status(404);
    throw new Error("File not found");
  }

  const updatedFile = await prisma.file.update({
    where: { id },
    data: {
      name: name || file.name,
      folderId: folderId !== undefined ? folderId : file.folderId,
    },
  });

  res.status(200).json(updatedFile);
});
