import app from './app';
import * as http from 'http';
import * as fs from 'fs';
import logger from './services/Logger'
const PORT = process.env.PORT || 8000;

http.createServer(app).listen(PORT, () => {
    logger.info('Express server listening on port ' + PORT);
})