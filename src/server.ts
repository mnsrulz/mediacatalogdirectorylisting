import app from './app';
import * as http from 'http';
import * as fs from 'fs';
const PORT = process.env.port || 8000;

http.createServer(app).listen(PORT, () => {
    console.log('Express server listening on port ' + PORT);
})