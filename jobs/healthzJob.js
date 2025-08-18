const cron = require("node-cron");

function startHealthzJob() {
  cron.schedule("*/10 9-21 * * *", () => {
    console.log(`[CRON] Health check ping at ${new Date().toISOString()}`);
  });
}

module.exports = startHealthzJob;
