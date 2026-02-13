const { db, FieldValue } = require("../config/firebase");

/**
 * Create email analytics record (when email sent)
 */
async function createEmailAnalytics(id, subject = "", receiverEmail) {
    if (!id) throw new Error("ID required");

    await db.collection("analytics").doc(id).set({
        sentTime: FieldValue.serverTimestamp(),
        receiverEmail,
        mailSent: false,
        isOpened: false,
        firstOpen: null,
        subject,
        viewsCount: 0 // replaces array
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

    await db.runTransaction(async (transaction) => {

        const doc = await transaction.get(docRef);

        if (!doc.exists) {
            console.log("Analytics record not found:", id);
            return;
        }

        const data = doc.data();
        const now = new Date();

        const existingViews = data.viewsCount || 0;

        const newViewRef = viewsRef.doc();

        // Add view event (same as old array push)
        transaction.set(newViewRef, {
            timestamp: now,
            ...meta
        });

        const updateData = {
            viewsCount: FieldValue.increment(1)
        };

        // FIRST HIT (same logic)
        if (existingViews === 0) {
            updateData.mailSent = true;
        }

        // SECOND HIT (same logic)
        if (existingViews === 1 && !data.isOpened) {
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

/**
 * Fetch metadata of all emails
 * - ordered by latest sentTime first
 * - lightweight (no views subcollection read)
 */
async function getAllEmailAnalyticsMeta() {

    const snapshot = await db
        .collection("analytics")
        .orderBy("sentTime", "desc")
        .get();

    if (snapshot.empty) return [];

    const result = [];

    snapshot.forEach(doc => {
        const data = doc.data();

        result.push({
            id: doc.id,
            subject: data.subject || "",
            receiverEmail: data.receiverEmail || "",
            sentTime: data.sentTime || null,
            viewsCount: data.viewsCount || 0,
            isOpened: data.isOpened || false,
            firstOpen: data.firstOpen || null
        });
    });

    return result;
}

/**
 * Get complete analytics of a single email
 * - returns full meta data
 * - returns views with only timestamp
 */
async function getFullEmailAnalytics(id) {
    if (!id) throw new Error("ID required");

    const docRef = db.collection("analytics").doc(id);
    const viewsRef = docRef.collection("views");

    // Fetch meta document
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const data = doc.data();

    // Fetch views (ordered oldest → latest)
    const viewsSnapshot = await viewsRef
        .orderBy("timestamp", "asc")
        .get();

    const views = [];

    viewsSnapshot.forEach(v => {
        const viewData = v.data();

        views.push({
            time: viewData.timestamp || null
        });
    });

    return {
        id,
        subject: data.subject || "",
        receiverEmail: data.receiverEmail || "",
        sentTime: data.sentTime || null,
        mailSent: data.mailSent || false,
        isOpened: data.isOpened || false,
        firstOpen: data.firstOpen || null,
        viewsCount: data.viewsCount || 0,
        views
    };
}





module.exports = {
    createEmailAnalytics,
    updateEmailOpen,
    getEmailAnalyticsMeta,
    getAllEmailAnalyticsMeta,
    getFullEmailAnalytics
};

