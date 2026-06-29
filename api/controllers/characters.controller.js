import { getCharacterDataService } from '../services/characters.service.js';

async function getCharacterByName(req, res) {
    const name = req.params.name
    const clientUpdatedAt = req.query.updated_at ? Number(req.query.updated_at) : null;

    const character_data = await getCharacterDataService(name, clientUpdatedAt);
    if (character_data) {
        res.json(character_data);
    } else {
        res.status(404).json({ error: 'Character not found' });
    }
}

export default {
    getCharacterByName
};