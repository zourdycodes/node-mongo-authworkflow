import express from 'express';
import { userControl } from '../controllers/UserControllers';

const router = express.Router();

router.post('/register', userControl.register);

export default router;
