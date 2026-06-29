/*
PARSER

Reads through and parses user-inputted text. */

/* Disclosure: AI-generated code. */

const AGE_RANGE_KEYWORDS = {
    "🚸": { start: 0,  end: 17 },
    "🚫": { start: 0,  end: 17 },
    "🔞": { start: 0,  end: 17 },
    "👵🏼": { start: 60, end: 99 },
    "👶": { start: 0,  end: 2  },
    "🧒": { start: 3,  end: 12 },
    "🧑‍🎓": { start: 18, end: 24 },
    "adult": { start: 18, end: 99 },
    "teen": { start: 13, end: 19 },
    "teenager": { start: 13, end: 19 },
    "tot": { start: 3, end: 6 },
    "toddler": { start: 3, end: 6 },
    "kid": { start: 7, end: 12 },
    "illegal": { start: 0, end: 17 },
    "not legal": { start: 0, end: 17 },
}

const WILDCARDS = 'X⬛█';

/* TODO:
    - Add "decades" as 100
    - Add "several"/"multiple", eg.: "several decades" = [200, 900]
*/

/* General purpose function that normalizes a string and gets
a range of numbers from it. Used for age estimation. Handles:
    - Commas and dots in large numbers
    - Numbers expressed in words ("seventy" -> 70)
        - Hyphens and numbers separating words ("seventy-eight" -> 78)
        - Words for decades and large scales of time (decades, million, billion)
    - Modifiers for age ranges ("mid 30's" -> 33-36)
    - Wildcards ("1X" -> 10 - 19)
    - Custom words or emoji symbolizing age */
export function get_numbers_from_string(str) {
    if (!str) return [];

    str = normalize_text(str);
    console.log(str)

    // Standardize punctuation by removing thousand-separator commas/dots
    // This safely turns "100,000,000" or "100.000.000" into "100000000"
    // while keeping a single trailing decimal dot if present.
    if (/[0-9],[0-9]/.test(str) && /[0-9]\.[0-9]/.test(str)) {
        // Has both (e.g. 1,234,567.89) -> remove commas
        str = str.replace(/,/g, '');
    } else if (/\d+,\d{3}(?:,|$)/.test(str)) {
        // Pure comma separators (e.g. 100,000,000) -> remove commas
        str = str.replace(/,/g, '');
    } else if (/\d+\.\d{3}(?:\.|$)/.test(str)) {
        // Pure dot separators (European style e.g. 100.000.000) -> remove dots
        str = str.replace(/\./g, '');
    }

    const numbers = [];

    // 1. Check for custom emoji/keyword ranges first
    for (const [key, range] of Object.entries(AGE_RANGE_KEYWORDS)) {
        if (str.includes(key)) {
            numbers.push(range.start, range.end);
        }
    }

    const numberWords = {
        'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
        'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
        'twenty': 20, 'thirty': 30, 'forty': 40, 'fourty': 40, 'fifty': 50, 'sixty': 60,
        'seventy': 70, 'eighty': 80, 'ninety': 90,
        'twenties': 20, 'thirties': 30, 'forties': 40, 'fourties': 40, 'fifties': 50, 
        'sixties': 60, 'seventies': 70, 'eighties': 80, 'nineties': 90
    };

    const scaleWords = {
        'hundred': 100, 'hundreds': 100,
        'thousand': 1000, 'thousands': 1000,
        'million': 1000000, 'millions': 1000000,
        'billion': 1000000000, 'billions': 1000000000
    };
    
    function parseTextToNumber(phrase) {
        const tokens = phrase.toLowerCase().match(/[a-z]+/g) || [];
        let total = 0;
        let current = 0;

        for (const token of tokens) {
            if (token in numberWords) {
                current += numberWords[token];
            } else if (token in scaleWords) {
                const scale = scaleWords[token];
                if (scale === 100) {
                    current *= 100;
                } else {
                    total += (current === 0 ? 1 : current) * scale;
                    current = 0;
                }
            } else if (token === 'and') {
                continue;
            } else {
                return null;
            }
        }
        return total + current;
    }

    // 1.5. Wildcard extraction
    // X, ⬛ (U+2B1B), █ (U+2588) each represent one unknown digit (0–9).
    // A run of digits + wildcards containing ≥1 wildcard becomes a [min, max] range:
    //   ⬛   → [0, 9]     single unknown digit; 0 is a valid single digit
    //   ██   → [10, 99]   leading wildcard in multi-char token: min digit is 1, not 0
    //   1X   → [10, 19]   known first digit pins the leading min
    //   XX   → [10, 99]
    //   1X3  → [103, 193]
    const wildcardRegex = new RegExp(
        `(?<![a-zA-Z])[0-9]*[${WILDCARDS}][0-9${WILDCARDS}]*`,
        'gu'
    );
    let wcMatch;
    while ((wcMatch = wildcardRegex.exec(str)) !== null) {
        const chars = [...wcMatch[0]]; // Unicode-aware split
        let minStr = '';
        let maxStr = '';

        for (let i = 0; i < chars.length; i++) {
            if (WILDCARDS.includes(chars[i])) {
                // Leading wildcard in a multi-digit token: min is 1 to avoid a leading zero
                minStr += (i === 0 && chars.length > 1) ? '1' : '0';
                maxStr += '9';
            } else {
                minStr += chars[i];
                maxStr += chars[i];
            }
        }

        const wcMin = parseInt(minStr, 10);
        const wcMax = parseInt(maxStr, 10);
        const numDigits = chars.length;

        const beforeWc = str.slice(0, wcMatch.index);
        const modCheck = /\b(early|mid|late)\s*$/i.exec(beforeWc);

        let rangeMin = wcMin;
        let rangeMax = wcMax;
        let spanStart = wcMatch.index;
        const spanEnd = wcMatch.index + wcMatch[0].length;

        if (modCheck) {
            const modifier = modCheck[1].toLowerCase();
            const centurySize = Math.pow(10, numDigits);
            const half = centurySize / 2;

            if (modifier === 'early') { rangeMax = half - 1; }
            else if (modifier === 'mid') { rangeMin = centurySize / 4; rangeMax = (3 * centurySize / 4) - 1; }
            else /* late */             { rangeMin = half; }

            spanStart = modCheck.index;
        }

        numbers.push(rangeMin, rangeMax);

        str = str.slice(0, spanStart)
            + ' '.repeat(spanEnd - spanStart)
            + str.slice(spanEnd);
    }

    // 2. Modifier Processing Logic (Handles "Mid 30s", "Mid 400s", etc.)
    const modifierRegex = /\b(early|mid|late)[-\s]+((?:\d+|[a-z]+)(?:[-\s]+(?:and|hundreds?|thousands?|millions?|billions?|[a-z]+))*)/gi;
    let modifierMatch;

    while ((modifierMatch = modifierRegex.exec(str)) !== null) {
        const modifier = modifierMatch[1].toLowerCase();
        const baseValueStr = modifierMatch[2].toLowerCase().trim();
        
        let baseDecade = null;

        if (/^\d+/.test(baseValueStr)) {
            const digitPart = parseInt(baseValueStr.match(/^\d+/)[0], 10);
            const wordsPart = baseValueStr.replace(/^\d+/, '').trim();
            if (wordsPart) {
                let scaleMultiplier = 1;
                const scaleTokens = wordsPart.match(/[a-z]+/g) || [];
                for (const t of scaleTokens) {
                    if (t in scaleWords) scaleMultiplier *= scaleWords[t];
                }
                baseDecade = digitPart * scaleMultiplier;
            } else {
                baseDecade = digitPart;
            }
        } else {
            baseDecade = parseTextToNumber(baseValueStr);
        }

        if (baseDecade && baseDecade >= 10) {
            let magnitude = Math.pow(10, Math.floor(Math.log10(baseDecade))) / 10;
            if (magnitude < 1) magnitude = 1; 

            let start, end;
            if (modifier === 'early') { start = baseDecade;                  end = baseDecade + (3 * magnitude); }
            if (modifier === 'mid')   { start = baseDecade + (3 * magnitude); end = baseDecade + (6 * magnitude); }
            if (modifier === 'late')  { start = baseDecade + (6 * magnitude); end = baseDecade + (9 * magnitude); }

            numbers.push(start, end);
            str = str.slice(0, modifierMatch.index) + " ".repeat(modifierMatch[0].length) + str.slice(modifierMatch.index + modifierMatch[0].length);
        }
    }
    
    // 3. Extract standard remaining numbers linked to text scale words
    const digitScaleRegex = /(\d+)[-\s]+(hundreds?|thousands?|millions?|billions?)/gi;
    let dsMatch;
    while ((dsMatch = digitScaleRegex.exec(str)) !== null) {
        const val = parseInt(dsMatch[1], 10);
        const scale = scaleWords[dsMatch[2].toLowerCase()];
        numbers.push(val * scale);
        str = str.slice(0, dsMatch.index) + " ".repeat(dsMatch[0].length) + str.slice(dsMatch.index + dsMatch[0].length);
    }

    // Extract standalone massive numbers safely using BigInt or Number depending on length
    const digitMatches = str.match(/\d+/g);
    if (digitMatches) {
        for (const digitStr of digitMatches) {
            // If the number is too big for JS numbers (> 15 digits), use BigInt safely converting to standard Number
            // if we just need it for sorting bounds, or leave it as a number if it fits.
            if (digitStr.length > 15) {
                numbers.push(Number(BigInt(digitStr))); 
            } else {
                numbers.push(Number(digitStr));
            }
        }
    }
    
    // 4. Extract large written numbers left over
    // Decade words → emit a [start, start+9] range instead of a single value
    const decadeRangeWords = new Set([
        'twenties', 'thirties', 'forties', 'fourties',
        'fifties', 'sixties', 'seventies', 'eighties', 'nineties'
    ]);

    const wordSequenceRegex = /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|twenties|thirties|forties|fourties|fifties|sixties|seventies|eighties|nineties|and|hundreds?|thousands?|millions?|billions?)\b(?:[-\s]+(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|twenties|thirties|forties|fourties|fifties|sixties|seventies|eighties|nineties|and|hundreds?|thousands?|millions?|billions?)\b)*/gi;

    let wsMatch;
    while ((wsMatch = wordSequenceRegex.exec(str)) !== null) {
        const matchText = wsMatch[0].trim().toLowerCase();
        const calculatedValue = parseTextToNumber(matchText);
        if (calculatedValue !== null && calculatedValue > 0) {
            if (decadeRangeWords.has(matchText)) {
                // "fourties" → [40, 49], "seventies" → [70, 79], etc.
                numbers.push(calculatedValue, calculatedValue + 9);
            } else {
                numbers.push(calculatedValue);
            }
        }
    }
    
    const uniqueSorted = [...new Set(numbers)].sort((a, b) => a - b);

    if (uniqueSorted.length > 2) {
        return [uniqueSorted[0], uniqueSorted[uniqueSorted.length - 1]];
    }

    return uniqueSorted;
}

/*
Normalizes text input that uses special characters. Handles:
    - Small Caps
    - Phonetic Alphabet
    - Math fonts
    - Pseudo-fonts
    - Superscript and Subscript
    - Circled numbers
*/
function normalize_text(str) {
if (!str) return '';
    // 1. Comprehensive Small Caps & Phonetic Alphabet Map
    const smallCapsMap = {
        'ᴀ': 'a', 'ʙ': 'b', 'ᴄ': 'c', 'ᴅ': 'd', 'ᴇ': 'e', 'ꜰ': 'f', 'ɢ': 'g', 
        'ʜ': 'h', 'ɪ': 'i', 'ᴊ': 'j', 'ᴋ': 'k', 'ʟ': 'l', 'ᴍ': 'm', 'ɴ': 'n', 
        'ᴏ': 'o', 'ᴘ': 'p', 'ǫ': 'q', 'ʀ': 'r', 'ꜱ': 's', 'ᴛ': 't', 'ᴜ': 'u', 
        'ᴠ': 'v', 'ᴡ': 'w', '🇽': 'x', 'ʏ': 'y', 'ᴢ': 'z',
        // Additional phonetic variants found in pseudo-fonts
        'a': 'a', 'b': 'b', 'c': 'c', 'd': 'd', 'e': 'e', 'f': 'f', 'g': 'g',
        'h': 'h', 'i': 'i', 'j': 'j', 'k': 'k', 'l': 'l', 'm': 'm', 'n': 'n',
        'o': 'o', 'p': 'p', 'q': 'q', 'r': 'r', 's': 's', 't': 't', 'u': 'u',
        'v': 'v', 'w': 'w', 'x': 'x', 'y': 'y', 'z': 'z'
    };

    // A comprehensive regex or a character-by-character split/map is safest here
    let cleanStr = str.split('').map(char => smallCapsMap[char] || char).join('');

    // 2. Standard Unicode Normalization (Handles Math Bold, Sans, Monospace, Fullwidth, etc.)
    cleanStr = cleanStr.normalize('NFKC');

    // 3. Map for characters that NFKC doesn't automatically convert (Superscripts, Subscripts, Circled)
    const customMap = {
        '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
        '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
        '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5', '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9', '⑩': '10',
        '⑪': '11', '⑫': '12', '⑬': '13', '⑭': '14', '⑮': '15', '⑯': '16', '⑰': '17', '⑱': '18', '⑲': '19', '⑳': '20',
        '❶': '1', '❷': '2', '❸': '3', '❹': '4', '❺': '5', '❻': '6', '❼': '7', '❽': '8', '❾': '9', '❿': '10'
    };

    return cleanStr.replace(/[\u00b2\u00b3\u00b9\u2070-\u2079\u2080-\u2089\u2460-\u2473\u2776-\u277f]/g, 
        match => customMap[match] || match
    );
}

/* Get all profiles linked in icons and hub links given a character description. */
export function extract_hub_names(content) {
    if (!content || typeof content !== 'string') {
        return [];
    }
    
    const characterNames = new Set();
    
    // Extract standard [icon]Name[/icon]
    const iconRegex = /\[icon\]([^\[\]]+)\[\/icon\]/gi;
    let match;
    
    while ((match = iconRegex.exec(content)) !== null) {
        characterNames.add(match[1].trim());
    }
    
    // Extract character names from [url=...f-list.net/c/Name]...hub...[/url]
    const hubUrlRegex = /\[url=["']?(?:https?:\/\/)?(?:www\.)?f-list\.net\/c\/([^/"'\]\?#]+)[^\]]*\]([\s\S]*?)\[\/url\]/gi;
    
    while ((match = hubUrlRegex.exec(content)) !== null) {
        const rawName = match[1];
        const innerText = match[2];
        
        // Ensure the word "hub" (case-insensitive, as a whole word) exists in the link text
        if (/\bhub\b/i.test(innerText)) {
            try {
                // Decode URI components (e.g., "%20" to space) just in case the URL was encoded
                const decodedName = decodeURIComponent(rawName).trim();
                characterNames.add(decodedName);
            } catch (e) {
                // Fallback to the raw string if decoding fails for any reason
                characterNames.add(rawName.trim());
            }
        }
    }
    
    return Array.from(characterNames);
}