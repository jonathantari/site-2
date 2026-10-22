/**
 * Turnaround — region waitlist backend.
 *
 * Paste this into the Apps Script editor of the Google Sheet that should
 * hold the waitlist (Extensions > Apps Script), then deploy it as a web app.
 * Setup steps: see waitlist/README.md in the site repo.
 *
 * Each submission from the site becomes one row:
 * Received (server time) | Region | Email | IP | Detected region | Page | Submitted (browser time)
 */

var SHEET_NAME = "Waitlist";
var HEADERS = ["Received", "Region", "Email", "IP", "Detected region", "Page", "Submitted (browser)"];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var region = clip(data.region, 120);
    if (!region) return json({ ok: false, error: "region required" });

    sheet().appendRow([
      new Date(),
      region,
      clip(data.email, 160),
      clip(data.ip, 64),
      clip(data.detectedRegion, 120),
      clip(data.page, 300),
      clip(data.submittedAt, 40)
    ]);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Visiting the web app URL in a browser just confirms it is live.
function doGet() {
  return json({ ok: true, rows: Math.max(sheet().getLastRow() - 1, 0) });
}

function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sh;
}

function clip(value, max) {
  // Strip a leading = + - @ so a submission can't run as a spreadsheet formula.
  return String(value == null ? "" : value).trim().slice(0, max).replace(/^[=+\-@]+/, "");
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
