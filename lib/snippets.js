export const ENV_LOCAL = `# .env.local  — never commit this file
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/codefest?retryWrites=true&w=majority"
JWT_SECRET="paste-a-long-random-string-here"
JWT_EXPIRES_IN="1h"
# Public by design: Google client IDs are not secrets
NEXT_PUBLIC_GOOGLE_CLIENT_ID="1234567890-abc.apps.googleusercontent.com"`;

export const MONGODB_JS = `import mongoose from "mongoose";

// Next.js re-evaluates modules on every hot reload in dev.
// Caching on \`global\` survives reloads, so we reuse ONE pool
// instead of opening a new connection on every save.
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing — add it to .env.local");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}`;

export const HEALTH_ROUTE = `import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";

export async function GET() {
  const started = Date.now();
  try {
    await connectDB();
    await mongoose.connection.db.admin().ping();

    return Response.json({
      status: "ok",
      db: "connected",
      dbName: mongoose.connection.name,
      latencyMs: Date.now() - started,
    });
  } catch (err) {
    return Response.json(
      { status: "error", db: "disconnected", error: err.message },
      { status: 503 }
    );
  }
}`;

export const PROJECT_MODEL = `import mongoose from "mongoose";
import { CATEGORIES } from "@/lib/constants";

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true, maxlength: 80 },
    description: { type: String, required: [true, "Description is required"], trim: true, maxlength: 500 },
    category: { type: String, required: true, enum: CATEGORIES },
    teamName: { type: String, trim: true, maxlength: 60 },
    repoUrl: { type: String, trim: true },
  },
  { timestamps: true } // adds createdAt + updatedAt
);

// Reuse the compiled model on hot reload instead of redefining it
export default mongoose.models.Project || mongoose.model("Project", ProjectSchema);`;

export const PROJECTS_ROUTE = `import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";

export async function GET() {
  await connectDB();
  const projects = await Project.find().sort({ createdAt: -1 }).lean();
  return Response.json({ projects });
}

export async function POST(request) {
  try {
    const { title, description, category, teamName, repoUrl } = await request.json();
    await connectDB();
    const project = await Project.create({ title, description, category, teamName, repoUrl });
    return Response.json({ project }, { status: 201 });
  } catch (err) {
    if (err.name === "ValidationError") {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}`;

export const PROJECT_ID_ROUTE = `import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import Project from "@/models/Project";

export async function DELETE(request, { params }) {
  const user = requireAuth(request);
  if (!user) {
    return Response.json({ error: "Unauthorized — log in first" }, { status: 401 });
  }

  const { id } = await params; // params is a Promise in Next.js 15+
  if (!mongoose.isValidObjectId(id)) {
    return Response.json({ error: "Invalid project id" }, { status: 400 });
  }

  await connectDB();
  const deleted = await Project.findByIdAndDelete(id);
  if (!deleted) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
  return Response.json({ ok: true, id });
}`;

export const USER_MODEL = `import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    provider: { type: String, enum: ["local", "google"], default: "local" },
    // Local provider only. select: false = never returned unless asked for
    passwordHash: { type: String, select: false },
    // Google provider only. sparse lets many local users have no googleId
    googleId: { type: String, unique: true, sparse: true },
    avatar: String,
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);`;

export const AUTH_LIB = `import jwt from "jsonwebtoken";

export function signToken(user, provider = "local") {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, name: user.name, provider },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );
}

// Auth guard: returns the decoded payload, or null if missing/invalid/expired
export function requireAuth(request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}`;

export const REGISTER_ROUTE = `import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request) {
  const { name, email, password } = await request.json();

  if (!name || !email || !password || password.length < 8) {
    return Response.json(
      { error: "Name, email and a password of 8+ characters are required" },
      { status: 400 }
    );
  }

  await connectDB();
  const normalisedEmail = email.toLowerCase().trim();
  if (await User.exists({ email: normalisedEmail })) {
    return Response.json({ error: "Email is already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10); // 10 salt rounds
  const user = await User.create({ name, email: normalisedEmail, passwordHash });

  return Response.json(
    { user: { id: user._id, name: user.name, email: user.email } },
    { status: 201 }
  );
}`;

export const LOGIN_ROUTE = `import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { signToken } from "@/lib/auth";
import User from "@/models/User";

export async function POST(request) {
  const { email, password } = await request.json();
  await connectDB();

  const user = await User.findOne({ email: email?.toLowerCase().trim() }).select("+passwordHash");
  // Google-only accounts have no passwordHash, so they can't use this route
  const valid = user?.passwordHash && (await bcrypt.compare(password || "", user.passwordHash));

  // Same message for "no user" and "wrong password" — don't leak which emails exist
  if (!valid) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = signToken(user, "local");
  return Response.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, provider: "local" },
  });
}`;

export const GOOGLE_ROUTE = `import { OAuth2Client } from "google-auth-library";
import { connectDB } from "@/lib/mongodb";
import { signToken } from "@/lib/auth";
import User from "@/models/User";

const google = new OAuth2Client();

export async function POST(request) {
  const { credential } = await request.json();

  // 1. Verify Google's signature AND that the token was issued for OUR app
  let profile;
  try {
    const ticket = await google.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    profile = ticket.getPayload();
  } catch {
    return Response.json({ error: "Invalid Google token" }, { status: 401 });
  }
  if (!profile?.email_verified) {
    return Response.json({ error: "Google email is not verified" }, { status: 401 });
  }

  // 2. Find or create the user (links to an existing local account by email)
  await connectDB();
  const email = profile.email.toLowerCase();
  let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email }] });
  if (!user) {
    user = await User.create({
      name: profile.name,
      email,
      provider: "google",
      googleId: profile.sub,
      avatar: profile.picture,
    });
  } else if (!user.googleId) {
    user.googleId = profile.sub;
    user.avatar ??= profile.picture;
    await user.save();
  }

  // 3. Issue OUR JWT: protected routes never need to know about Google
  const token = signToken(user, "google");
  return Response.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, provider: "google" },
  });
}`;

export const GITIGNORE = `# dependencies
/node_modules

# next.js
/.next/
/out/

# env files — secrets live here
.env*
!.env.example

# vercel
.vercel`;

export const ENV_EXAMPLE = `# .env.example — commit this one (placeholders only)
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/codefest"
JWT_SECRET="generate-a-long-random-string"
JWT_EXPIRES_IN="1h"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"`;

export const RENDER_YAML = `# render.yaml: Render Blueprint (already in the repo root)
services:
  - type: web
    name: utp-codefest-bff-workshop
    runtime: node
    plan: free
    region: singapore
    buildCommand: npm ci && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_VERSION
        value: "22"
      - key: MONGODB_URI
        sync: false          # Render asks you for the value
      - key: JWT_SECRET
        generateValue: true  # Render generates a random secret
      - key: JWT_EXPIRES_IN
        value: 1h
      - key: NEXT_PUBLIC_GOOGLE_CLIENT_ID
        sync: false`;

export const GIT_PUSH = `git init
git add .
git status            # make sure .env.local is NOT listed
git commit -m "BFF workshop: Next.js + MongoDB + JWT"
git branch -M main
git remote add origin https://github.com/<you>/utp-codefest-bff-workshop.git
git push -u origin main`;

export const VERCEL_CLI = `npm i -g vercel
vercel login
vercel link
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production
vercel --prod`;

export const GIT_UNTRACK = `# Accidentally committed a secret? Untrack it AND rotate it.
git rm --cached .env.local
git commit -m "Stop tracking .env.local"
# Then: change the Atlas DB user password + generate a new JWT_SECRET`;
