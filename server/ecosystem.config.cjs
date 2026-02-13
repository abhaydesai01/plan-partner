/**
 * PM2 config for plan-partner API.
 * Run from server folder: pm2 start ecosystem.config.cjs
 * Ensure you've built first: npm run build
 *
 * Production: set MONGODB_URI and JWT_SECRET on the server so the app can connect.
 * Option 1: Create server/.env on the server with:
 *   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/plan-partner?retryWrites=true&w=majority
 *   JWT_SECRET=your-secret-at-least-32-chars
 * Option 2: Use PM2 env (do not commit secrets): pm2 start ecosystem.config.cjs --update-env
 *   after setting env in shell or in this file's env block (only if not committed).
 */
module.exports = {
  apps: [
    {
      name: "plan-partner-api",
      script: "dist/index.js",
      interpreter: "node",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
