import { copyFileSync } from "fs";

// Copy built output to root for GitHub Pages (branch-based deployment)
copyFileSync("dist/index.html", "index.html");
console.log("✅ Copied built index.html to root for deployment");
