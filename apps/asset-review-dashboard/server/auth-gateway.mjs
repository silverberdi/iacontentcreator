import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const OWNER_EMAIL = "silverio.bernal@gmail.com";
const INITIAL_USERS = {
  [OWNER_EMAIL]: {
    email: OWNER_EMAIL,
    role: "admin",
    technicalMode: true,
    status: "approved",
    approvedBy: "system",
  },
  "ltmoralesp84@gmail.com": {
    email: "ltmoralesp84@gmail.com",
    role: "admin",
    technicalMode: false,
    status: "approved",
    approvedBy: "system",
  },
};

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const appRoot = resolve(__dirname, "..");
const distDir = resolve(appRoot, "dist");
const port = Number(process.env.PORT || 8088);
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || `http://localhost:${port}`).replace(/\/$/, "");
const webhookBaseUrl = (process.env.N8N_WEBHOOK_BASE_URL || "http://n8n:5678/webhook").replace(/\/$/, "");
const minioBaseUrl = (process.env.MINIO_BASE_URL || "http://minio:9000").replace(/\/$/, "");
const minioBucket = process.env.MINIO_BUCKET || process.env.MINIO_DEFAULT_BUCKET || "iacontentcreator-assets";
const minioAccessKey = process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || "";
const minioSecretKey = process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || "";
const minioRegion = process.env.MINIO_REGION || "us-east-1";
const aiGatewayBaseUrl = (process.env.AI_GATEWAY_BASE_URL || "http://ai-gateway:8095").replace(/\/$/, "");
const storePath = process.env.AUTH_STORE_PATH || "/data/auth-users.json";
const sessionSecret = requiredEnv("SESSION_SECRET");
const googleClientId = requiredEnv("GOOGLE_CLIENT_ID");
const googleClientSecret = requiredEnv("GOOGLE_CLIENT_SECRET");
const avataresApiKey = requiredEnv("AVATARES_API_KEY");

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function unbase64url(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(value) {
  return createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function signedCookieValue(payload) {
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

function signedStateValue(payload) {
  return signedCookieValue(payload);
}

function verifySignedCookie(value) {
  if (!value || !value.includes(".")) return null;
  const [encoded, signature] = value.split(".");
  const expected = sign(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }
  try {
    return JSON.parse(unbase64url(encoded));
  } catch {
    return null;
  }
}

function verifySignedState(value) {
  return verifySignedCookie(value);
}

function parseCookies(req) {
  const result = {};
  for (const part of (req.headers.cookie || "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) result[key] = decodeURIComponent(rest.join("="));
  }
  return result;
}

function setCookie(res, name, value, options = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.secure) parts.push("Secure");
  res.setHeader("Set-Cookie", [...cookieHeaders(res), parts.join("; ")]);
}

function clearCookie(res, name) {
  setCookie(res, name, "", { maxAge: 0 });
}

function cookieHeaders(res) {
  const current = res.getHeader("Set-Cookie");
  if (!current) return [];
  return Array.isArray(current) ? current : [current];
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function readStore() {
  const dir = resolve(storePath, "..");
  mkdirSync(dir, { recursive: true });
  if (!existsSync(storePath)) {
    writeFileSync(storePath, JSON.stringify({ users: INITIAL_USERS }, null, 2));
  }
  const store = JSON.parse(readFileSync(storePath, "utf8"));
  store.users = { ...INITIAL_USERS, ...(store.users || {}) };
  return store;
}

function writeStore(store) {
  writeFileSync(storePath, JSON.stringify(store, null, 2));
}

function publicUser(user) {
  if (!user) return null;
  return {
    email: user.email,
    name: user.name || user.email,
    picture: user.picture || null,
    role: user.role || "pending",
    status: user.status,
    technicalMode: Boolean(user.technicalMode),
    canApproveUsers: user.email === OWNER_EMAIL && user.status === "approved",
  };
}

function getSession(req) {
  const payload = verifySignedCookie(parseCookies(req).av_session);
  if (!payload?.email || payload.exp < Date.now()) return null;
  const user = readStore().users[String(payload.email).toLowerCase()];
  return user ? { user, payload } : null;
}

function requireApproved(req, res) {
  const session = getSession(req);
  if (!session?.user || session.user.status !== "approved") {
    sendJson(res, 401, { authenticated: false, error: "Unauthorized" });
    return null;
  }
  return session.user;
}

function requireOwner(req, res) {
  const user = requireApproved(req, res);
  if (!user) return null;
  if (user.email !== OWNER_EMAIL) {
    sendJson(res, 403, { error: "Only Silverio can approve console access." });
    return null;
  }
  return user;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function readRawBody(req, maxBytes = 12 * 1024 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      const error = new Error("Request body too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function parseMultipartFormData(req, body) {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return { fields: {}, files: [] };
  const boundary = `--${boundaryMatch[1] || boundaryMatch[2]}`;
  const parts = body.toString("binary").split(boundary).slice(1, -1);
  const fields = {};
  const files = [];
  for (const part of parts) {
    const trimmed = part.replace(/^\r\n/, "").replace(/\r\n$/, "");
    const separatorIndex = trimmed.indexOf("\r\n\r\n");
    if (separatorIndex < 0) continue;
    const rawHeaders = trimmed.slice(0, separatorIndex);
    const rawContent = trimmed.slice(separatorIndex + 4);
    const headers = {};
    for (const line of rawHeaders.split("\r\n")) {
      const [name, ...rest] = line.split(":");
      if (name) headers[name.toLowerCase()] = rest.join(":").trim();
    }
    const disposition = headers["content-disposition"] || "";
    const name = disposition.match(/name="([^"]+)"/)?.[1] || "";
    const filename = disposition.match(/filename="([^"]*)"/)?.[1] || "";
    const content = Buffer.from(rawContent, "binary");
    if (filename) {
      files.push({
        fieldName: name,
        filename,
        contentType: headers["content-type"] || "application/octet-stream",
        buffer: content,
      });
    } else if (name) {
      fields[name] = content.toString("utf8");
    }
  }
  return { fields, files };
}

function safeObjectPart(value, fallback = "file") {
  return String(value || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || fallback;
}

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value).digest(encoding);
}

function s3SigningKey(secretKey, dateStamp, region, service) {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

async function putMinioObject({ bucket, objectPath, buffer, contentType }) {
  if (!minioAccessKey || !minioSecretKey) {
    throw new Error("MINIO_ACCESS_KEY/MINIO_SECRET_KEY or MINIO_ROOT_USER/MINIO_ROOT_PASSWORD are required for uploads.");
  }
  const endpoint = new URL(minioBaseUrl);
  const encodedPath = objectPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const url = `${minioBaseUrl}/${encodeURIComponent(bucket)}/${encodedPath}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = createHash("sha256").update(buffer).digest("hex");
  const canonicalUri = `/${encodeURIComponent(bucket)}/${encodedPath}`;
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${endpoint.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    "",
  ].join("\n");
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${minioRegion}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");
  const signature = hmac(s3SigningKey(minioSecretKey, dateStamp, minioRegion, "s3"), stringToSign, "hex");
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "Host": endpoint.host,
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
      "Authorization": `AWS4-HMAC-SHA256 Credential=${minioAccessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: buffer,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text.slice(0, 300) || `MinIO upload failed (${response.status})`);
  }
  return {
    bucket,
    objectPath,
    publicUrl: `/minio/${bucket}/${objectPath}`,
    sha256: payloadHash,
    byteLength: buffer.length,
    mimeType: contentType,
  };
}

async function handleLogin(req, res) {
  const nonce = randomBytes(24).toString("base64url");
  const state = signedStateValue({ nonce, exp: Date.now() + 1000 * 60 * 10 });
  setCookie(res, "oauth_state", state, { maxAge: 600 });
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: `${publicBaseUrl}/auth/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  redirect(res, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

async function handleCallback(req, res) {
  const url = new URL(req.url, publicBaseUrl);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const statePayload = verifySignedState(state);
  const cookieState = parseCookies(req).oauth_state;
  if (
    !state ||
    !code ||
    !statePayload?.nonce ||
    statePayload.exp < Date.now() ||
    (cookieState && cookieState !== state)
  ) {
    sendJson(res, 400, { error: "Invalid OAuth state." });
    return;
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: `${publicBaseUrl}/auth/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    sendJson(res, 401, { error: "Google token exchange failed." });
    return;
  }

  const tokenData = await tokenResponse.json();
  const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userResponse.ok) {
    sendJson(res, 401, { error: "Google userinfo request failed." });
    return;
  }

  const profile = await userResponse.json();
  const email = String(profile.email || "").toLowerCase();
  if (!email || profile.email_verified !== true) {
    sendJson(res, 403, { error: "Google email must be verified." });
    return;
  }

  const store = readStore();
  const existing = store.users[email];
  const nextUser = existing || {
    email,
    status: "pending",
    role: "pending",
    technicalMode: false,
    requestedAt: new Date().toISOString(),
  };
  store.users[email] = {
    ...nextUser,
    email,
    name: profile.name || nextUser.name || email,
    picture: profile.picture || nextUser.picture || null,
    lastLoginAt: new Date().toISOString(),
  };
  writeStore(store);

  setCookie(
    res,
    "av_session",
    signedCookieValue({ email, exp: Date.now() + 1000 * 60 * 60 * 12 }),
    { maxAge: 60 * 60 * 12 },
  );
  clearCookie(res, "oauth_state");
  redirect(res, "/");
}

async function handleAuthApi(req, res, pathname) {
  if (pathname === "/api/auth/me") {
    const session = getSession(req);
    if (!session) return sendJson(res, 200, { authenticated: false });
    return sendJson(res, 200, {
      authenticated: true,
      user: publicUser(session.user),
    });
  }

  if (pathname === "/api/auth/logout") {
    clearCookie(res, "av_session");
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === "/api/auth/users" && req.method === "GET") {
    const owner = requireOwner(req, res);
    if (!owner) return;
    const users = Object.values(readStore().users).map(publicUser);
    return sendJson(res, 200, { ok: true, users });
  }

  if (pathname === "/api/auth/users/approve" && req.method === "POST") {
    const owner = requireOwner(req, res);
    if (!owner) return;
    const body = await readJsonBody(req);
    const email = String(body.email || "").toLowerCase();
    const store = readStore();
    if (!store.users[email]) return sendJson(res, 404, { error: "User not found." });
    store.users[email] = {
      ...store.users[email],
      status: "approved",
      role: body.role === "technical" ? "technical" : "admin",
      technicalMode: Boolean(body.technicalMode),
      approvedBy: owner.email,
      approvedAt: new Date().toISOString(),
    };
    writeStore(store);
    return sendJson(res, 200, { ok: true, user: publicUser(store.users[email]) });
  }

  if (pathname === "/api/auth/users/reject" && req.method === "POST") {
    const owner = requireOwner(req, res);
    if (!owner) return;
    const body = await readJsonBody(req);
    const email = String(body.email || "").toLowerCase();
    const store = readStore();
    if (!store.users[email]) return sendJson(res, 404, { error: "User not found." });
    store.users[email] = {
      ...store.users[email],
      status: "rejected",
      rejectedBy: owner.email,
      rejectedAt: new Date().toISOString(),
    };
    writeStore(store);
    return sendJson(res, 200, { ok: true, user: publicUser(store.users[email]) });
  }

  return sendJson(res, 404, { error: "Not found" });
}

async function proxyWebhook(req, res, pathname) {
  const user = requireApproved(req, res);
  if (!user) return;

  const target = `${webhookBaseUrl}${pathname.replace(/^\/webhook/, "")}${new URL(req.url, publicBaseUrl).search}`;
  const headers = {
    "Content-Type": req.headers["content-type"] || "application/json",
    "X-Avatares-Api-Key": avataresApiKey,
  };
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : req;
  const response = await fetch(target, { method: req.method, headers, body, duplex: "half" });
  res.writeHead(response.status, {
    "Content-Type": response.headers.get("content-type") || "application/json",
  });
  if (response.body) {
    for await (const chunk of response.body) res.write(chunk);
  }
  res.end();
}

async function proxyMinio(req, res, pathname) {
  const user = requireApproved(req, res);
  if (!user) return;

  const objectPath = pathname.replace(/^\/minio\/?/, "");
  if (!objectPath || objectPath.includes("..")) {
    sendJson(res, 400, { error: "Invalid MinIO object path." });
    return;
  }

  const target = `${minioBaseUrl}/${objectPath}${new URL(req.url, publicBaseUrl).search}`;
  const response = await fetch(target, { method: "GET" });
  res.writeHead(response.status, {
    "Content-Type": response.headers.get("content-type") || "application/octet-stream",
    "Cache-Control": response.headers.get("cache-control") || "private, max-age=300",
  });
  if (response.body) {
    for await (const chunk of response.body) res.write(chunk);
  }
  res.end();
}

async function handleOpsApi(req, res, pathname) {
  const user = requireApproved(req, res);
  if (!user) return;

  if (pathname === "/api/ops/ai-gateway-health" && req.method === "GET") {
    try {
      const response = await fetch(`${aiGatewayBaseUrl}/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const text = await response.text();
      let body;
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { raw: text };
      }
      const ok = response.ok && body?.ok !== false;
      console.log(
        JSON.stringify({
          route: "character-canon-chat",
          upstreamStatus: response.status,
          upstreamOk: response.ok,
          bodyOk: body?.ok,
          ok,
          error: body?.error ? String(body.error).slice(0, 240) : undefined,
        }),
      );
      return sendJson(res, response.ok ? 200 : 502, {
        upstreamStatus: response.status,
        ...body,
        ok,
      });
    } catch (error) {
      return sendJson(res, 502, {
        ok: false,
        service: "ai-gateway",
        error: error instanceof Error ? error.message : "ai-gateway health check failed",
      });
    }
  }

  return sendJson(res, 404, { error: "Not found" });
}

async function handleCharacterCanonApi(req, res, pathname) {
  const user = requireApproved(req, res);
  if (!user) return;

  if (pathname === "/api/character-canon/chat" && req.method === "POST") {
    try {
      const payload = await readJsonBody(req);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      let response;
      try {
        response = await fetch(`${aiGatewayBaseUrl}/character-canon/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": `console-character-canon-chat-${Date.now()}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      const text = await response.text();
      let body;
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { raw: text };
      }
      return sendJson(res, response.ok ? 200 : 502, {
        ok: response.ok && body?.ok !== false,
        upstreamStatus: response.status,
        ...body,
      });
    } catch (error) {
      return sendJson(res, 502, {
        ok: false,
        service: "ai-gateway",
        error:
          error instanceof Error && error.name === "AbortError"
            ? "character canon chat timed out after 120s"
            : error instanceof Error
              ? error.message
              : "character canon chat failed",
      });
    }
  }

  return sendJson(res, 404, { error: "Not found" });
}

async function handleCharactersApi(req, res, pathname) {
  const user = requireApproved(req, res);
  if (!user) return;

  if (pathname === "/api/characters/reference-upload" && req.method === "POST") {
    try {
      const body = await readRawBody(req);
      const { fields, files } = parseMultipartFormData(req, body);
      const file = files.find((item) => item.fieldName === "file") || files[0];
      if (!file) {
        return sendJson(res, 400, { ok: false, error: "Select an image file before uploading." });
      }
      const avatar = safeObjectPart(fields.avatar, "");
      if (!avatar) {
        return sendJson(res, 400, { ok: false, error: "avatar is required." });
      }
      const classification = safeObjectPart(fields.classification || "identity-candidate");
      const scene = safeObjectPart(fields.scene || "portrait-canon");
      const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
      if (!allowedTypes.has(file.contentType)) {
        return sendJson(res, 400, {
          ok: false,
          error: "Only PNG, JPEG, or WebP images can be uploaded.",
        });
      }
      if (file.buffer.length < 1000) {
        return sendJson(res, 400, { ok: false, error: "Image file is too small or empty." });
      }
      const extByType = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
      };
      const ext = extByType[file.contentType] || extname(file.filename) || ".png";
      const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "").replace("T", "T");
      const originalName = safeObjectPart(file.filename.replace(/\.[^.]+$/, ""), "reference");
      const objectPath = [
        "avatars",
        avatar,
        "references",
        `${classification}-${scene}-${timestamp}-${randomBytes(4).toString("hex")}-${originalName}${ext}`,
      ].join("/");
      const uploaded = await putMinioObject({
        bucket: minioBucket,
        objectPath,
        buffer: file.buffer,
        contentType: file.contentType,
      });
      return sendJson(res, 200, {
        ok: true,
        upload: {
          ...uploaded,
          sourceFilename: file.filename,
          classification,
          scene,
          uploadedBy: user.email,
        },
      });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Reference image upload failed.",
      });
    }
  }

  return sendJson(res, 404, { error: "Not found" });
}

function serveStatic(req, res, pathname) {
  let candidate = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(resolve(join(distDir, candidate)));
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  const finalPath = existsSync(filePath) ? filePath : join(distDir, "index.html");
  const contentType = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  }[extname(finalPath)] || "application/octet-stream";
  const cacheControl = extname(finalPath) === ".html"
    ? "no-store"
    : extname(finalPath) === ".js" || extname(finalPath) === ".css"
      ? "no-cache"
      : "private, max-age=300";
  res.writeHead(200, { "Content-Type": contentType, "Cache-Control": cacheControl });
  createReadStream(finalPath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, publicBaseUrl);
    if (pathname === "/auth/login") return handleLogin(req, res);
    if (pathname === "/auth/callback") return handleCallback(req, res);
    if (pathname.startsWith("/api/auth/")) return handleAuthApi(req, res, pathname);
    if (pathname.startsWith("/api/ops/")) return handleOpsApi(req, res, pathname);
    if (pathname.startsWith("/api/characters/")) return handleCharactersApi(req, res, pathname);
    if (pathname.startsWith("/api/character-canon/")) return handleCharacterCanonApi(req, res, pathname);
    if (pathname.startsWith("/webhook/")) return proxyWebhook(req, res, pathname);
    if (pathname.startsWith("/minio/")) return proxyMinio(req, res, pathname);
    return serveStatic(req, res, pathname);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "Internal server error" });
  }
});

server.listen(port, () => {
  console.log(`Avatares AI console listening on ${port}`);
});
