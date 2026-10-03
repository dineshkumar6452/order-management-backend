const { buildInvoicePdfBuffer } = require("../utils/invoicePdf");
const { sendInvoiceEmail } = require("../utils/mailer");

// Admin always gets a copy of every invoice - as BCC when a customer email
// is sent, or as the sole recipient when triggered from a print action
// (which has no customer email). Overridable via env var if ever needed.
const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || "dineshkumar6452@gmail.com";

const SOURCE_LABELS = {
  "print-110mm": "🖨️ Printed Invoice (110mm)",
  "print-80mm": "🖨️ Printed Invoice (80mm Thermal)",
  email: "📧 Emailed Invoice",
};

/**
 * POST /api/invoices/email
 *
 * Expected JSON body:
 * {
 *   "to": "customer@example.com",       // optional - omit for an admin-only
 *                                       // notification (e.g. after a print action)
 *   "invoiceName": "John Doe",          // optional
 *   "source": "print-110mm",            // optional - "print-110mm" | "print-80mm" | "email"
 *   "items": [                          // required, non-empty array
 *     { "name": "Product A", "price": 50.0, "quantity": 2, "unitTotal": 100.0 },
 *     ...
 *   ],
 *   "total": 130.0                      // required, numeric grand total
 * }
 *
 * Builds a PDF invoice from the JSON and emails it (via Brevo) with the
 * PDF attached.
 *   - If "to" is provided: emails the customer and BCCs the admin.
 *   - If "to" is omitted: emails the admin directly (used right after a
 *     print action, so the admin still gets a record of the bill).
 * Responds with { success, message } either way.
 */
exports.emailInvoice = async (req, res) => {
  try {
    const { to, invoiceName, items, total, source, billNo, userId, machineNo } = req.body || {};

    const customerEmailProvided = !!(to && typeof to === "string" && to.trim());

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "items must be a non-empty array.",
      });
    }

    const numericTotal = Number(total);
    if (total === undefined || total === null || isNaN(numericTotal)) {
      return res.status(400).json({
        success: false,
        message: "A numeric total is required.",
      });
    }

    // Separate DATE (DD/MM/YYYY) and TIME (24hr HH:mm) - matches the shop's
    // existing printed "CASH BILL" slip format exactly - always in IST
    // regardless of what timezone the server itself runs in.
    const now = new Date();
    const date = now.toLocaleDateString("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const time = now.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // BILL NO / USER ID / MACHINE NO aren't tracked by the app yet, so these
    // accept an optional override from the client and otherwise fall back
    // to sensible defaults (userId/machineNo match the shop's single POS
    // terminal; billNo falls back to a short time-based number).
    const pdfBuffer = await buildInvoicePdfBuffer({
      invoiceName: invoiceName || null,
      items,
      total: numericTotal,
      date,
      time,
      billNo: billNo ?? String(Date.now()).slice(-4),
      userId: userId ?? "1",
      machineNo: machineNo ?? "1",
    });

    const trimmedName = invoiceName ? String(invoiceName).trim() : "";
    const channelLabel =
      SOURCE_LABELS[source] || (customerEmailProvided ? SOURCE_LABELS.email : "🧾 Invoice");

    const primaryRecipient = customerEmailProvided ? to.trim() : ADMIN_EMAIL;
    const subject = `${channelLabel}${trimmedName ? " - " + trimmedName : ""} - Rs. ${numericTotal.toFixed(2)}`;

    const htmlContent = customerEmailProvided
      ? `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;">
          <p>Hello${trimmedName ? " " + trimmedName : ""},</p>
          <p>Please find your invoice attached. Grand Total: <b>Rs. ${numericTotal.toFixed(2)}</b>.</p>
          <p style="color:#9ca3af;font-size:12px;">Thank you for your business.</p>
        </div>
      `
      : `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;">
          <p>${channelLabel}${trimmedName ? " for " + trimmedName : ""}.</p>
          <p>Grand Total: <b>Rs. ${numericTotal.toFixed(2)}</b> (${items.length} item${items.length === 1 ? "" : "s"}).</p>
          <p style="color:#9ca3af;font-size:12px;">Automatic admin notification - a copy of the invoice PDF is attached.</p>
        </div>
      `;

    const fileName = `invoice_${Date.now()}.pdf`;

    const result = await sendInvoiceEmail({
      to: primaryRecipient,
      bcc: customerEmailProvided ? ADMIN_EMAIL : undefined,
      subject,
      htmlContent,
      pdfBuffer,
      pdfFileName: fileName,
    });

    if (!result.success) {
      return res.status(502).json({
        success: false,
        message: result.error || "Failed to send invoice email.",
      });
    }

    return res.status(200).json({
      success: true,
      message: customerEmailProvided
        ? "Invoice emailed successfully."
        : "Admin notified successfully.",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("❌ [invoiceController] emailInvoice failed:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while emailing the invoice.",
    });
  }
};
