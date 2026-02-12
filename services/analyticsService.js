const { db, FieldValue } = require("../config/firebase");

/**
 * Create email analytics record (when email sent)
 */
async function createEmailAnalytics(id, subject = "") {
    if (!id) throw new Error("ID required");

    await db.collection("analytics").doc(id).set({
        sentTime: FieldValue.serverTimestamp(),
        isOpened: false,
        firstOpen: null,
        subject,
        views: []
    });

    return { success: true, id };
}

/**
 * Update analytics when email is opened
 * - sets isOpened true
 * - sets firstOpen only once (atomic)
 * - adds timestamp to views
 * - safe if doc does not exist
 */
async function updateEmailOpen(id, meta = {}) {
    if (!id) return;

    const docRef = db.collection("analytics").doc(id);

    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);

        if (!doc.exists) {
            console.log("Analytics record not found:", id);
            return; // don't throw (pixel must not fail)
        }

        const data = doc.data();
        const now = new Date();

        const updateData = {
            isOpened: true,
            views: FieldValue.arrayUnion({
                timestamp: now,
                ...meta
            })
        };

        // Set firstOpen only once (atomic inside transaction)
        if (!data.firstOpen) {
            updateData.firstOpen = now;
        }

        transaction.update(docRef, updateData);
    });

    return { success: true, id };
}

module.exports = {
    createEmailAnalytics,
    updateEmailOpen
};
