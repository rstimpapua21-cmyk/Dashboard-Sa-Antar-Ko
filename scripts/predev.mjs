import { copyFileSync } from "fs";

// Restore source template before dev server starts
copyFileSync("index.dev.html", "index.html");
console.log("✅ Restored source index.html for dev server");
