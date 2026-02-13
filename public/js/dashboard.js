/* ─────────────────────────────────────────────────────────
   dashboard.js  —  Fetch all emails and render in a table
   ───────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
    const content = document.getElementById("content");
    loadEmails(content);
});

/**
 * Fetch all email metadata from GET /analytics/emails
 * and render a clickable table.  Each row navigates to
 * analytics.html?id=<emailId>.
 *
 * @param {HTMLElement} container  Element to render into
 */
async function loadEmails(container) {
    showLoading(container);

    try {
        const emails = await fetchJSON("/analytics/emails");

        if (!emails || emails.length === 0) {
            container.innerHTML =
                '<div class="error-msg">No tracked emails yet.</div>';
            return;
        }

        container.innerHTML = buildTable(emails);
    } catch (err) {
        showError(container, "Failed to load emails: " + err.message);
    }
}

/**
 * Build an HTML table string from the email metadata array.
 *
 * Columns: #, Subject, Sent Time, Views, Status
 *
 * @param  {Array}  emails  Array of email meta objects
 * @return {string}         HTML string
 */
function buildTable(emails) {
    let rows = "";

    emails.forEach((email, index) => {
        const statusBadge = email.isOpened
            ? '<span class="badge badge-opened">Opened</span>'
            : email.viewsCount > 0
                ? '<span class="badge badge-sent">Delivered</span>'
                : '<span class="badge badge-pending">Pending</span>';

        rows += `
            <tr class="clickable" onclick="window.location='analytics.html?id=${email.id}'">
                <td>${index + 1}</td>
                <td>${email.subject || '<span class="text-muted">No subject</span>'}</td>
                <td>${email.receiverEmail || '<span class="text-muted">—</span>'}</td>
                <td>${formatTimestamp(email.sentTime)}</td>
                <td>${email.viewsCount || 0}</td>
                <td>${statusBadge}</td>
            </tr>`;
    });

    return `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Subject</th>
                        <th>Receiver</th>
                        <th>Sent</th>
                        <th>Views</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>`;
}
