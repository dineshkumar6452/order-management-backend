const { buildInvoicePdfBuffer } = require("../utils/invoicePdf");
const { sendInvoiceEmail } = require("../utils/mailer");

/**
 * POST /api/invoices/email
 *
 * Expected JSON body:
 * {
 *   "to": "customer@example.com",       // required, comma-separated ok
 *   "invoiceName": "John Doe",          // optional
 *   "items": [                          // required, non-empty array
 *     { "name": "Product A", "price": 50.0, "quantity": 2, "unitTotal": 100.0 },
 *     ...
 *   ],
 *   "total": 130.0                      // required, numeric grand total
 * }
 *
 * Builds a PDF invoice from the JSON and emails it (via Brevo) with the
 * PDF attached. Responds with { success, message } either way.
 */
exports.emailInvoice = async (req, res) => {
  try {
    const { to, invoiceName, items, total } = req.body || {};

    if (!to || typeof to !== "string" || !to.trim()) {
      return res.status(400).json({
        success: false,
        message: "Recipient email (to) is required.",
      });
    }

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

    const date = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const pdfBuffer = await buildInvoicePdfBuffer({
      invoiceName: invoiceName || null,
      items,
      total: numericTotal,
      date,
    });

    const trimmedName = invoiceName ? String(invoiceName).trim() : "";
    const subject = `Invoice${trimmedName ? " for " + trimmedName : ""} - Rs. ${numericTotal.toFixed(2)}`;

    const htmlContent = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;">
        <p>Hello${trimmedName ? " " + trimmedName : ""},</p>
        <p>Please find your invoice attached. Grand Total: <b>Rs. ${numericTotal.toFixed(2)}</b>.</p>
        <p style="color:#9ca3af;font-size:12px;">Thank you for your business.</p>
      </div>
    `;

    const fileName = `invoice_${Date.now()}.pdf`;

    const result = await sendInvoiceEmail({
      to,
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
      message: "Invoice emailed successfully.",
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
