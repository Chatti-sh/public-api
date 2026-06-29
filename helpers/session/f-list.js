/*
F-LIST SESSION

Keeps an alive API session to the F-List API
with a given username and password stored in the .env file. */

import Flist from 'flist-api';

let active_session

// Contains a reference to the current active F-List API session.
export async function flist_session() {
    if (!active_session) {
        active_session = await flist_api_connection()
    }
    return active_session
}

// Create a request to the F-List API.
export async function flist_request(endpoint, options) {
    const session = await flist_session();
    try {
        return await session.request(endpoint, options);
    } catch (e) {
        if (e.message?.includes('ticket')) {
            console.log(`F-List ticket expired, re-authenticating...`.gray);
            await session.authenticate();
            session.validUntil = Date.now() + 29 * 60 * 1000;
            return await session.request(endpoint, options); // retry once
        }
        throw e;
    }
}

// Creates a connection to the F-List API.
async function flist_api_connection() {
    const username = process.env.FLIST_USERNAME
    const password = process.env.FLIST_PASSWORD

    console.log(`Loading the F-List API as ${username}...`.gray)
    
    if (!username || !password) {
        throw new Error('Please provide an username and password on the .env. Read the .env.example for reference.')
        return 
    }

    const user = await new Flist(username, password);

    if (!user) {
        throw new Error('Could not log into this account.')
        return
    }

    try {
        await user.authenticate();
        
        if (user.isAuthenticated()) {
            return user
        }
    } catch (e) {
        throw new Error('Could not log into this account.', e)
    }
}