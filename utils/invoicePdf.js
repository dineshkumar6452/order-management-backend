const PDFDocument = require("pdfkit");

const PAGE_MARGIN = 50;
const PAGE_WIDTH_A4 = 595.28; // pdfkit default A4 width in points
const CONTENT_RIGHT = PAGE_WIDTH_A4 - PAGE_MARGIN;

// Column x-positions for the item table
const COLS = {
  no: PAGE_MARGIN,
  name: PAGE_MARGIN + 35,
  qty: PAGE_MARGIN + 300,
  rate: PAGE_MARGIN + 350,
  total: PAGE_MARGIN + 425,
};
const NAME_COL_WIDTH = COLS.qty - COLS.name - 10;

/**
 * Draws the table header row (No. / Item / Qty / Rate / Total) at the
 * current doc.y position and returns the y just below the header line.
 */
function drawTableHeader(doc) {
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
  doc.text("No.", COLS.no, y);
  doc.text("Item", COLS.name, y);
  doc.text("Qty", COLS.qty, y);
  doc.text("Rate", COLS.rate, y);
  doc.text("Total", COLS.total, y);

  const lineY = y + 16;
  doc
    .moveTo(PAGE_MARGIN, lineY)
    .lineTo(CONTENT_RIGHT, lineY)
    .strokeColor("#d1d5db")
    .lineWidth(1)
    .stroke();

  return lineY + 8;
}

/**
 * Builds an invoice PDF (A4) as a Buffer, resolved via a Promise.
 *
 * @param {Object} opts
 * @param {string|null} opts.invoiceName - Optional customer/invoice name.
 * @param {Array<{name?:string, price?:number, quantity?:number, unitTotal?:number}>} opts.items
 * @param {number} opts.total - Grand total.
 * @param {string} opts.date - Pre-formatted date/time string.
 * @returns {Promise<Buffer>}
 */
function buildInvoicePdfBuffer({ invoiceName, items, total, date }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN });
      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // ---------- Header ----------
      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor("#111827")
        .text("INVOICE", PAGE_MARGIN, PAGE_MARGIN);

      doc.moveDown(0.4);
      doc.font("Helvetica").fontSize(10).fillColor("#4b5563");
      doc.text(`Date: ${date}`);
      if (invoiceName && String(invoiceName).trim()) {
        doc.text(`Customer: ${String(invoiceName).trim()}`);
      }

      doc.moveDown(1.2);
      doc.fillColor("#111827");

      // ---------- Table header ----------
      let y = drawTableHeader(doc);

      // ---------- Rows ----------
      doc.font("Helvetica").fontSize(10).fillColor("#111827");

      items.forEach((rawItem, index) => {
        const name =
          rawItem && rawItem.name && String(rawItem.name).trim()
            ? String(rawItem.name).trim()
            : "(No name)";
        const qty = Number(rawItem?.quantity ?? 0);
        const rate = Number(rawItem?.price ?? 0);
        const lineTotal = Number(
          rawItem?.unitTotal ?? rate * (isNaN(qty) ? 0 : qty),
        );

        const nameHeight = doc.heightOfString(name, { width: NAME_COL_WIDTH });
        const rowHeight = Math.max(14, nameHeight);

        // Page-break check before drawing this row
        if (y + rowHeight + 10 > doc.page.height - PAGE_MARGIN) {
          doc.addPage();
          doc.y = PAGE_MARGIN;
          y = drawTableHeader(doc);
          doc.font("Helvetica").fontSize(10).fillColor("#111827");
        }

        doc.text(`${index + 1}`, COLS.no, y);
        doc.text(name, COLS.name, y, { width: NAME_COL_WIDTH });
        doc.text(isNaN(qty) ? "-" : `${qty}`, COLS.qty, y);
        doc.text(rate.toFixed(2), COLS.rate, y);
        doc.text(lineTotal.toFixed(2), COLS.total, y);

        y = y + rowHeight + 10;
        doc
          .moveTo(PAGE_MARGIN, y - 5)
          .lineTo(CONTENT_RIGHT, y - 5)
          .strokeColor("#f3f4f6")
          .lineWidth(1)
          .stroke();
      });

      // ---------- Grand total ----------
      if (y + 40 > doc.page.height - PAGE_MARGIN) {
        doc.addPage();
        y = PAGE_MARGIN;
      }

      doc.moveDown(0.5);
      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor("#111827")
        .text(`Grand Total: Rs. ${Number(total).toFixed(2)}`, PAGE_MARGIN, y + 10, {
          width: CONTENT_RIGHT - PAGE_MARGIN,
          align: "right",
        });

      doc.moveDown(2);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#9ca3af")
        .text("Thank you for your business.", { align: "left" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildInvoicePdfBuffer };
