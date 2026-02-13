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

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({ email, subject, htmlBody });

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };

    document.getElementById("response").textContent = "Sending…";

    fetch("/send-email", requestOptions)
        .then((response) => response.text())
        .then((result) => {
            document.getElementById("response").textContent = result;
        })
        .catch((error) => {
            document.getElementById("response").textContent = "Error: " + error;
        });
}
