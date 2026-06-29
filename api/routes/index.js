import express from 'express';
const router = express.Router();
import charactersRoute from './characters.route.js';

router.use('/characters', charactersRoute);

export default router;