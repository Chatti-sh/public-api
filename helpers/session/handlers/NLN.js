
import { state } from '../state.js';

export const event = 'NLN';

export function handler(data) {
    state.onlineCharacters.set(data.identity, {
        status:    data.status,
        statusMsg: ''
    });
}