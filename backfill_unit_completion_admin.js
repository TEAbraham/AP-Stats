// backfill_unit_completion_admin.js
const admin = require("firebase-admin");
const fs = require("fs");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
const db = admin.firestore();

async function backfillEmails() {
  const unitCompletionsRef = db.collection("unit_completion");
  const snapshot = await unitCompletionsRef.get();
  console.log(`🔍 Found ${snapshot.size} unit_completion docs`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const docId = docSnap.id;

    if (!data.email && data.userId) {
      try {
        const userRecord = await admin.auth().getUser(data.userId);
        const email = userRecord.email;

        if (email) {
          await docSnap.ref.update({ email });
          console.log(`✅ ${docId} → ${email}`);
          updated++;
        } else {
          console.warn(`⚠️ ${docId} → user found, but no email`);
          skipped++;
        }
      } catch (err) {
        console.warn(`❌ ${docId} → user not found (${data.userId})`);
        failed++;
      }
    } else {
      skipped++;
    }
  }

  console.log("\n🎯 Backfill complete");
  console.log(`✅ Updated: ${updated}`);
  console.log(`⚠️ Skipped: ${skipped}`);
  console.log(`❌ Failed:  ${failed}`);
}

backfillEmails();
