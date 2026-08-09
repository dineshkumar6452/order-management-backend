const cron = require("node-cron");
const Account = require("../models/account");
const { sendDailyAccountSummaryEmail } = require("../utils/mailer");

function startDailyAccountSummaryJob() {
  // Runs every day at 11:00 AM IST (Asia/Kolkata)
  cron.schedule(
    "0 11 * * *",
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

  console.log("🕚 Daily account summary job scheduled for 11:00 AM IST");
}

module.exports = startDailyAccountSummaryJob;