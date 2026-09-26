import prisma from "../utils/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createFolder = asyncHandler(async (req, res) => {
  const { name, parentId } = req.body;
  const userId = req.user.id; // From 'protect' middleware

  // 1. Validation: If nesting, verify the user owns the parent folder
  if (parentId) {
    const parentFolder = await prisma.folder.findFirst({
      where: { id: parentId, ownerId: userId },
    });

    if (!parentFolder) {
      res.status(404);
      throw new Error("Parent folder not found or unauthorized");
    }
  }

  // 2. Create the folder in the DB
  const folder = await prisma.folder.create({
    data: {
      name,
      ownerId: userId,
      parentId: parentId || null,
    },
  });

  res.status(201).json(folder);
});

export const getFolderContent = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const folderId = req.query.folderId || null; // Get from query string (?folderId=...)

  // 1. Fetch Folders
  const folders = await prisma.folder.findMany({
    where: {
      ownerId: userId,
      parentId: folderId,
    },
    orderBy: { name: "asc" },
  });

  // 2. Fetch Files
  const files = await prisma.file.findMany({
    where: {
      ownerId: userId,
      folderId: folderId,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    currentFolder: folderId,
    folders,
    files,
  });
});

export const deleteFolder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // 1. Verify ownership and existence
  const folder = await prisma.folder.findFirst({
    where: { id, ownerId: userId },
    include: {
      files: true, // Get files inside
      subFolders: true, // Get subfolders inside
    },
  });

  if (!folder) {
    res.status(404);
    throw new Error("Folder not found");
  }

  // 2. Security/UX Check: In this version, we'll only allow deleting empty folders
  // OR we can recursively delete. To keep your storage clean, let's ensure it's empty.
  if (folder.files.length > 0 || folder.subFolders.length > 0) {
    res.status(400);
    throw new Error(
      "Cannot delete folder: Please delete or move contents first."
    );
  }

  // 3. Delete the folder record
  await prisma.folder.delete({
    where: { id },
  });

  res.status(200).json({ message: "Folder deleted" });
});

export const updateFolder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, parentId } = req.body;
  const userId = req.user.id;

  // 1. Check if folder exists and user owns it
  const folder = await prisma.folder.findFirst({
    where: { id, ownerId: userId },
  });

  if (!folder) {
    res.status(404);
    throw new Error("Folder not found");
  }

  // 2. Prevent moving a folder into itself
  if (parentId === id) {
    res.status(400);
    throw new Error("A folder cannot be its own parent");
  }

  // 3. Perform update
  const updatedFolder = await prisma.folder.update({
    where: { id },
    data: {
      name: name || folder.name,
      parentId: parentId !== undefined ? parentId : folder.parentId,
    },
  });

  res.status(200).json(updatedFolder);
});
