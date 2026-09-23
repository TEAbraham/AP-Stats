import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

const rewardPoints = { easy: 1, medium: 2, hard: 3 };
// const penaltyPoints = { easy: -3, medium: -2, hard: -1 };

async function backfillSummaryWithEmails() {
  const snapshot = await db.collection("student_answers").get();
  const userData = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    const uid = data.userId;
    const questionId = data.questionId;
    const qid = typeof questionId === "string" ? questionId.split("_") : [];
    const unit = (qid[0] || "unknown").toString(); // expects unit 1–9
    const difficulty = (data.difficulty || "medium").toLowerCase();
    const reward = rewardPoints[difficulty] ?? 2;
    // const penalty = penaltyPoints[difficulty] ?? -1;

    if (!uid) return;

    if (!userData[uid]) {
      userData[uid] = {
        userId: uid,
        totalCorrect: 0,
        totalAttempted: 0,
        totalPointsEarned: 0,
        totalPointsPossible: 0,
        units: {},           // nested unit info
        completedUnits: {}   // for tracking > 25 completion
      };
    }

    const user = userData[uid];

    if (!user.units[unit]) {
      user.units[unit] = { points: 0, correct: 0, incorrect: 0, everAbove25: false };
    }

    const earned = data.correct ? reward : 0;
    // const earned = data.correct ? reward : penalty;
    user.totalAttempted++;
    user.totalPointsEarned += earned;
    user.totalPointsPossible += reward;

    user.units[unit].points += earned;

    if (data.correct) {
      user.totalCorrect++;
      user.units[unit].correct++;
    } else {
      user.units[unit].incorrect++;
    }

    // Track top-level unit fields
    if (/^[1-9]$/.test(unit)) {
      const unitKey = `unit${unit}`;
      user[unitKey] += earned;
    }

    if (user.units[unit].points > 25) {
      user.units[unit].everAbove25 = true;
      user.completedUnits[unit] = true;
    }
  });

  // Commit summaries + completions
  for (const uid of Object.keys(userData)) {
    try {
      const user = await admin.auth().getUser(uid);
      const record = userData[uid];
      record.email = user.email;
      record.lastUpdated = new Date();

      await db.collection("student_summary").doc(uid).set(record);
      console.log(`✅ Wrote summary for ${uid}`);

      // Write unit_completion records for units > 25
      for (const unit of Object.keys(record.completedUnits)) {
        const unitDoc = {
          userId: uid,
          email: record.email,
          unit,
          score: record.units[unit]?.points || 0,
          totalAnswers: (record.units[unit]?.correct || 0) + (record.units[unit]?.incorrect || 0),
          completedAt: new Date()
        };
        await db.collection("unit_completion").add(unitDoc);
        console.log(`🟩 Marked completion: ${record.email} unit ${unit}`);
      }

    } catch (err) {
      console.error(`❌ Skipped ${uid}: ${err.message}`);
    }
  }

  console.log("🎉 Backfill with completions + summary values complete.");
}


backfillSummaryWithEmails();