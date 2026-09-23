const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const email = "thomas.e.abraham@gmail.com"; // 👈 your admin email

const oldUid = "cvBVSfct5rQaD0gz70OZsy34oAB2"; // former admin (tabraham@thsrocks.us)

admin.auth().getUserByEmail(email)
  .then(user => admin.auth().setCustomUserClaims(user.uid, { admin: true }))
  .then(() => admin.auth().setCustomUserClaims(oldUid, null))
  .then(() => admin.auth().revokeRefreshTokens(oldUid))
  .then(() => {
    console.log(`✅ Admin claim added to ${email}; removed from ${oldUid}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error setting admin claim:", error);
    process.exit(1);
  });
