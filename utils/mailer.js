const nodemailer = require("nodemailer");

// ✅ Gmail SMTP transporter (POC)
// Requires a Gmail "App Password" (not your normal password):
// Google Account → Security → 2-Step Verification → App Passwords
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(
      "⚠️ EMAIL_USER / EMAIL_PASS not set. Transaction emails will be skipped."
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password
    },
  });

  return transporter;
}

/**
 * Fire-and-forget email notification for a transaction.
 * Never throws — logs and swallows errors so it can't break the request flow.
 */
async function sendTransactionEmail({ transaction, account, event = "created" }) {
  try {
    const t = getTransporter();
    if (!t) return;

    const to = process.env.TRANSACTION_ALERT_EMAIL;
    if (!to) {
      console.warn("⚠️ TRANSACTION_ALERT_EMAIL not set. Skipping email.");
      return;
    }

    const subject = `[Order Mgmt] Transaction ${event}: ${transaction.type.toUpperCase()} ₹${transaction.amount}`;

    const html = `
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

    await t.sendMail({
      from: `"Order Management" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`📧 Transaction email sent to ${to}`);
  } catch (error) {
    // Never let email failures affect the API response
    console.error("❌ Failed to send transaction email:", error.message);
  }
}

module.exports = { sendTransactionEmail };
