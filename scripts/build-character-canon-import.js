const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

const avatarConfigs = {
  "estefania-montealegre": {
    avatarType: "influencer",
    displayName: "Estefania Montealegre",
    status: "approved",
    sourceRoots: [
      "profile-contract.md",
      "00-identity",
      "02-visual",
      "03-prompts",
      "05-content",
      "07-system",
    ],
  },
  "didi-duarte": {
    targetAvatar: "diana-duarte",
    avatarType: "gfe-bfe",
    displayName: "Diana Duarte",
    status: "proposed-import",
    sourceRoots: ["canon", "references", "CHANGELOG.md"],
  },
  "andres-ferrer": {
    avatarType: "gfe-bfe",
    displayName: "Andres Ferrer",
    status: "proposed-import",
    sourceRoots: ["00-core"],
  },
};

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

function buildPayload(avatar) {
  const config = avatarConfigs[avatar];
  if (!config) {
    throw new Error(
      `Unknown avatar "${avatar}". Supported: ${Object.keys(avatarConfigs).join(", ")}`,
    );
  }

  const targetAvatar = config.targetAvatar || avatar;
  const avatarRoot = path.join(repoRoot, "avatars", avatar);
  const files = config.sourceRoots.flatMap((entry) => walkMarkdown(path.join(avatarRoot, entry)));
  if (!files.length) {
    throw new Error(`No markdown files found for ${avatar}`);
  }

  const sections = files.map((file) => {
    const relativePath = path.relative(avatarRoot, file);
    const fullMarkdown = fs.readFileSync(file, "utf8");
    return {
      key: sectionKey(relativePath),
      label: labelFromPath(relativePath),
      status: config.status === "approved" ? "approved" : "review-needed",
      summary: summarize(fullMarkdown),
      data: {
        sourcePath: `avatars/${avatar}/${relativePath}`,
        fullMarkdown,
      },
      sourceRefs: [`avatars/${avatar}/${relativePath}`],
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
    avatar: targetAvatar,
    avatarType: config.avatarType,
    displayName: config.displayName,
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

  const sourceHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(sourceManifest))
    .digest("hex");

  return {
    avatar: targetAvatar,
    avatarType: config.avatarType,
    displayName: config.displayName,
    status: config.status,
    schemaVersion: "character-canon-v1",
    canonJson,
    canonMarkdown,
    importSummary: `Imported ${sections.length} ${config.displayName} markdown canon documents into DB-backed canon.`,
    sourceManifest,
    sourceHash,
  };
}

const avatar = process.argv[2] || "estefania-montealegre";
process.stdout.write(JSON.stringify(buildPayload(avatar), null, 2));
