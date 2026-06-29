import { state } from '../state.js';

export const event = 'STA';

export function handler(data) {
    state.onlineCharacters.set(data.character, {
        status:    data.status,
        statusMsg: data.statusmsg ?? ''
    });
}