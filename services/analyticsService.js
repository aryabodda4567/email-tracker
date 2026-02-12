const { db, FieldValue } = require("../config/firebase");

/**
 * Create email analytics record (when email sent)
 */
async function createEmailAnalytics(id, subject = "") {
    if (!id) throw new Error("ID required");
    await db.collection("analytics").doc(id).set({
        sentTime: new Date(),
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
 * - sets firstOpen only once
 * - adds timestamp to views
 */
async function updateEmailOpen(id) {
    if (!id) throw new Error("ID required");

    const docRef = db.collection("analytics").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new Error("Analytics record not found");
    }

    const data = doc.data();
    const now = new Date();

    const updateData = {
        isOpened: true,
        views: FieldValue.arrayUnion(now)
    };

    // set firstOpen only first time
    if (!data.firstOpen) {
        updateData.firstOpen = now;
    }

    await docRef.update(updateData);

    return { success: true, id };
}

module.exports = {
    createEmailAnalytics,
    updateEmailOpen
};
