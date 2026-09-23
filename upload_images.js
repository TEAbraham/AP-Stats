const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  storageBucket: "ap-statistics.firebasestorage.app", // 🔄 your real bucket name!
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Root images location
const MCQ_ROOT = path.join(__dirname, "./mcq");

async function uploadAllImages() {
  for (let unit = 1; unit <= 9; unit++) {
    const imagesDir = path.join(MCQ_ROOT, `unit${unit}/images`);
    if (!fs.existsSync(imagesDir)) continue;

    const imageFiles = fs.readdirSync(imagesDir).filter(f =>
      /\.(png|jpg|jpeg|gif)$/i.test(f)
    );

    for (const fileName of imageFiles) {
      const localPath = path.join(imagesDir, fileName);
      const storagePath = `unit${unit}/images/${fileName}`;

      try {
        // Upload image to Firebase Storage
        await bucket.upload(localPath, {
          destination: storagePath,
          metadata: {
            cacheControl: 'public,max-age=31536000',
          },
        });

        // Get public URL
        const file = bucket.file(storagePath);
        await file.makePublic(); // optionally use signed URLs instead
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        console.log(`✅ Uploaded: ${storagePath}`);

        // Rebuild expected question ID format: unit#_question-XXX
        const baseName = fileName.split("-")[0]; // question
        const questionId = fileName.split("-")[1].split(".")[0]; // e.g. 036
        const docId = `unit${unit}_${baseName}-${questionId}`;

        const docRef = db.collection("mcq_questions").doc(docId);

        try {
          const docSnap = await docRef.get();

          if (docSnap.exists) {
            const data = docSnap.data();
            const currentUrls = data.image_urls || [];

            if (!currentUrls.includes(publicUrl)) {
              await docRef.update({
                image_urls: [...currentUrls, publicUrl],
              });
              console.log(`📝 Updated Firestore for ${docId}`);
            }
          } else {
            console.warn(`⚠️ Document not found for ${docId}`);
          }
        } catch (e) {
          console.error(`❌ Failed to update ${docId}:`, e.message);
        }

      } catch (err) {
        console.error(`❌ Error uploading ${fileName}:`, err.message);
      }
    }
  }

  console.log("🎉 All images uploaded and Firestore updated.");
}

uploadAllImages();
