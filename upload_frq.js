const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

// Root folder where your frq/unit folders live
const FRQ_ROOT = path.join(__dirname, "./frq");

async function uploadQuestions() {
    const files = fs.readdirSync(FRQ_ROOT);

    for (const file of files) {
      if (file.endsWith(".json")) {
        const fullPath = path.join(FRQ_ROOT, file);
        const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));

        const docId = `${data.question_id || file.replace(".json", "")}`;
        const docRef = db.collection("frq_questions").doc(docId);
        
        await docRef.set({
          ...data,
          unitLabel: data.unit,
          filename: file,
          uploadedAt: new Date(),
        });
        

        console.log(`✅ Uploaded ${docId}`);
      }
    }

  console.log("🎉 All questions uploaded.");
}

uploadQuestions().catch(console.error);
