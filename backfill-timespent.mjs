import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function backfillTimeSpent(defaultValue = 0) {
  const answersRef = db.collection("student_answers");
  const snapshot = await answersRef.get();

  let updated = 0;
  console.log(`🔍 Found ${snapshot.size} student answer(s)`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!("timeSpent" in data)) {
      await doc.ref.update({ timeSpent: defaultValue });
      console.log(`✅ Updated ${doc.id} with timeSpent: ${defaultValue}`);
      updated++;
    }
  }

  console.log(`🎉 Backfill complete: ${updated} document(s) updated`);
}

backfillTimeSpent().catch(err => {
  console.error("❌ Error during backfill:", err);
});
