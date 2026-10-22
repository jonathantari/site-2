# Region waitlist

The "Add your region to the waitlist" button on the landing page opens a modal.
It guesses the visitor's region from their IP address (via ipapi.co, falling
back to ipwho.is) and sends each entry to a Google Sheet.

Each row in the sheet holds: time received, region, email (optional), IP
address, the region detected from the IP, the page, and the browser's time.

## Set up the sheet (about 5 minutes, once)

1. Create a new Google Sheet, for example "Turnaround waitlist".
2. In the sheet, open **Extensions > Apps Script**.
3. Delete the starter code, paste in everything from `apps-script.gs`, and save.
4. Click **Deploy > New deployment**, choose the type **Web app**, and set:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**, approve the permissions, and copy the **Web app URL**.
   The consent screen should say the script can access only this
   spreadsheet. If it says "all your Google Sheets spreadsheets", the first
   line of the script (`/** @OnlyCurrentDoc */`) is missing: add it, save,
   and deploy again. Also rename the project from "Untitled project" to
   "Turnaround waitlist" so you can recognise it in your Google account.
6. Paste that URL into `WAITLIST_ENDPOINT` at the top of `waitlist.js`, then commit.

To check it's live, open the web app URL in a browser. It should show
`{"ok":true,"rows":0}`. Then submit the form once on the site and a row
should appear in the "Waitlist" tab.

If you change `apps-script.gs` later, use **Deploy > Manage deployments >
Edit > New version** so the URL stays the same.

## Security notes

- The script only writes to the spreadsheet it is attached to, and
  `@OnlyCurrentDoc` keeps its permission to that one file. It does not
  touch Drive or any other sheet.
- Submissions are treated as plain text only: nothing is run, fields are
  trimmed and length-capped, and a leading `=`, `+`, `-` or `@` is removed
  so an entry can't become a spreadsheet formula.
- Access is "Anyone", so anyone who finds the URL can add junk rows. That is
  a nuisance, not a risk to your other files. To cut off a leaked URL,
  create a brand-new deployment (not a new version, which keeps the same
  URL), put the new URL in `waitlist.js`, and archive the old deployment.

## Privacy

IP addresses count as personal data under GDPR. The pop-up no longer
says what is stored, so add a privacy note somewhere on the site (the
footer works) before promoting the page widely, or stop sending the IP
by removing `ip: geo.ip` from `waitlist.js`.
