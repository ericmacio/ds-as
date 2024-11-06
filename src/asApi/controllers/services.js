const fsp = require('fs').promises;
const Service = require('../../domain/service');
const { errorCode } = require('./controllers.json');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'ServicesController');

exports.getServices = async(req, res, next) => {
    const caller = 'getServices';
    const userId = req.userId;
    //Update the list of services
    try {
        const result = await Service.getServices(userId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: Service.getServices result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot get services'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot get services'}});
            return;
        }
        const services = result.data;
        res.status(200).send({ok: true, error: null, data: services});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Service.getServices failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Service.getServices failed. Error: ' + error}});
    }
}
exports.postService = async(req, res, next) => {
    const caller = 'postService';
    //Get userId from request
    const userId = req.userId;
    //Create a new service from request body data
    const serviceData = req.body;
    //Check if a config file exist for this service
    if(serviceData.tmpConfigFilePath) {
        //Get config data from tmp file and copy content to database
        try {
            let configData = await fsp.readFile(serviceData.tmpConfigFilePath);
            //Will remove CR/LF before storing into db
            var serviceConfig = JSON.parse(configData);
            logger.log(caller, 'INFO2', 'Config: ' + JSON.stringify(serviceConfig));
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: fsp.readFile failed');
            logger.error(caller, error);
            res.status(400).send({ok: false, error: {msg: 'Error when reading config file'}});
            return;
        }
    }
    //Save new service
    try {
        const result = await Service.saveNewService(userId, serviceData, serviceConfig, serviceData.tmpConfigFilePath);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: Service.saveNewService result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot save services'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot save service'}});
            return;
        } else
            res.status(200).send({ok: true, error: null, data: 'Service created'});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Service.saveNewService failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot save new service'}});
        return;
    }
}
exports.putService = async(req, res, next) => {
    const caller = 'putService';
    //Get userId from request
    const userId = req.userId;
    //Modify an existing service
    var serviceId = req.params['id'];
    //Get service data from request body
    const serviceData = req.body;
    //Check if a new config file exist for this service
    if(serviceData.tmpConfigFilePath) {
        //Get config data from tmp file and copy content to database
        try {
            var configData = await fsp.readFile(serviceData.tmpConfigFilePath);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: fsp.readFile failed');
            logger.error(caller, error);
            res.status(400).send({ok: false, error: {msg: 'Error when reading config file'}});
            return;
        }
        try {
            //Will remove CR/LF before storing into db
            var serviceConfig = JSON.parse(configData);
            logger.log(caller, 'INFO2', 'Config: ' + JSON.stringify(serviceConfig));
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: JSON.parse failed');
            logger.error(caller, error);
            res.status(400).send({ok: false, error: {msg: 'Error when parsing json config file'}});
            return;
        }
    }
    //Update service
    try {
        const result = await Service.updateService(userId, serviceId, serviceData, serviceConfig, serviceData.tmpConfigFilePath);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: Service.updateService result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot update services'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot update service'}});
        } else
            res.status(200).send({ok: true, error: null, data: 'Service updated'});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Service.updateService failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot update service. Error: ' + error}});
        return;
    }
}
exports.deleteService = async(req, res, next) => {
    const caller = 'deleteService';
    //Get userId from request
    const userId = req.userId;
    //Delete an existing service from database
    const serviceId = req.params['id'];
    logger.log(caller, 'DEBUG', 'Delete service. Id: ' + serviceId);
    //Delete it from database content
    try {
        const result = await Service.deleteService(userId, serviceId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: Service.deleteService result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot delete services'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot delete services'}});
            return;
        } else
            res.status(200).send({ok: true, error: null, data: 'Service deleted'});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Service.deleteService failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot delete service'}});
        return;
    }
}
exports.putServiceStatus = async(req, res, next) => {
    const caller = 'putServiceStatus';
    logger.log(caller, 'DEBUG', 'Receive putServiceStatus request');
    //Get userId from request
    const userId = req.userId;
    //Get service id
    const serviceId = req.params['id'];
    //Get new status
    const newStatus = req.body.status;
    //We need to send a status immediately to the console without waiting for the final status
    res.status(202).send({ok: true, error: null, data: {id: serviceId, status: newStatus}});
    //Update service
    try {
        const result = await Service.updateServiceStatus(userId, serviceId, newStatus);
        //Do not send any additional HTTP response message .... Just log errors
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: putServiceStatus result is ko.');
            if(result.error && result.error.status)
                logger.log(caller, 'ERROR', 'ERROR: Cannot update service status. Status: ' + result.error.status);
            else
                logger.log(caller, 'ERROR', 'ERROR: Cannot update service status');
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Service.updateServiceStatus failed');
        logger.error(caller, error);
        return;
    }
}
exports.getServiceConfig = async(req, res, next) => {
    const caller = 'getServiceConfig';
    //Get userId from request
    const userId = req.userId;
    //Get the service config
    const serviceId = req.params['id'];
    try {
        const result = await Service.getServiceConfig(userId, serviceId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: getServiceConfig result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot get service config'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot get service config'}});
        } else
            res.status(200).send({ok: true, error: null, data: result.data});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Service.getServiceConfig failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot get service config. Error: ' + error}});
        return;
    }
}
