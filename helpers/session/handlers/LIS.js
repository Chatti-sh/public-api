import { state } from '../state.js';

export const event = 'LIS';

export function handler(data) {
    for (let character of data.characters) {
        state.onlineCharacters.set(character[0], {
            status:    character[2],
            statusMsg: character[3] ?? ''
        });
    }
}