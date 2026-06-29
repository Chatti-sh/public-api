import { get_flist_character, rowToProfile, getProfileCache, setProfileCache, getProfileRelationshipCache,
    replaceHubRelationships, confirmMutualProfileRelationship, isExpired, getHubForCharacter, canRefetch } from "../../helpers/character/character.js"
import { get_numbers_from_string, extract_hub_names } from "../../helpers/parser/parser.js"
import { flist_request } from "../../helpers/session/f-list.js";
import { runAllChecks } from '../../helpers/flags/flags.js';
import { state } from "../../helpers/session/state.js";

const ALLOWED_PROFILE_PICTURE_HOSTS = [
    'static.f-list.net',
    'static.e621.net',
    'iili.io',
    'redgifs.com',
    'imgchest.com',
    'toyhou.se'
]

export async function getCharacterDataService(name, clientUpdatedAt = null) {
    try {
        const cached = getProfileCache(name);

        // Compare updated_at against cache
        if (clientUpdatedAt && cached) {
            if (cached.updated_at >= clientUpdatedAt) {
                console.log('Fetching '.gray + name.white.bold + ': Profile to date, return cached'.gray)
                return profile_with_fchat_state(rowToProfile(cached), name, cached); // Profile to date, return cached
            }
            
            if (!canRefetch(cached.cached_at)) {
                console.log('Fetching '.gray + name.white.bold + ': Profile outdated but on cooldown, return cached'.gray)
                return profile_with_fchat_state(rowToProfile(cached), name, cached); // Profile outdated but on cooldown, return cached
            }
        }

        // Check if profile's TTL has not expired (no updated_at)
        if (!clientUpdatedAt && cached && !isExpired(cached.cached_at)) {
            console.log('Fetching '.gray + name.white.bold + ': Profile is in cache, no updated_at provided'.gray)
            return profile_with_fchat_state(rowToProfile(cached), name, cached);
        }

        // Compute data and store to database
        // (Cache is stale or profile has been updated)
        const flist_data = await get_flist_character(name);
        if (!flist_data.name) {
            console.log('Error'.red.bold + ': Could not fetch '.gray + name + ' from the F-List API'.gray);
            return {error: 'Could not fetch data from API' }; // Change this!
        }

        const hubEntry = getHubForCharacter(flist_data.name);

        const profile = {
            profile_picture:     get_profile_picture(flist_data),
            gender_color:        get_gender_color(flist_data),
            estimated_age_range: get_estimated_age_range(flist_data),
            related_characters:  await get_related_characters(flist_data),
            is_hub:              is_profile_hub(flist_data.description),
            hub:                 hubEntry?.hub_name || null,
        };

        profile.flags = runAllChecks(flist_data, profile)

        setProfileCache(name, flist_data.updated_at, profile);

        console.log('Fetching '.gray + name.white.bold + ': Profile updated or not in cache, getting from F-List API'.gray)
        return profile_with_fchat_state(profile, name, cached);
    } catch (e) {
        console.error(e);
        return {};
    }
}

function get_profile_picture(character_data) {
    // Find "Rising Portrait" or "Horizon Portrait" in the description
    if (character_data.description) {
        const match = character_data.description.match(/\[url=(.*?)\](Horizon Portrait|Rising Portrait)\[\/url\]/);
        if (match) {
            const url = match[1];
            try {
                const urlObj = new URL(url);
                if (ALLOWED_PROFILE_PICTURE_HOSTS.includes(urlObj.hostname)) {
                    return url;
                }
            } catch (e) {
                // Invalid URL, fall through to default
            }
        }
    }

    // Default to the username PFP
    return 'https://static.f-list.net/images/avatar/' + character_data.name.toLowerCase() + '.png';
}

function get_gender_color(character_data) {
    // Find "Rising Color" or "Horizon Color" in the description
    if (character_data.description) {
        const match = character_data.description.match(/\[color=(.*?)\](Horizon Color|Rising Color)\[\/color\]/);
        if (match) {
            return match[1];
        }
    }

    // Default to standard gender tags
    if ('3' in character_data.infotags) {
        const gender_infotag = character_data.infotags['3'];

        switch (gender_infotag) {
            case '1': // Male
                return 'cyan';
            case '2': // Female
                return 'pink';
            case '3': // Transgender
                return 'orange';
            case '32': // Herm
                // Not F-List backwards compatible, but no other varieties of purple exist
                return 'violet';
            case '51': // Male-Herm
                return 'blue';
            case '69': // Cuntboy
                return 'green';
            case '105': // None
                return 'gray';
            case '141': // Shemale
                return 'purple';
        }
    }
    
    return 'gray';
}

function get_estimated_age_range(character_data) {
    const age_field = '1' in character_data.infotags ? character_data.infotags[1] : null
    const apparent_age_field = '64' in character_data.infotags ? character_data.infotags[64] : null
    
    if (age_field) {
        let age = get_numbers_from_string(age_field || '');
        if (age.length === 0) {
            age = get_numbers_from_string(apparent_age_field || '');
        }
        return age
    } else if (apparent_age_field) {
        return get_numbers_from_string(apparent_age_field || '');
    } else {
        return [];
    }
}

/* Get characters that are linked by a detected Hub profile. These results may not be accurate. */
export async function get_related_characters(character_data) {
    const description = character_data.description || '';
    const name = character_data.name;

    // Remove our own profile from the list of related characters
    const filterLinked = (names) => names.filter(n => n.toLowerCase() !== name.toLowerCase());

    if (is_profile_hub(description)) {
        const relatedNames = filterLinked(extract_hub_names(description));
        // Store relationships on database
        replaceHubRelationships(name, relatedNames);
        return relatedNames;
    } else {
        // Check if we're already listed under a hub in the relationship table
        // This avoids unnecessary description scanning and F-List API calls
        const hubEntry = getHubForCharacter(name);
        if (hubEntry) {
            confirmMutualProfileRelationship(hubEntry.hub_name, name);
            return filterLinked(getProfileRelationshipCache(hubEntry.hub_name));
        }

        // Not in any hub yet — scan description for parent profiles
        const parentIconNames = extract_hub_names(description);
        for (const parentName of parentIconNames) {
            // Check database to see if this parent is already confirmed as a hub
            const cachedParent = getProfileCache(parentName);
            if (cachedParent && cachedParent.cached_at > 0 && cachedParent.is_hub) {
                // Confirmed hub in cache
                confirmMutualProfileRelationship(parentName, name);
                return filterLinked(getProfileRelationshipCache(parentName));
            }

            // Not cached or is a stub — fetch from the F-List API
            try {
                const parentData = await flist_request('character-data', {
                    params: { name: parentName },
                    skipAuth: false,
                    forceAuth: false
                });

                const parentDescription = parentData?.description || '';
                if (is_profile_hub(parentDescription)) {
                    // Found a hub parent!
                    const relatedNames = filterLinked(extract_hub_names(parentDescription));
                    replaceHubRelationships(parentName, relatedNames); // Cache the hub relationships
                    confirmMutualProfileRelationship(parentName, name);
                    return relatedNames;
                }
            } catch (e) {
                console.warn(`Could not fetch parent profile ${parentName}:`, e);
                // Continue checking other parents
            }
        }

        return [];
    }
}

/* Returns values exclusive to F-Chat, such as status, status message and last online. */
function profile_with_fchat_state(profile, name, cached) {
  const fchat_state = state.onlineCharacters.get(name);

    if (fchat_state) {
        return {
            ...profile,
            status:         fchat_state.status,
            status_message: fchat_state.statusMsg || null,
            last_online:    null, // currently online — no last_online timestamp
        };
    }

    return {
        ...profile,
        status:         'offline',
        status_message: null,
        last_online:    cached?.last_online ?? null,
    };
}

/* Detect whether a profile is a character hub. */
export function is_profile_hub(character_description) {
    // TODO: Determine more specific requisites for a character being a hub (backlinking, similar kinks, etc.)
    const icons = extract_hub_names(character_description);
    return icons.length > 3;
}