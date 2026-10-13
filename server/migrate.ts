import { openDb, dataDir } from './db.js'; openDb().close(); console.log(`Migration complete: ${dataDir}`);
