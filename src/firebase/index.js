const admin = require("firebase-admin");
const serviceAccount = require("../../plangoFirebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;