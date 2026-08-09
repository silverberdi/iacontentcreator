const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const avatarRoot = path.join(repoRoot, "avatars", "estefania-montealegre");

const sourceGlobs = [
  "profile-contract.md",
  "00-identity",
  "02-visual",
  "03-prompts",
  "05-content",
  "07-system",
];

function walkMarkdown(targetPath) {
  if (!fs.existsSync(targetPath)) return [];
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return targetPath.endsWith(".md") ? [targetPath] : [];
  return fs
    .readdirSync(targetPath)
    .flatMap((entry) => walkMarkdown(path.join(targetPath, entry)))
    .sort();
}

function sectionKey(relativePath) {
  return relativePath
    .replace(/\.md$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function labelFromPath(relativePath) {
  return relativePath
    .replace(/\.md$/, "")
    .split(/[/-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function summarize(markdown) {
  const withoutHeadings = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("---"));
  return withoutHeadings.slice(0, 4).join(" ").slice(0, 700) || "Imported canon source.";
}

const files = sourceGlobs.flatMap((entry) => walkMarkdown(path.join(avatarRoot, entry)));
const sections = files.map((file) => {
  const relativePath = path.relative(avatarRoot, file);
  const fullMarkdown = fs.readFileSync(file, "utf8");
  return {
    key: sectionKey(relativePath),
    label: labelFromPath(relativePath),
    status: "approved",
    summary: summarize(fullMarkdown),
    data: {
      sourcePath: `avatars/estefania-montealegre/${relativePath}`,
      fullMarkdown,
    },
    sourceRefs: [`avatars/estefania-montealegre/${relativePath}`],
  };
});

const sourceManifest = files.map((file) => {
  const relativePath = path.relative(repoRoot, file);
  const content = fs.readFileSync(file);
  return {
    path: relativePath,
    sha256: crypto.createHash("sha256").update(content).digest("hex"),
    bytes: content.length,
  };
});

const canonJson = {
  avatar: "estefania-montealegre",
  avatarType: "influencer",
  displayName: "Estefanía Montealegre",
  sections,
  source: {
    kind: "markdown-import",
    importedFrom: sourceManifest.map((item) => item.path),
    importedAt: new Date().toISOString(),
  },
};

const canonMarkdown = sections
  .map((section) => `# ${section.label}\n\n_Source: ${section.sourceRefs[0]}_\n\n${section.data.fullMarkdown}`)
  .join("\n\n---\n\n");

const importHash = crypto
  .createHash("sha256")
  .update(JSON.stringify(sourceManifest))
  .digest("hex");

const payload = {
  avatar: "estefania-montealegre",
  avatarType: "influencer",
  displayName: "Estefanía Montealegre",
  status: "approved",
  schemaVersion: "character-canon-v1",
  canonJson,
  canonMarkdown,
  importSummary: `Imported ${sections.length} Estefania markdown canon documents into DB-backed canon.`,
  sourceManifest,
  sourceHash: importHash,
};

process.stdout.write(JSON.stringify(payload, null, 2));
