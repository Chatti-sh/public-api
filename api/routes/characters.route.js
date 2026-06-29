import express from 'express';
const router = express.Router();
import controller from '../controllers/characters.controller.js';

router.get('/:name', controller.getCharacterByName);

export default router;