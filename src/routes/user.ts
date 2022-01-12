import express from 'express';
import { userControl } from '../controllers/UserControllers';

const router = express.Router();

router.post('/register', userControl.register);

router.post('/activation', userControl.activateAccount);

export default router;
