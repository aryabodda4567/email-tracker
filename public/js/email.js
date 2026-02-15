/* ─────────────────────────────────────────────────────────
   email.js  —  Logic for the Email Sender page
   ───────────────────────────────────────────────────────── */

/**
 * Collect form values, POST to /send-email, and display the
 * server response in the <pre id="response"> block.
 */
function sendEmail() {
    const email = document.getElementById("email").value;
    const subject = document.getElementById("subject").value;
    const htmlBody = document.getElementById("htmlBody").value;

    const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, htmlBody }),
    };

    document.getElementById("response").textContent = "Sending…";

    // Use authFetch for authenticated requests
    const fetchFn = window.authFetch || fetch;

    fetchFn("/send-email", requestOptions)
        .then((response) => response.text())
        .then((result) => {
            document.getElementById("response").textContent = result;
        })
        .catch((error) => {
            document.getElementById("response").textContent = "Error: " + error;
        });
}
