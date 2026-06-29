/*
F-CHAT SESSION

Keeps an alive connection to F-Chat using an username, password and character name
from the .env file. Used for scanning status and online state in the metadata endpoint,
and to scan for ads in channels on the ads endpoint. Code adapted from Chattish Bouncer.
*/

import FchatBasic from 'lib-fchat/lib/Fchat.js';
import { OUTGOING_COMMANDS } from '../../data/commands.js';
import fchatConfig from '../../data/config.json' with { type: 'json' };
import { handlers } from './handlers/index.js';
import { state } from './state.js';
import { db } from '../db/db.js';

class FchatSession {
    constructor() {
        this.fchat = null;
    }

    async connect(ticket) {
        state.character = process.env.FLIST_CHARACTER;
        const username  = process.env.FLIST_USERNAME;
        const password  = process.env.FLIST_PASSWORD;

        console.log(`Loading the F-Chat API as ${state.character}...`.gray);

        if (!username || !password || !state.character) {
            throw new Error('Please provide an username, password and character on the .env. Read the .env.example for reference.');
        }
        
        // NOTE: Assumes no other characters are online on this account.
        // Does not defensively prevent >3 connections.

        this.fchat = new FchatBasic(fchatConfig);

        this.fchat.onOpen(ticket => {
            state.connected = true;
            console.log(`Connected`.white.bold + ` to F-Chat (${ticket.slice(0, 8)}...)`.gray);
        });

        this.fchat.on('close', () => {
            state.connected = false;
            console.log(`Disconnected`.white.bold + ` from F-Chat`.gray);
            this.disconnect();
        });

        // Register all handlers
        for (const { event, handler } of handlers) {
            this.fchat.on(event, (data) => {
                try { handler(data); }
                catch (err) { console.error(`[${event}] Handler error:`, err); }
            });
        }

        this.fchat.connect(username, password, state.character, ticket);
        return this;
    }

    flush_online_characters() {
        console.log(`Flushing online characters, please wait...`.gray);
        if (state.onlineCharacters.size === 0) return;

        const now = Math.floor(Date.now() / 1000);
        const update = db.prepare(`
            UPDATE profile SET last_online = ? WHERE character_name = ?
        `);

        db.transaction(() => {
            for (const [name, entry] of state.onlineCharacters) {
                update.run(now, entry.name ?? name);
            }
        })();

        console.log(`Flushed last_online for ${state.onlineCharacters.size} online characters`.gray);
        state.onlineCharacters.clear();
    }
    
    async send_command(command, data = {}) {
        if (this.fchat?.socket?.readyState !== 1) {
            throw new Error(`WebSocket not ready`);
        }
        this.fchat.socket.send(`${command} ${JSON.stringify(data)}`);
        return { success: true, command, data };
    }
}

export const fchat_session = new FchatSession();