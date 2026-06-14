const admin = require("firebase-admin");
// const serviceAccount = require("../../plangoFirebase.json");
const { config } = require("../config");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: config.firebase.projectId,
    clientEmail: config.firebase.clientEmail,
    privateKey: config.firebase.privateKey,
  }),
});

module.exports = admin;
