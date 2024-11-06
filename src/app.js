const mongoose = require('mongoose');
const asApiRouter = require('./asApi/router/AsApiRouter');
const LogServer = require('./logging/LogServer');
const Logger = require('./logging/logger');
const caller = 'app';

//Create logger server. Will provide console remote access to all logs
const logServer = new LogServer();
//Create logger and pass it the logServer instance shared by all logger instances
const logger = new Logger(__filename, 'main', null, logServer);
logger.startCheckLogSize();

//Connect to the NoSQL database
mongoose.connect('mongodb://localhost/ds-as', { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });
logger.log(caller, 'INFO0', 'Connected to database');

//Start AS API router
asApiRouter();
logger.log(caller, 'INFO0', '--- AS started ---');