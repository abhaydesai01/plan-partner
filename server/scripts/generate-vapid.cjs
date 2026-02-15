#!/usr/bin/env node
/**
 * Generate VAPID keys for Web Push.
 * Run: node server/scripts/generate-vapid.cjs
 * Add the output to your .env:
 *   Server (server/.env): VAPID_PUBLIC_KEY=...  VAPID_PRIVATE_KEY=...
 *   Frontend (.env):      VITE_VAPID_PUBLIC_KEY=... (same public key)
 */
const webpush = require("web-push");

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log("\nAdd these to your environment:\n");
console.log("# Server (server/.env)");
console.log("VAPID_PUBLIC_KEY=" + publicKey);
console.log("VAPID_PRIVATE_KEY=" + privateKey);
console.log("\n# Frontend (.env) - use the SAME public key");
console.log("VITE_VAPID_PUBLIC_KEY=" + publicKey);
console.log("");
