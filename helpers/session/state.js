/*
STATE

Keeps the currently active F-Chat state of all characters on the site,
so it can be referenced by the metadata endpoints.

NOTE: Except for a computed "Last online" timestamp, this data is stored in memory
for as long as the API is alive and never saved to a database.
*/

export const state = {
    // character name → { status, statusMsg }
    onlineCharacters: new Map(),
};