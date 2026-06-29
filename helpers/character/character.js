import { flist_request } from "../session/f-list.js";
import { db } from '../db/db.js';

/* TODO: Rename "Profile" to "Character" */

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFETCH_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export async function get_flist_character(character_name) {
    return flist_request('character-data', {
        params: { name: character_name },
        skipAuth: false,
        forceAuth: false
    });
}

export function getProfileCache(name) {
    return db.prepare('SELECT * FROM profile WHERE character_name = ?').get(name);
}

export function setProfileCache(name, updatedAt, derived) {
    db.prepare(`
        INSERT INTO profile (character_name, updated_at, profile_picture, gender_color, age_range, is_hub, flags, cached_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(character_name) DO UPDATE SET
            updated_at      = excluded.updated_at,
            profile_picture = excluded.profile_picture,
            gender_color    = excluded.gender_color,
            age_range       = excluded.age_range,
            is_hub          = excluded.is_hub,
            flags           = excluded.flags,
            cached_at       = excluded.cached_at
    `).run(
        name,
        updatedAt,
        derived.profile_picture,
        derived.gender_color,
        JSON.stringify(derived.estimated_age_range),
        derived.is_hub ? 1 : 0,
        JSON.stringify(derived.flags ?? {}),
        Date.now()
    );
}

export function rowToProfile(row) {
    const hubEntry = getHubForCharacter(row.character_name);
    return {
        profile_picture:     row.profile_picture,
        gender_color:        row.gender_color,
        estimated_age_range: JSON.parse(row.age_range  || '[]'),
        related_characters:  getProfileRelationshipCache(row.character_name),
        is_hub:              row.is_hub === 1,
        hub:                 hubEntry?.hub_name || null,
        flags:               JSON.parse(row.flags || '{}'),
    };
}


export function getProfileRelationshipCache(name) {
    const asHub = db.prepare(`
        SELECT char_name FROM profile_relationship WHERE hub_name = ?
    `).all(name).map(r => r.char_name);

    // Also return siblings if this character belongs to a hub
    const asChar = db.prepare(`
        SELECT r.char_name
        FROM profile_relationship r
        WHERE r.hub_name IN (
            SELECT hub_name FROM profile_relationship WHERE char_name = ?
        )
        AND r.char_name != ?
    `).all(name, name).map(r => r.char_name);

    return [...new Set([...asHub, ...asChar])];
}

export function replaceHubRelationships(hubName, charNames) {
    const replaceMany = db.transaction((hub, chars) => {
        db.prepare(`DELETE FROM profile_relationship WHERE hub_name = ?`).run(hub);
        for (const char of chars) {
            upsertProfileRelationship(hub, char);
        }
    });
    replaceMany(hubName, charNames);
}

export function upsertProfileRelationship(hubName, charName) {
    createProfileStub(hubName);
    createProfileStub(charName);
    
    db.prepare(`
        INSERT INTO profile_relationship (hub_name, char_name, direction, discovered_at)
        VALUES (?, ?, 'hub_to_char', ?)
        ON CONFLICT(hub_name, char_name) DO NOTHING
    `).run(hubName, charName, Date.now());
}

export function confirmMutualProfileRelationship(hubName, charName) {
    db.prepare(`
        UPDATE profile_relationship SET direction = 'mutual'
        WHERE hub_name = ? AND char_name = ?
    `).run(hubName, charName);
}

export function getHubForCharacter(charName) {
    return db.prepare(
        'SELECT hub_name FROM profile_relationship WHERE char_name = ?'
    ).get(charName);
}

/* Create an empty version of a profile for profile relationships.
Useful in case that none of these profiles currently exist in cache. */
function createProfileStub(name) {
    db.prepare(`
        INSERT INTO profile (character_name, updated_at, profile_picture, gender_color, age_range, is_hub, cached_at)
        VALUES (?, 0, '', 'gray', '[]', 0, 0)
        ON CONFLICT(character_name) DO NOTHING
    `).run(name);
}

/* Check if the profile's cache has expired (30 days). */
export function isExpired(cachedAt) {
    return Date.now() - cachedAt > TTL_MS;
}

/* Do not update this profile if the refetch cooldown has not passed.
Prevents malicious uses of the updated_at field. */
export function canRefetch(cachedAt) {
    return Date.now() - cachedAt > REFETCH_COOLDOWN_MS;
}