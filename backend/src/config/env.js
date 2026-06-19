// backend/src/config/env.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load Atlas credentials (ignored by git)
dotenv.config({ path: path.resolve(__dirname, "../../../atlas-credentials.env") });
// Load generic .env if exists (optional)
dotenv.config({ path: path.resolve(__dirname, "../../../.env"), override: false });
