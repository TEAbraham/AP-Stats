const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

// Root folder where your mcq/unit folders live
const MCQ_ROOT = path.join(__dirname, "./mcq");

async function uploadQuestions() {
  for (let unit = 1; unit <= 9; unit++) {
    const unitFolder = path.join(MCQ_ROOT, `unit${unit}`);
    const files = fs.readdirSync(unitFolder);

    for (const file of files) {
      if (file.endsWith(".json")) {
        const fullPath = path.join(unitFolder, file);
        const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));

        const docId = `unit${unit}_${data.question_id || file.replace(".json", "")}`;
        const docRef = db.collection("mcq_questions").doc(docId);
        
        await docRef.set({
          ...data,
          unit: `unit${unit}`,
          unitLabel: data.unit || `Unit ${unit}`,
          filename: file,
          uploadedAt: new Date(),
        });
        

        console.log(`✅ Uploaded ${docId}`);
      }
    }
  }

  console.log("🎉 All questions uploaded.");
}

uploadQuestions().catch(console.error);
