import { ProfileFlag } from "../ProfileFlag.js";

// TODO:
// - Parse any text input using the Parser function
// - Advanced text filtering (eg.: "tot" but not "totally")

export const underageCheck = new ProfileFlag({
    signals: [
        {
            id: 'estimated_age_range',
            weight: .5,
            force_action: 'hide',
            check(character_data, chattish_profile) {
                const range = chattish_profile.estimated_age_range;
                if (!range || range.length === 0) return 0;

                // If only one number and below 18, full confidence
                if (range.length === 1) return { score: range[0] < 18 ? 1.0 : 0, matches: range };

                // Check how much of the range is underage. If > 50%, flag
                const [min, max] = range.length === 1 ? [range[0], range[0]] : [range[0], range[1]];
                const underagePortion = Math.max(0, Math.min(18, max) - min) / (max - min || 1);
                return { score: underagePortion > 0.5 ? underagePortion : 0, matches: range };
            }
        },
        {
            id: 'name_keywords',
            weight: 0.15,
            check(character_data, chattish_profile) {
                // Terms that are unlikely to be used in any other context
                const MAX_TERMS = ['ageplay', 'cub', 'kid', 'child', 'minor', 'teen', 'loli', 'shota', 'tot', 'toddler', 'baby', 'cradle', 'crib', 'little boy', 'young boy', 'youngin', 'youngun'];
                // Terms that may be used for activities that may or may not match this flag
                const MIN_TERMS = ['brat', 'student', 'young'];
                const name = character_data.name.toLowerCase();

                const maxMatches = MAX_TERMS.filter(t => name.includes(t));
                if (maxMatches.length > 0) return { score: 1.0, matches: maxMatches };

                const minMatches = MIN_TERMS.filter(t => name.includes(t));
                if (minMatches.length > 0) return { score: 0.25, matches: minMatches };

                return { score: 0, matches: [] };
            }
        },
        {
            id: 'description_keywords',
            weight: 0.20,
            check(character_data, chattish_profile) {
                // Terms that are unlikely to be used in any other context
                const MAX_TERMS = ['ageplay', 'loli', 'shota'];
                // Terms that may be used for activities that may or may not match this flag
                const MIN_TERMS = ['brat', 'student', 'young', 'cub', 'kid', 'child', 'minor', 'teen',  'tot', 'toddler', 'baby', 'cradle', 'crib', 'little boy', 'young boy', 'youngin', 'youngun'];
                const description = (character_data.description || '').toLowerCase();

                const maxMatches = MAX_TERMS.filter(t => description.includes(t));
                if (maxMatches.length > 0) return { score: 1.0, matches: maxMatches };

                // Each MIN_TERM match contributes 0.25, capped at 1.0
                const minMatches = MIN_TERMS.filter(t => description.includes(t));
                return { score: Math.min(1.0, minMatches.length * 0.25), matches: minMatches };
            }
        },
        {
            id: 'kinks',
            weight: 0.1,
            check(character_data, chattish_profile) {
                const FLAGGED_KINKS = [
                    '196', // Ageplay
                    '621', // Age Regression
                    '207', // Underage Characters
                    //'622', // Age Progression
                    //'620'  // Age Differences
                ];
                const kinks = character_data.kinks || {};

                const SCORES = { fave: 1.0, yes: 0.5, maybe: 0.25 };

                const matches = FLAGGED_KINKS
                    .filter(id => kinks[id] && kinks[id] !== 'no')
                    .map(id => ({ id, preference: kinks[id], score: SCORES[kinks[id]] }));

                if (matches.length === 0) return { score: 0, matches: [] };

                // Use the highest score among matched kinks
                const score = Math.max(...matches.map(m => m.score));
                return { score, matches: matches.map(m => m.id) };
            }
        },
        /*
        TODO:
        - If a custom kink includes any keyword 
        - If an ad by this profile has been tracked including the words "ageplay warning" or similar
         */
    ]
})