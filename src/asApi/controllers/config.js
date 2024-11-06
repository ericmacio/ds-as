const ServiceRepository = require('../../repository/services');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'configController');
const { serverConfig } = require('../../../config/asApi.json');

exports.getLogConfig = async (req, res, next) => {
    const caller = 'getLogConfig';
    logger.log(caller, 'INFO2', '(get /config/log): Received ' + req.method + ' ' + req.path);
    //Get list of services
    try {
        const result = await ServiceRepository.getServices();
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.getServices result is ko.');
            return {ok: false};
        }
        var services = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.getServices failed');
        logger.error(caller, error);
        return {ok: false};
    }
    var serviceList = services.map((service) => service.name);
    const config = {
        wsConfig: {
            ip: serverConfig.ip,
            url: serverConfig.logUrl,
            port: serverConfig.logPort,
        },
        logConfig: {
            logFileName: logger.getLogFileName(),
            logFilesList: logger.getLogFilesList(),
            logLevelList: logger.getLogLevelList(),
            logTypeList: serverConfig.defaultConsolelogTypeList,
            logFormatList: serverConfig.defaultConsolelogFormatList,
            logLevelName: serverConfig.defaultConsoleLogLevel,
            logServiceName: serverConfig.defaultConsoleLogServiceName,
            logServiceList: ['All', ...serviceList]
        }
    }
    res.set('Content-Type', 'application/json');
    res.status(200).send({ok: true, error: null, data: config});
}
exports.setLogConfig = (req, res, next) => {
    const caller = 'setLogConfig';
    logger.log(caller, 'INFO2', '(put /config/log/:clientId): Received ' + req.method + ' ' + req.path);
    var clientId = req.params['clientId'];
    //NO CHANGE ON THE SERVER IS DONE HERE. WE USE THE WEBSOCKET LINK FROM THE CONSOLE INSTEAD.
    //var client = this.logServer.modifyClient(clientId, req.body)
    logger.log(caller, 'INFO0', 'Receive log config change request. Client id: ' + clientId);
    res.set('Content-Type', 'application/json');
    res.status(200).send({ok: true, error: null, data: {...req.body, clientId: clientId}});
}
exports.getServiceConfig = (req, res, next) => {
    const caller = 'getServiceConfig';
    //Get the service notifier config data
    logger.log(caller, 'INFO2', '(get /config/services): Received ' + req.method + ' ' + req.path);
    const config = {
        wsConfig: {
            ip: serverConfig.ip,
            url: serverConfig.serviceNotifier.url,
            port: serverConfig.serviceNotifier.port,
        }
    }
    res.set('Content-Type', 'application/json');
    res.status(200).send({ok: true, error: null, data: config});
}
exports.getAgentConfig = (req, res, next) => {
    const caller = 'getAgentConfig';
    //Get the service notifier config data
    logger.log(caller, 'INFO2', '(get /config/agents): Received ' + req.method + ' ' + req.path);
    const config = {
        wsConfig: {
            ip: serverConfig.ip,
            url: serverConfig.agentNotifier.url,
            port: serverConfig.agentNotifier.port,
        }
    }
    res.set('Content-Type', 'application/json');
    res.status(200).send({ok: true, error: null, data: config});
}
exports.getConfig = (req, res, next) => {
    const caller = 'getConfig';
    //Get the service notifier config data
    logger.log(caller, 'INFO2', '(get /config): Received ' + req.method + ' ' + req.path);
    const config = {
        wsAgentConfig: {
            ip: serverConfig.ip,
            url: serverConfig.agentNotifier.url,
            port: serverConfig.agentNotifier.port,
        },
        wsServiceConfig: {
            ip: serverConfig.ip,
            url: serverConfig.serviceNotifier.url,
            port: serverConfig.serviceNotifier.port,
        }
    }
    res.set('Content-Type', 'application/json');
    res.status(200).send({ok: true, error: null, data: config});
}