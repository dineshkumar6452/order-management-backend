const axios = require("axios");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// 🎨 Color palette per event/type — used for badges and accent bars
const COLORS = {
  created: { bg: "#e8f5e9", text: "#2e7d32", accent: "#22c55e" },
  updated: { bg: "#fff8e1", text: "#b45309", accent: "#f59e0b" },
  deleted: { bg: "#fdecea", text: "#c62828", accent: "#ef4444" },
  credit:  { bg: "#e8f5e9", text: "#2e7d32", accent: "#22c55e" },
  debit:   { bg: "#fdecea", text: "#c62828", accent: "#ef4444" },
};

const ICONS = {
  created: "✨",
  updated: "✏️",
  deleted: "🗑️",
  credit: "⬆️",
  debit: "⬇️",
};

/**
 * Builds a polished HTML email around a set of label/value rows.
 * Inline styles only, for maximum email-client compatibility.
 */
function buildEmailHtml({ heading, badgeText, badgeKey, rows }) {
  const palette = COLORS[badgeKey] || COLORS.created;
  const icon = ICONS[badgeKey] || "📌";

  const rowsHtml = rows
    .filter((r) => r.value !== undefined && r.value !== null)
    .map(
      (r, i) => `
        <tr style="${i % 2 === 0 ? "background-color:#fafafa;" : ""}">
          <td style="padding:12px 16px;font-size:13px;color:#6b7280;font-weight:600;white-space:nowrap;border-bottom:1px solid #f0f0f0;">${r.label}</td>
          <td style="padding:12px 16px;font-size:14px;color:#111827;border-bottom:1px solid #f0f0f0;">${r.value}</td>
        </tr>`
    )
    .join("");

  return `
  <div style="margin:0;padding:32px 16px;background-color:#f3f4f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
      <tr>
        <td style="padding:0 0 20px 0;text-align:center;">
          <span style="font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.3px;">📦 Order Management</span>
        </td>
      </tr>
      <tr>
        <td style="background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <div style="height:5px;background-color:${palette.accent};"></div>
          <div style="padding:28px 24px 8px 24px;">
            <span style="display:inline-block;background-color:${palette.bg};color:${palette.text};font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;padding:6px 12px;border-radius:999px;">
              ${icon} ${badgeText}
            </span>
            <h2 style="margin:16px 0 4px 0;font-size:19px;color:#111827;">${heading}</h2>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
            ${rowsHtml}
          </table>
          <div style="padding:18px 24px;background-color:#fafafa;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Automated notification from your Order Management system.</p>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 0 0 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#b0b3ba;">This is a POC alert email — do not reply.</p>
        </td>
      </tr>
    </table>
  </div>`;
}

/**
 * Core sender — calls Brevo's Transactional Email API (HTTPS).
 * Never throws — logs and swallows errors so it can't break the request flow.
 */
async function sendEmail({ subject, htmlContent, logPrefix = "mailer" }) {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    console.log(`📨 [${logPrefix}] BREVO_API_KEY set: ${!!apiKey}`);
    if (!apiKey) {
      console.warn(`⚠️ [${logPrefix}] BREVO_API_KEY not set. Skipping email.`);
      return false;
    }

    const to = process.env.TRANSACTION_ALERT_EMAIL;
    console.log(`📨 [${logPrefix}] TRANSACTION_ALERT_EMAIL set: ${!!to}${to ? ` (to=${to})` : ""}`);
    if (!to) {
      console.warn(`⚠️ [${logPrefix}] TRANSACTION_ALERT_EMAIL not set. Skipping email.`);
      return false;
    }

    const fromEmail = process.env.BREVO_SENDER_EMAIL;
    if (!fromEmail) {
      console.warn(`⚠️ [${logPrefix}] BREVO_SENDER_EMAIL not set. Skipping email.`);
      return false;
    }

    const toList = to.split(",").map((addr) => ({ email: addr.trim() }));

    console.log(`📨 [${logPrefix}] Calling Brevo API -> to=${to}, subject="${subject}"`);

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
      `📧 [${logPrefix}] Email sent via Brevo. status=${response.status}, messageId=${response.data?.messageId}`
    );
    return true;
  } catch (error) {
    console.error(`❌ [${logPrefix}] Failed to send email via Brevo.`);
    console.error(`❌ [${logPrefix}] message:`, error.message);
    if (error.response) {
      console.error(`❌ [${logPrefix}] status:`, error.response.status);
      console.error(`❌ [${logPrefix}] data:`, JSON.stringify(error.response.data));
    }
    return false;
  }
}

/**
 * Fire-and-forget email notification for a transaction (create/update/delete).
 */
async function sendTransactionEmail({ transaction, account, event = "created" }) {
  console.log(
    `📨 [mailer] sendTransactionEmail called. event=${event}, transactionId=${transaction?.id}, accountId=${transaction?.accountId}`
  );

  const subject = `[Order Mgmt] Transaction ${event}: ${transaction.type.toUpperCase()} ₹${transaction.amount}`;

  const htmlContent = buildEmailHtml({
    heading: `Transaction ${event}`,
    badgeText: `${transaction.type} · ${event}`,
    badgeKey: transaction.type === "credit" ? "credit" : "debit",
    rows: [
      { label: "Account", value: account?.name ?? transaction.accountId },
      { label: "Type", value: transaction.type.toUpperCase() },
      { label: "Amount", value: `<b>₹${transaction.amount}</b>` },
      { label: "Description", value: transaction.description },
      { label: "New Balance", value: `₹${account?.balance ?? "-"}` },
      { label: "Created By", value: transaction.createdBy },
      { label: "Time", value: new Date(transaction.createdAt || new Date(transaction.createdAt || Date.now()).toLocaleString("en-IN", {
  timeZone: "Asia/Kolkata",
  dateStyle: "medium",
  timeStyle: "medium",
}) },
    ],
  });

  

  await sendEmail({ subject, htmlContent, logPrefix: "mailer:transaction" });
}

/**
 * Fire-and-forget email notification for an account lifecycle event
 * (created / updated / deleted).
 */
async function sendAccountEmail({ account, event = "created" }) {
  console.log(
    `📨 [mailer] sendAccountEmail called. event=${event}, accountId=${account?.id}, name=${account?.name}`
  );

  const subject = `[Order Mgmt] Account ${event}: ${account.name}`;

  const htmlContent = buildEmailHtml({
    heading: `Account ${event}: ${account.name}`,
    badgeText: `Account ${event}`,
    badgeKey: event,
    rows: [
      { label: "ID", value: account.id },
      { label: "Name", value: `<b>${account.name}</b>` },
      { label: "Type", value: account.type },
      { label: "Contact Number", value: account.contactNumber },
      { label: "Balance", value: `₹${account.balance ?? 0}` },
      {
        label: event === "created" ? "Created By" : "Updated By",
        value: event === "created" ? account.createdBy : account.updatedBy,
      },
      { label: "Time", value: new Date(transaction.createdAt || Date.now()).toLocaleString("en-IN", {
  timeZone: "Asia/Kolkata",
  dateStyle: "medium",
  timeStyle: "medium",
}) },
    ],
  });

  await sendEmail({ subject, htmlContent, logPrefix: `mailer:account:${event}` });
}

/**
 * Fire-and-forget daily digest email listing every account and its balance.
 *//**
 * Fire-and-forget daily digest email listing every account and its balance.
 */
async function sendDailyAccountSummaryEmail({ accounts }) {
  console.log(`📨 [mailer] sendDailyAccountSummaryEmail called. accountCount=${accounts?.length}`);

  // Skip accounts with a zero balance — only show accounts that owe/are owed something
  const nonZeroAccounts = accounts.filter((a) => Number(a.balance || 0) !== 0);

  const total = nonZeroAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const rowsHtml = nonZeroAccounts
    .map((a, i) => {
      const balance = Number(a.balance || 0);
      const balanceColor = balance < 0 ? "#c62828" : "#2e7d32";
      return `
        <tr style="${i % 2 === 0 ? "background-color:#fafafa;" : ""}">
          <td style="padding:10px 16px;font-size:13px;color:#111827;border-bottom:1px solid #f0f0f0;">${a.name}</td>
          <td style="padding:10px 16px;font-size:12px;color:#6b7280;border-bottom:1px solid #f0f0f0;">${a.type || "-"}</td>
          <td style="padding:10px 16px;font-size:13px;font-weight:700;color:${balanceColor};text-align:right;border-bottom:1px solid #f0f0f0;">₹${balance.toFixed(2)}</td>
        </tr>`;
    })
    .join("");

  const totalColor = total < 0 ? "#c62828" : "#2e7d32";

  const htmlContent = `
  <div style="margin:0;padding:32px 16px;background-color:#f3f4f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr>
        <td style="padding:0 0 20px 0;text-align:center;">
          <span style="font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.3px;">📦 Order Management</span>
        </td>
      </tr>
      <tr>
        <td style="background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <div style="height:5px;background-color:#3b82f6;"></div>
          <div style="padding:28px 24px 12px 24px;">
            <span style="display:inline-block;background-color:#e0edff;color:#1d4ed8;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;padding:6px 12px;border-radius:999px;">
              📊 Daily Summary
            </span>
            <h2 style="margin:16px 0 4px 0;font-size:19px;color:#111827;">All Account Balances</h2>
            <p style="margin:0;font-size:13px;color:#6b7280;">${new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · ${nonZeroAccounts.length} account${nonZeroAccounts.length === 1 ? "" : "s"} with a balance${accounts.length !== nonZeroAccounts.length ? ` (${accounts.length - nonZeroAccounts.length} zero-balance hidden)` : ""}</p>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
            <tr>
              <td style="padding:8px 16px;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Account</td>
              <td style="padding:8px 16px;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Type</td>
              <td style="padding:8px 16px;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;text-align:right;">Balance</td>
            </tr>
            ${
              nonZeroAccounts.length > 0
                ? rowsHtml
                : `<tr><td colspan="3" style="padding:24px 16px;text-align:center;font-size:13px;color:#9ca3af;">All accounts are at zero balance 🎉</td></tr>`
            }
            <tr>
              <td style="padding:14px 16px;font-size:13px;font-weight:700;color:#111827;border-top:2px solid #e5e7eb;" colspan="2">Total</td>
              <td style="padding:14px 16px;font-size:15px;font-weight:800;color:${totalColor};text-align:right;border-top:2px solid #e5e7eb;">₹${total.toFixed(2)}</td>
            </tr>
          </table>
          <div style="padding:18px 24px;background-color:#fafafa;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Automated daily digest from your Order Management system.</p>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 0 0 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#b0b3ba;">This is a POC alert email — do not reply.</p>
        </td>
      </tr>
    </table>
  </div>`;

  const subject = `[Order Mgmt] Daily Account Summary — ${nonZeroAccounts.length} accounts, total ₹${total.toFixed(2)}`;

  await sendEmail({ subject, htmlContent, logPrefix: "mailer:daily-summary" });
}

module.exports = { sendTransactionEmail, sendAccountEmail, sendDailyAccountSummaryEmail };