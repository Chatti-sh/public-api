import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import 'colors';

import routes from './api/routes/index.js';
import { flist_session } from './helpers/session/f-list.js';
import { fchat_session } from './helpers/session/f-chat.js';
import { runMigrations } from './helpers/db/db.js';

async function main() {
    runMigrations();
    const session = await flist_session();
    await fchat_session.connect(session.credentials.ticket);
    express_api();
}

async function express_api() {
    const app = express()

    app.use(cors({
        origin: 'http://localhost:5173', // Chattish
        methods: ['GET', 'POST'],
    }));
    app.use(express.json());
    
    app.use('/api', routes);

    app.get('/', (req, res) => {
        res.send('Chattish API live')
    })

    let PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log((`Chattish`.blue + ` API`.white).bold);
    console.log(`Server is running on http://localhost:${PORT}`.gray);
    });
}

const shutdown = () => {
    console.log(`Shutting down...`.red.bold);
    fchat_session.flush_online_characters();
    process.exit(0);
};

main().catch(console.error);

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);