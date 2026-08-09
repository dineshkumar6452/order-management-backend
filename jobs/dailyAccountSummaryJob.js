const cron = require("node-cron");
const Account = require("../models/account");
const Transaction = require("../models/transaction");
const { sendDailyAccountSummaryEmail } = require("../utils/mailer");

function startDailyAccountSummaryJob() {
  // TEMP: every 2 minutes for testing. Change back to "0 11 * * *" for the real 11 AM IST daily run.
  cron.schedule(
    "0 11 * * *",
    async () => {
      console.log(`[CRON] Daily account summary job triggered at ${new Date().toISOString()}`);
      try {
        const accounts = await Account.findAll({ order: [["name", "ASC"]] });

        // Get the most recent transaction UPDATE time per account in one query
        // (updatedAt reflects create, edit, or any later modification — a truer
        // "last activity" signal than createdAt alone)
        const lastTxnRows = await Transaction.findAll({
          attributes: [
            "accountId",
            [Transaction.sequelize.fn("MAX", Transaction.sequelize.col("updatedAt")), "lastTransactionDate"],
          ],
          group: ["accountId"],
          raw: true,
        });

        const lastTxnMap = new Map(
          lastTxnRows.map((row) => [row.accountId, row.lastTransactionDate])
        );

        const accountsWithLastTxn = accounts.map((a) => {
          const plain = a.toJSON();
          plain.lastTransactionDate = lastTxnMap.get(a.id) || null;
          return plain;
        });

        await sendDailyAccountSummaryEmail({ accounts: accountsWithLastTxn });
      } catch (error) {
        console.error("❌ [CRON] Daily account summary job failed:", error.message);
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  console.log("🕚 Daily account summary job scheduled: every 2 minutes (TEMP TESTING MODE)");
}

module.exports = startDailyAccountSummaryJob;