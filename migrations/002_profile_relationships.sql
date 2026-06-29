-- When a profile is detected to be a hub, or otherwise links to a hub,
-- this data is saved to link these profiles together under "Related Profiles"
-- which can then be displayed accordingly under a tab in the profile,
-- or used to link profiles back to a writer's hub (eg. "X, written by Y")
CREATE TABLE profile_relationship (
    hub_name      TEXT NOT NULL REFERENCES profile(character_name),
    char_name     TEXT NOT NULL REFERENCES profile(character_name),
    direction     TEXT NOT NULL CHECK(direction IN ('hub_to_char', 'mutual')),
    discovered_at INTEGER NOT NULL,
    PRIMARY KEY (hub_name, char_name)
);