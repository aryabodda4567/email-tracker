/* ─────────────────────────────────────────────────────────
   analytics.js  —  Full analytics view for a single email
   ───────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const subtitle = document.getElementById("subtitle");
    const metaSection = document.getElementById("meta-section");
    const viewsHeading = document.getElementById("views-heading");
    const viewsSection = document.getElementById("views-section");

    if (!id) {
        subtitle.textContent = "";
        showError(metaSection, "No email ID provided. Go back to the dashboard.");
        return;
    }

    loadAnalytics(id, subtitle, metaSection, viewsHeading, viewsSection);
});

/**
 * Fetch full analytics from GET /analytics/email/:id/full
 * and render the meta card + views table.
 */
async function loadAnalytics(id, subtitle, metaSection, viewsHeading, viewsSection) {
    showLoading(metaSection);
    subtitle.textContent = "Loading…";

    try {
        const data = await fetchJSON(`/analytics/email/${id}/full`);

        subtitle.textContent = data.subject || "No subject";

        // ── Meta details card ──────────────────────────
        metaSection.innerHTML = buildMetaCard(data);

        // ── Views table ────────────────────────────────
        if (data.views && data.views.length > 0) {
            viewsHeading.style.display = "block";
            viewsSection.innerHTML = buildViewsTable(data.views);
        } else {
            viewsHeading.style.display = "block";
            viewsSection.innerHTML =
                '<div class="card text-muted" style="text-align:center;padding:24px;">No view events recorded yet.</div>';
        }
    } catch (err) {
        subtitle.textContent = "";
        showError(metaSection, "Failed to load analytics: " + err.message);
    }
}

/**
 * Build a detail-grid card showing the email metadata.
 *
 * @param  {Object} data  Full analytics object
 * @return {string}       HTML string
 */
function buildMetaCard(data) {
    const statusBadge = data.isOpened
        ? '<span class="badge badge-opened">Opened</span>'
        : data.mailSent
            ? '<span class="badge badge-sent">Delivered</span>'
            : '<span class="badge badge-pending">Pending</span>';

    return `
        <div class="card">
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Recipient</div>
                    <div class="detail-value">${data.receiverEmail || "—"}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">${statusBadge}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Sent At</div>
                    <div class="detail-value">${formatTimestamp(data.sentTime)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">First Opened</div>
                    <div class="detail-value">${formatTimestamp(data.firstOpen)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Total Views</div>
                    <div class="detail-value">${data.viewsCount || 0}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Tracking ID</div>
                    <div class="detail-value text-small">${data.id}</div>
                </div>
            </div>
        </div>`;
}

/**
 * Build a table of individual view events.
 *
 * @param  {Array}  views  Array of { time } objects
 * @return {string}        HTML string
 */
function buildViewsTable(views) {
    let rows = "";

    views.forEach((view, index) => {
        const serverTag = index === 0
            ? ' <span class="text-muted text-small">(mail server fetched)</span>'
            : '';

        rows += `
            <tr>
                <td>${index + 1}</td>
                <td>${formatTimestamp(view.time)}${serverTag}</td>
            </tr>`;
    });

    return `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Viewed At</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>`;
}
