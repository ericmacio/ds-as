const express = require('express');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser")
const nocache = require('nocache');
const auth = require('../middleware/auth');
const authRoutes = require('../routes/auth');
const appsRoutes = require('../routes/apps');
const agentsRoutes = require('../routes/agents');
const configRoutes = require('../routes/config');
const servicesRoutes = require('../routes/services');
const usersRoutes = require('../routes/users');
const logsRoutes = require('../routes/logs');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'AsApiRouter');
const { oamConsolePort } = require('../../../config/asApi.json');

const AsApiRouter = () => {
    const caller = 'AsApiRouter';
    //Create app express instance
    let app = express()
        .use('/', express.static(__dirname + '/../../console/dist'))
        .use('/assets', express.static(__dirname + '/../../console/assets'))
        .use(express.static(__dirname + '/../../appsData'))
        .use(favicon(__dirname + '/../../medias/favicon/favicon.ico'))
        .use(express.urlencoded({extended: true}))
        .use(bodyParser.json())
        .use(cookieParser())
        .use(nocache())
        .use('/api/auth', authRoutes)
        .use('/api/users', auth, usersRoutes)
        .use('/api/services', auth, servicesRoutes)
        .use('/api/apps', auth, appsRoutes)
        .use('/api/agents', auth, agentsRoutes)
        .use('/api/config', auth, configRoutes)
        .use('/api/logs', auth, logsRoutes)
        .listen(oamConsolePort);
    logger.log(caller, 'DEBUG', '__dirname: ' + __dirname);
    logger.log(caller, 'INFO1', 'OAM server has been started on port ' + oamConsolePort);
    return {ok: true};
}
module.exports = AsApiRouter;