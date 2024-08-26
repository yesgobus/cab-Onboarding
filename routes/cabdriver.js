const express = require("express");
const router = express.Router();

const cabdriverController = require("../controller/cabdriver");
const middleware = require("../middleware/authenticateUser")

router.post("/signup", cabdriverController.user_signup);
router.post("/verify_otp",cabdriverController.verify_otp);
router.post("/resend_otp",cabdriverController.resend_otp)
router.post("/login",cabdriverController.user_login)
router.post("/send_otp_aadhaar",middleware.authenticateToken, cabdriverController.send_otp_to_aadhaar);
router.post("/verify_aadhaar_otp",middleware.authenticateToken, cabdriverController.verify_aadhaar)
router.post("/validate_pan",middleware.authenticateToken,cabdriverController.validate_pan);
router.post("/validate_driving_license",middleware.authenticateToken, cabdriverController.validate_driving_license);
router.post("/validate_rc",middleware.authenticateToken, cabdriverController.validate_rc)
router.post("/add_bank_detail", middleware.authenticateToken, cabdriverController.add_bank_detail);
router.post("/update_user_detail",middleware.authenticateToken, cabdriverController.update_user_detail)

module.exports = router;