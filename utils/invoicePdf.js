const PDFDocument = require("pdfkit");

// -------------------------------------------------------------------------
// "Cash Bill" / "Rough Estimate" receipt-style invoice PDF - built to match
// the shop's existing thermal-printer slip exactly (see reference image):
//
//   ROUGH ESTIMATE
//     CASH BILL
//   DATE: 27/07/2026   20:14   BILL NO: 41
//   USER ID : 1   MACHINE NO : 1
//   --------------------------------
//   NO ITEM            QTY  PRICE  TOTAL
//   --------------------------------
//   1  BUKRAM ROLL      54   65.00  3510.00
//   ...
//   --------------------------------
//   TITEMS :10        TQTY :384
//   --------------------------------
//   SUBTOTAL :                17279.00
//   --------------------------------
//   GRAND TOT: Rs.             17279.00
//   --------------------------------
//       NO EXCHANGE NO RETURNS
//
// Uses pdfkit's built-in "Courier" font - it's one of the 14 standard PDF
// fonts and is EXACTLY monospace at 0.6 * fontSize points per character,
// which lets every line below be built as a plain padded string (like a
// dot-matrix/thermal printer would) instead of doing per-column x/y text
// placement.
// -------------------------------------------------------------------------

const MM_TO_PT = 2.83465;
const PAGE_WIDTH_MM = 80; // real 80mm thermal paper width
const FONT_SIZE = 8;
const TITLE_SIZE = 11;
const CHAR_W = FONT_SIZE * 0.6; // exact for the Courier family
const MARGIN = 10;
const PAGE_WIDTH = PAGE_WIDTH_MM * MM_TO_PT; // 226.77pt
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_COLS = Math.floor(CONTENT_WIDTH / CHAR_W); // chars that fit 80mm at this font size
const PAGE_HEIGHT = 1600; // generous scroll of "paper"; paginates if ever exceeded
const LINE_HEIGHT = FONT_SIZE * 1.5;

// Column widths (characters), left -> right, summing to LINE_COLS:
const COL_NO = 3;
const COL_ITEM = 15;
const COL_QTY = 5;
const COL_PRICE = 8;
const COL_TOTAL = LINE_COLS - COL_NO - COL_ITEM - COL_QTY - COL_PRICE; // 11

function padRight(str, width) {
  str = String(str ?? "");
  return str.length >= width ? str.slice(0, width) : str + " ".repeat(width - str.length);
}
function padLeft(str, width) {
  str = String(str ?? "");
  return str.length >= width ? str.slice(0, width) : " ".repeat(width - str.length) + str;
}

// Word-wraps a product name into COL_ITEM-wide chunks (hard-breaks a
// single word that's still too long on its own).
function wrapItemName(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["(No name)"];

  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= COL_ITEM) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      if (word.length > COL_ITEM) {
        let remaining = word;
        while (remaining.length > COL_ITEM) {
          lines.push(remaining.slice(0, COL_ITEM));
          remaining = remaining.slice(COL_ITEM);
        }
        current = remaining;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function dashedLine() {
  return "-".repeat(LINE_COLS);
}

/**
 * Builds the "Cash Bill" receipt PDF as a Buffer, resolved via a Promise.
 *
 * @param {Object} opts
 * @param {string|null} opts.invoiceName - Optional customer name (shown only if given).
 * @param {Array<{name?:string, price?:number, quantity?:number, unitTotal?:number}>} opts.items
 * @param {number} opts.total - Grand total.
 * @param {string} opts.date - Pre-formatted date string, e.g. "27/07/2026".
 * @param {string} opts.time - Pre-formatted time string, e.g. "20:14".
 * @param {string|number} [opts.billNo] - Bill number.
 * @param {string|number} [opts.userId] - User ID (POS operator).
 * @param {string|number} [opts.machineNo] - Machine/terminal number.
 * @returns {Promise<Buffer>}
 */
function buildInvoicePdfBuffer({
  invoiceName,
  items,
  total,
  date,
  time,
  billNo,
  userId,
  machineNo,
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margin: MARGIN,
      });
      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      doc.font("Courier").fontSize(FONT_SIZE).fillColor("#000000");

      const writeLine = (text, { bold = false, center = false, size = FONT_SIZE } = {}) => {
        if (doc.y + LINE_HEIGHT > PAGE_HEIGHT - MARGIN) {
          doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: MARGIN });
          doc.font("Courier").fontSize(FONT_SIZE).fillColor("#000000");
        }
        doc.font(bold ? "Courier-Bold" : "Courier").fontSize(size);
        if (center) {
          // True centering via pdfkit's own align option (measures the
          // actual rendered width at this font/size) - the char-padding
          // trick in centerLine() is only accurate at FONT_SIZE, so it
          // mis-centers anything drawn at a different size (e.g. the title).
          doc.text(text, MARGIN, doc.y, { width: CONTENT_WIDTH, align: "center" });
        } else {
          doc.text(text, MARGIN, doc.y, { lineBreak: false });
        }
        doc.y += LINE_HEIGHT;
      };

      // ---------- Header ----------
      writeLine("ROUGH ESTIMATE", { bold: true, center: true, size: TITLE_SIZE });
      doc.y += 2;

      writeLine(`DATE: ${date}   ${time}   BILL NO: ${billNo ?? "-"}`);
      writeLine(`USER ID : ${userId ?? "1"}   MACHINE NO : ${machineNo ?? "1"}`);

      const trimmedName = invoiceName ? String(invoiceName).trim() : "";
      if (trimmedName) {
        writeLine(`NAME: ${trimmedName}`);
      }

      writeLine(dashedLine());

      // ---------- Table header ----------
      writeLine(
        padRight("NO", COL_NO) +
          padRight("ITEM", COL_ITEM) +
          padLeft("QTY", COL_QTY) +
          padLeft("PRICE", COL_PRICE) +
          padLeft("TOTAL", COL_TOTAL),
        { bold: true },
      );
      writeLine(dashedLine());

      // ---------- Rows ----------
      let totalQty = 0;
      items.forEach((rawItem, index) => {
        const name =
          rawItem && rawItem.name && String(rawItem.name).trim()
            ? String(rawItem.name).trim()
            : "(No name)";
        const qty = Number(rawItem?.quantity ?? 0);
        const rate = Number(rawItem?.price ?? 0);
        const lineTotal = Number(rawItem?.unitTotal ?? rate * (isNaN(qty) ? 0 : qty));
        totalQty += isNaN(qty) ? 0 : qty;

        const nameLines = wrapItemName(name);
        const qtyStr = isNaN(qty) ? "-" : `${qty}`;
        const rateStr = rate.toFixed(2);
        const totalStr = lineTotal.toFixed(2);

        nameLines.forEach((nameLine, lineIdx) => {
          const isLast = lineIdx === nameLines.length - 1;
          const noCell = lineIdx === 0 ? `${index + 1}` : "";
          const row = isLast
            ? padRight(noCell, COL_NO) +
              padRight(nameLine, COL_ITEM) +
              padLeft(qtyStr, COL_QTY) +
              padLeft(rateStr, COL_PRICE) +
              padLeft(totalStr, COL_TOTAL)
            : padRight(noCell, COL_NO) + padRight(nameLine, COL_ITEM);
          writeLine(row);
        });
      });

      writeLine(dashedLine());

      // ---------- Totals ----------
      const titemsLabel = `TITEMS :${items.length}`;
      const tqtyLabel = `TQTY :${totalQty}`;
      writeLine(padRight(titemsLabel, LINE_COLS - tqtyLabel.length) + tqtyLabel);
      writeLine(dashedLine());

      const subtotalStr = Number(total).toFixed(2);
      writeLine(padRight("SUBTOTAL :", LINE_COLS - subtotalStr.length) + subtotalStr);
      writeLine(dashedLine());

      // Bold only, same FONT_SIZE as everything else - the padding math
      // above is calibrated to FONT_SIZE's exact monospace char width, so a
      // bigger size here would silently overflow/clip the amount (Courier
      // and Courier-Bold share the same width, so bold alone is safe).
      const grandLabel = "GRAND TOT: Rs.";
      writeLine(padRight(grandLabel, LINE_COLS - subtotalStr.length) + subtotalStr, {
        bold: true,
      });
      writeLine(dashedLine());

      writeLine("NO EXCHANGE NO RETURNS", { center: true });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildInvoicePdfBuffer };
