import express from 'express';
import cabdriverController from '../controller/cabdriver.js';
import { authenticateToken } from '../middleware/authenticateUser.js';

const router = express.Router();

router.post('/signup', cabdriverController.user_signup);
router.post('/verify_otp', cabdriverController.verify_otp);
router.post('/resend_otp', cabdriverController.resend_otp);
router.post('/login', cabdriverController.user_login);
router.post('/send_otp_aadhaar', authenticateToken, cabdriverController.send_otp_to_aadhaar);
router.post('/verify_aadhaar_otp', authenticateToken, cabdriverController.verify_aadhaar);
router.post('/validate_pan', authenticateToken, cabdriverController.validate_pan);
router.post('/validate_driving_license', authenticateToken, cabdriverController.validate_driving_license);
router.post('/validate_rc', authenticateToken, cabdriverController.validate_rc);
router.post('/add_bank_detail', authenticateToken, cabdriverController.add_bank_detail);
router.post('/update_user_detail', authenticateToken, cabdriverController.update_user_detail);
router.post('/update-location', authenticateToken, cabdriverController.updateLocationController);
router.post('/duty', authenticateToken, cabdriverController.updateDutyController);
router.post('/ride/accept', authenticateToken, cabdriverController.reqAcceptController);
router.post('/ride/go_for_pickup', authenticateToken, cabdriverController.goForPickup);
router.post('/ride/start_ride', authenticateToken, cabdriverController.startRide);
export default router;
