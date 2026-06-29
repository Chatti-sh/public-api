// F-Chat Protocol Server Commands
// https://wiki.f-list.net/F-Chat_Server_Commands

/* -----------------------------
 * OUTGOING (Server → Client)
 * Events that F-Chat sends to us
 * ----------------------------- */
const OUTGOING_COMMANDS = [
    /* Noisy events for every character online on F-Chat
    We filter these out on the Bouncer, but handle these server-side on this API
    (eg. to return character status on the metadata endpoint) */
    'NLN', // Character goes online
    'FLN', // Character goes offline
    'STA', // Character changes status

    'ADL', // List of chatops
    'AOP', // Promotion to chatop
    'BRO', // Admin broadcast
    'CDS', // Channel description changed
    'CHA', // List of public channels
    'CIU', // Invite to channel
    'CBU', // Removed user from channel
    'CKU', // Kicked user from channel
    'COA', // Promotion to channel op
    'COL', // List of channel ops, [JCH]
    'CON', // Connected users to network
    'COR', // Removed channel op
    'CSO', // New owner of channel
    'CTU', // Channel time out
    'DOP', // Removed chatop
    'ERR', // Error
    'FKS', // Results of search [FKS]
    'HLO', // F-Chat server info
    'ICH', // Initial channel data [JCH, CDS]
    'IDN', // Log-in successful
    'JCH', // User joined channel
    'KID', // Kink data [KIN]
    'LCH', // User left channel
    'LIS', // All online characters [NOTE: Filtered separately]
    'IGN', // Ignore
    'FRL', // Friends list (on login)
    'ORS', // List of private rooms
    //'PIN', // Ping
    'PRD', // Profile data [PRO]
    'PRI', // Private message received
    'MSG', // Message on channel received
    'LRP', // Roleplay ad received
    'RLL', // RNG (roll dice, spin bottle)
    'RMO', // Room mode change
    'RTB', // Received note or message
    'SFC', // Admin or chatop alert
    'SYS', // System message [COL, CUB, CBL, RST]
    'TPN', // Character is typing
    'UPT', // Server online time
    'VAR', // Server sent variables (?)
];

// F-Chat Protocol Client Commands
// https://wiki.f-list.net/F-Chat_Client_Commands

/* -----------------------------
 * INCOMING (Client → Server)
 * Commands clients can send to F-Chat through their character
 * ----------------------------- */
const INCOMING_COMMANDS = [
    'ACB', // Accept chat bookmark
    'AOP', // Promote to chatop (chatop)
    'AWC', // Admin who command
    'BRO', // Admin broadcast
    'CBL', // Create channel ban list
    'CDS', // Change channel description
    'CBU', // Ban character from channel (channelop)
    'CCR', // Create private channel
    'CDS', // Change channel description (channelop)
    'CHA', // Request public channel list
    'CIU', // Invite user to channel (channelop)
    'CKU', // Kick user from channel (channelop)
    'COA', // Promote to channel op (channelop)
    'COL', // Request channel op list
    'COR', // Remove channel op (channelop)
    'CRC', // Create private channel (chatop)
    'CSO', // Set channel owner (channelop)
    'CTU', // Timeout user in channel (channelop)
    'CUB', // Unban user from channel (channelop)
    'DOP', // Remove chatop (admin only)
    'FKS', // Search kinks
    'IDN', // Indentify with server
    'IGN', // Ignore/unignore user
    'JCH', // Join channel
    'KIC', // Delete channel (chatop)
    'KIK', // Kick character (chatop)
    'KIN', // Request kink list
    'LCH', // Leave channel
    'LRP', // Send roleplay ad
    'MSG', // Send channel message
    'ORS', // Request private room list
    //'PIN', // Ping (keep-alive)
    'PRI', // Send private message
    'PRO', // Request profile tags
    'RLL', // RNG (roll dice, spin bottle)
    'RLD', // Reload server configs (chatop)
    'RMO', // Set room mode (channelop)
    'RST', // Set private room to closed/open (channelop)
    'RWD', // Reward with crown (chatop only)
    'SFC', // Report to staff
    'STA', // Set status
    'TMO', // Timeout user (chatop only)
    'TPN', // Typing status
    'UNB', // Unban user (chatop only)
    'UPT', // Request server info
];

export {
    OUTGOING_COMMANDS,
    INCOMING_COMMANDS
};