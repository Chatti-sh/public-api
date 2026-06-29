import { state } from '../state.js';
import { db } from '../../db/db.js';

export const event = 'FLN';

export function handler(data) {
    state.onlineCharacters.delete(data.character);

    // Persist last_online timestamp
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
        UPDATE profile SET last_online = ? WHERE character_name = ?
    `).run(now, data.character);
}