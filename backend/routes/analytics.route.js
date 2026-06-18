import express from 'express';
import { protectRoute, adminRoute } from '../middleware/auth.middleware.js';
import { salesAnalytics } from '../controllers/analytics.controller.js';

const router = express.Router();

router.get('/sales', protectRoute, adminRoute, salesAnalytics);

export default router;