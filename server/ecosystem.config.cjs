/**
 * PM2 config for plan-partner API.
 * Run from server folder: pm2 start ecosystem.config.cjs
 * Ensure you've built first: npm run build
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
