# Chattish Public API

API exposing advanced features used by the Chattish client for F-List.

## Public API

**NOTE**: This service is currently not operational.

You may use the API freely for your own personal projects at `api.chattish.net`.

Endpoints:

**GET** `/api/characters/:name`: Receive metadata about this F-List character. 
Important: This does not return any F-List API data, such as description, kinks and infotags. This endpoint should be used alongside access to the F-List API on your client.
Include a `updated_at` field in your response to fetch the latest data where available. Fetching new data from a character has a cooldown of 10 minutes.

Returns:
    - `profile_picture`: The default F-List character picture, or the [Rising/Horizon](https://horizn.moe/docs/guides/colors-and-avatars.html) custom avatar.
    - `gender_color`: The default F-List gender color, or the [Rising/Horizon](https://horizn.moe/docs/guides/colors-and-avatars.html) custom color.
    - `estimated_age_range`: Array of numbers with an age-range derived from the Age or Apparent Age strings. Where more than one age is available, it'll return the min and max values. Supports custom fonts, modifiers (Mid 30's -> [33 - 36]), wildcards (1X -> [10, 19]), and certain flagged emoji.
    - `related_characters`: Array of character names that may be from the same author, based on character linking with [icon] tags.
    - `hub`: Optional field with the name of a character who, in turn, is linking to this character. Empty if is_hub is true.
    - `is_hub`: Bool. True if the character description contains more than three [icon] tags in their description.
    - `status`: The character's Status in F-Chat. Possible values: [looking, online, away, busy, dnd, offline].
    - `status_message`: The character's status message in F-Chat. May be null.
    - `last_online`: UNIX timestamp computed upon character log-out. May be null if this character has not gone online while this API is running.
    - `flags`: Object with developer-determined flags for sensitive kinks, such as Underage, Raceplay and Filth. Clients can use these to take actions regarding this character, such as warning the user before allowing them to enter the character, or hiding messages and ads. Each flag sensor includes a `confidence` score, `percentage`, recommended `action` ([none, warn, hide]), and an array of `signals`. Each signal is an object with `id` (eg. kinks, description_keywords, estimated_age_range), `weight`, `score`, an array of `matches` and `contribution` score.

TBD: Kink compatibility, Community flags

## Installation

Provide a `FLIST_USERNAME` and `FLIST_PASSWORD` in the .env, install dependencies with `npm i`, then run with `npm run dev`.

This code is source-available under the [TBD] license.