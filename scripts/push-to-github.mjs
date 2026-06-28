import fs from "fs";
import path from "path";

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "cachimacarlos748-jpg";
const REPO = "spark-ai";
const API = "https://api.github.com";

const IGNORE_DIRS = new Set([
  "node_modules", ".expo", "dist", ".git", ".pnpm-store",
  ".turbo", ".cache", "__pycache__", ".local", ".agents",
]);

const IGNORE_FILES = new Set([
  ".DS_Store", "pnpm-lock.yaml",
]);

const ALLOWED_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md",
  ".yaml", ".yml", ".toml", ".mjs", ".cjs", ".css",
  ".html", ".svg", ".gitignore", ".env.example",
]);

function getFiles(dir, baseDir = dir) {
  const files = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith(".pnpm")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      if (IGNORE_FILES.has(entry.name)) continue;
      const ext = path.extname(entry.name);
      const isAllowed = ALLOWED_EXTS.has(ext) ||
        (ext === "" && [".gitignore", ".env.example", "Makefile"].includes(entry.name));
      if (!isAllowed) continue;
      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > 3 * 1024 * 1024) continue; // skip > 3MB
        files.push(path.relative(baseDir, fullPath));
      } catch { continue; }
    }
  }
  return files;
}

async function gh(endpoint, options = {}) {
  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${JSON.stringify(data).slice(0, 120)}`);
  return data;
}

async function main() {
  const ROOT = "/home/runner/workspace";

  // Step 1: Bootstrap with README via contents API (works on empty repos)
  console.log("📝 Creating initial commit via contents API...");
  const readmeContent = Buffer.from(`# Spark AI\n\nAsistente de IA personal construido con Expo + Gemini + Clerk Auth.\n\n## Features\n- 🔐 Google Sign-In (Clerk)\n- ⚡ Spark 3.5 Flash & 🧠 Spark 3.1 Pro (Gemini 2.5)\n- 📡 Spark Offline (sin internet)\n- 🎙️ Entrada de voz\n- 📎 Adjuntar imágenes\n- 💬 Historial de conversaciones\n\n## Stack\n- Expo SDK 54 / React Native\n- Express 5 + Gemini API\n- Clerk Auth\n`).toString("base64");

  let initCommitSha, initTreeSha;
  try {
    const result = await gh(`/repos/${OWNER}/${REPO}/contents/README.md`, {
      method: "PUT",
      body: JSON.stringify({
        message: "chore: init repository",
        content: readmeContent,
      }),
    });
    initCommitSha = result.commit.sha;
    initTreeSha = result.commit.tree.sha;
    console.log("✅ Initial commit:", initCommitSha.slice(0, 7));
  } catch (err) {
    // README might already exist
    console.log("ℹ️  Init commit skipped:", err.message);
    const ref = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/main`);
    initCommitSha = ref.object.sha;
    const commit = await gh(`/repos/${OWNER}/${REPO}/git/commits/${initCommitSha}`);
    initTreeSha = commit.tree.sha;
  }

  // Step 2: Collect all source files
  console.log("\n📁 Scanning files...");
  const files = getFiles(ROOT);
  console.log(`Found ${files.length} files`);

  // Step 3: Create blobs in batches
  console.log("📤 Uploading files...");
  const treeItems = [];
  let processed = 0;

  for (const file of files) {
    if (file === "README.md") continue; // already created
    const fullPath = path.join(ROOT, file);
    try {
      const content = fs.readFileSync(fullPath).toString("base64");
      const blob = await gh(`/repos/${OWNER}/${REPO}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content, encoding: "base64" }),
      });
      treeItems.push({
        path: file.replace(/\\/g, "/"),
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      });
      processed++;
      if (processed % 10 === 0) process.stdout.write(`  ${processed}/${files.length} files...\r`);
    } catch (err) {
      console.log(`  ⚠️  ${file}: ${err.message.slice(0, 60)}`);
    }
  }

  console.log(`\n✅ Uploaded ${treeItems.length} files`);

  // Step 4: Create tree
  console.log("🌳 Creating tree...");
  const tree = await gh(`/repos/${OWNER}/${REPO}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: initTreeSha, tree: treeItems }),
  });

  // Step 5: Create commit
  console.log("💾 Creating commit...");
  const commit = await gh(`/repos/${OWNER}/${REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: "🚀 Spark AI — Clerk auth, voice input, image uploads, offline mode",
      tree: tree.sha,
      parents: [initCommitSha],
      author: { name: "Spark AI", email: "spark@replit.com", date: new Date().toISOString() },
    }),
  });

  // Step 6: Update branch
  console.log("🔗 Updating main branch...");
  await gh(`/repos/${OWNER}/${REPO}/git/refs/heads/main`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: true }),
  });

  console.log(`\n🎉 DONE! https://github.com/${OWNER}/${REPO}`);
  console.log(`   Commit: ${commit.sha.slice(0, 7)}`);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
