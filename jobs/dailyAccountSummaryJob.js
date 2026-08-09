const cron = require("node-cron");
const Account = require("../models/account");
const { sendDailyAccountSummaryEmail } = require("../utils/mailer");

function startDailyAccountSummaryJob() {
  // TEMP: every 2 minutes for testing. Change back to "0 11 * * *" for the real 11 AM IST daily run.
  cron.schedule(
    "*/2 * * * *",
    async () => {
      console.log(`[CRON] Daily account summary job triggered at ${new Date().toISOString()}`);
      try {
        const accounts = await Account.findAll({ order: [["name", "ASC"]] });
        await sendDailyAccountSummaryEmail({ accounts });
      } catch (error) {
        console.error("❌ [CRON] Daily account summary job failed:", error.message);
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  console.log("🕚 Daily account summary job scheduled: every 2 minutes (TEMP TESTING MODE)");
}

module.exports = startDailyAccountSummaryJob;