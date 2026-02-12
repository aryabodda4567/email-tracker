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
            return;
        }

        const data = doc.data();
        const now = new Date();

        const existingViews = Array.isArray(data.views) ? data.views : [];

        const newView = {
            timestamp: now,
            ...meta
        };

        const updateData = {
            views: FieldValue.arrayUnion(newView)
        };



        if (existingViews.length === 1 && !data.isOpened) {
            updateData.isOpened = true;
            updateData.firstOpen = now;
        }

        transaction.update(docRef, updateData);
    });

    return { success: true };
}



/**
 * Get email analytics metadata (excluding full views array)
 * Includes viewsCount
 */
async function getEmailAnalyticsMeta(id) {
    if (!id) throw new Error("ID required");

    const doc = await db.collection("analytics").doc(id).get();

    if (!doc.exists) {
        return null;
    }

    const data = doc.data();

    const viewsCount = Array.isArray(data.views) ? data.views.length : 0;

    return {
        id,
        sentTime: data.sentTime || null,
        isOpened: data.isOpened || false,
        firstOpen: data.firstOpen || null,
        subject: data.subject || "",
        viewsCount
    };
}


module.exports = {
    createEmailAnalytics,
    updateEmailOpen,
    getEmailAnalyticsMeta
};
