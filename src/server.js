import express from "express";
import cors from "cors";
import "dotenv/config";
import path from "path";
import cookieParser from "cookie-parser";

// Routes
import fileRoutes from "./routes/fileRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import storageRoutes from "./routes/storageRoutes.js";
import folderRoutes from "./routes/folderRoutes.js";
import { errorHandler } from "./utils/errorHandler.js";

const app = express();

// 1. MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// 2. STATIC SERVING (The "One Line" Solution)
// This lets the browser see /src/utils/explorer.js because it's relative to project root
app.use(express.static(process.cwd()));

// 3. PAGE ROUTES
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "src/ui/statusTemplate.html"));
});

// 4. API ROUTES
app.use("/auth", authRoutes);
app.use("/folders", folderRoutes);
app.use("/files", fileRoutes);
app.use("/storage", storageRoutes);

// 5. ERROR HANDLING (Must be last)
app.use((req, res, next) => {
  // We check if it's an API call or a file request
  res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Vaultage POC listening on ${port}`));