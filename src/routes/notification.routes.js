const router = require("express").Router();

const notificationController = require("../controllers/notification.controller");

const { protect, validate } = require('../middlewares');


const {
  getMyNotificationsValidation,
  markNotificationAsReadValidation,
  SaveFcmTokenValidation,
} = require("../validators/notification.validator");

router.use(protect);

router.get(
  "/",
  getMyNotificationsValidation,
  validate,
  notificationController.getMyNotifications
);

router.patch(
  "/read-all",
  notificationController.markAllNotificationsAsRead
);

router.patch(
  "/:id/read",
  markNotificationAsReadValidation,
  validate,
  notificationController.markNotificationAsRead
);
router.post(
  "/fcm-token",
  SaveFcmTokenValidation,
  validate,
  notificationController.saveFcmToken
);

router.post(
  "/fcm-token",
  SaveFcmTokenValidation,
  validate,
  notificationController.saveFcmToken
);

router.get("/test", notificationController.testNotification);


module.exports = router;