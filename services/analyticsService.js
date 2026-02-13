const { db, FieldValue } = require("../config/firebase");

/**
 * Create email analytics record (when email sent)
 */
async function createEmailAnalytics(id, subject = "", receiverEmail = "") {
    if (!id) throw new Error("ID required");

    await db.collection("analytics").doc(id).set({
        sentTime: FieldValue.serverTimestamp(),
        receiverEmail,
        mailSent: true,
        isOpened: false,
        firstOpen: null,
        subject,
        totalViews: 0,
        proxyViews: 0,
        realViews: 0
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
    const viewsRef = docRef.collection("views");

    const now = new Date();
    const isProxy = !!meta.isProxy;

    await db.runTransaction(async (transaction) => {

        const doc = await transaction.get(docRef);

        if (!doc.exists) {
            console.log("Analytics record not found:", id);
            return;
        }

        const data = doc.data();

        // 1️ Add view event (subcollection)
        const newViewRef = viewsRef.doc();

        transaction.set(newViewRef, {
            timestamp: now,
            ...meta
        });

        // 2️ Update counters
        const updateData = {
            totalViews: FieldValue.increment(1),
            proxyViews: isProxy ? FieldValue.increment(1) : FieldValue.increment(0),
            realViews: !isProxy ? FieldValue.increment(1) : FieldValue.increment(0)
        };

        // FIRST REAL OPEN
        if (!data.isOpened) {
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

    if (!doc.exists) return null;

    const data = doc.data();

    return {
        id,
        sentTime: data.sentTime || null,
        isOpened: data.isOpened || false,
        firstOpen: data.firstOpen || null,
        subject: data.subject || "",
        totalViews: data.totalViews || 0,
        proxyViews: data.proxyViews || 0,
        realViews: data.realViews || 0
    };
}



module.exports = {
    createEmailAnalytics,
    updateEmailOpen,
    getEmailAnalyticsMeta
};
