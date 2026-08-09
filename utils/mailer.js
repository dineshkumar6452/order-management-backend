const axios = require("axios");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Fire-and-forget email notification for a transaction.
 * Uses Brevo's Transactional Email API (HTTPS) instead of SMTP,
 * so it isn't affected by hosting providers blocking outbound SMTP ports.
 * Never throws — logs and swallows errors so it can't break the request flow.
 */
async function sendTransactionEmail({ transaction, account, event = "created" }) {
  console.log(
    `📨 [mailer] sendTransactionEmail called. event=${event}, transactionId=${transaction?.id}, accountId=${transaction?.accountId}`
  );

  try {
    const apiKey = process.env.BREVO_API_KEY;
    console.log(`📨 [mailer] BREVO_API_KEY set: ${!!apiKey}`);
    if (!apiKey) {
      console.warn("⚠️ [mailer] BREVO_API_KEY not set. Skipping email.");
      return;
    }

    const to = process.env.TRANSACTION_ALERT_EMAIL;
    console.log(`📨 [mailer] TRANSACTION_ALERT_EMAIL set: ${!!to}${to ? ` (to=${to})` : ""}`);
    if (!to) {
      console.warn("⚠️ [mailer] TRANSACTION_ALERT_EMAIL not set. Skipping email.");
      return;
    }

    const fromEmail = process.env.BREVO_SENDER_EMAIL;
    if (!fromEmail) {
      console.warn("⚠️ [mailer] BREVO_SENDER_EMAIL not set. Skipping email.");
      return;
    }

    const subject = `[Order Mgmt] Transaction ${event}: ${transaction.type.toUpperCase()} ₹${transaction.amount}`;

    const htmlContent = `
      <h3>Transaction ${event}</h3>
      <table cellpadding="6" style="border-collapse:collapse">
        <tr><td><b>Account</b></td><td>${account?.name ?? transaction.accountId}</td></tr>
        <tr><td><b>Type</b></td><td>${transaction.type}</td></tr>
        <tr><td><b>Amount</b></td><td>₹${transaction.amount}</td></tr>
        <tr><td><b>Description</b></td><td>${transaction.description ?? "-"}</td></tr>
        <tr><td><b>New Balance</b></td><td>₹${account?.balance ?? "-"}</td></tr>
        <tr><td><b>Created By</b></td><td>${transaction.createdBy ?? "-"}</td></tr>
        <tr><td><b>Time</b></td><td>${new Date(transaction.createdAt || Date.now()).toLocaleString()}</td></tr>
      </table>
    `;

    // Brevo allows multiple recipients as an array; support comma-separated env value
    const toList = to.split(",").map((addr) => ({ email: addr.trim() }));

    console.log(`📨 [mailer] Calling Brevo API -> to=${to}, subject="${subject}"`);

    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: { name: "Order Management", email: fromEmail },
        to: toList,
        subject,
        htmlContent,
      },
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 10000,
      }
    );

    console.log(
      `📧 [mailer] Transaction email sent via Brevo. status=${response.status}, messageId=${response.data?.messageId}`
    );
  } catch (error) {
    // Never let email failures affect the API response
    console.error("❌ [mailer] Failed to send transaction email via Brevo.");
    console.error("❌ [mailer] message:", error.message);
    if (error.response) {
      console.error("❌ [mailer] status:", error.response.status);
      console.error("❌ [mailer] data:", JSON.stringify(error.response.data));
    }
  }
}

module.exports = { sendTransactionEmail };
