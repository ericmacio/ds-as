const ServiceDb = require('./models/service');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'ServicesRepository');

exports.getServices = async() => {
    const caller = 'getServices';
    try {
        var servicesDb = await ServiceDb.find({}, null);
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: ServiceDb.find failed');
        logger.error(caller, error);
        return{ok: false};
    }
    const services = []
    for(let index=0; index<servicesDb.length; index++) {
        //We need to create a service instance from database content. Don't remove this ....
        //First parse configData
        if(servicesDb[index].configData) {
            try {
                var configData = JSON.parse(servicesDb[index].configData);
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: JSON.parse config failed for service: ' + servicesDb[index].name + '. '  + error);
                logger.error(caller, error);
                return{ok: false};
            }
        } else
            var configData = {};
        services.push(setService(servicesDb[index], configData));
    }
    return {ok: true, data: services};
}
exports.saveService = async(serviceData) => {
    const caller = 'saveService';
    const serviceDb = new ServiceDb(serviceData);
    //Save new service into database
    try {
        await serviceDb.save();
        return {ok: true};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: serviceDb.save failed');
        logger.error(caller, error);
        return {ok: false};
    }
}
exports.updateService = async(serviceId, serviceData) => {
    const caller = 'updateService';
    //Update the existing service with new values
    try {
        await ServiceDb.updateOne({_id: serviceId}, {...serviceData});
        return {ok: true};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: ServiceDb.updateOne failed');
        logger.error(caller, error);
        return {ok: false};
    }
}
exports.getService = async(serviceId) => {
    const caller = 'getService';
    //Get service from database
    try {
        const serviceDbData = await ServiceDb.findById(serviceId);
        if(serviceDbData.configData) {
            try {
                var configData = JSON.parse(serviceDbData.configData);
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: JSON.parse config failed for service: ' + serviceDbData.name + '. '  + error);
                logger.error(caller, error);
                return{ok: false};
            }
        } else
            var configData = {};
        const serviceData = setService(serviceDbData, configData);
        return {ok: true, data: serviceData};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: ServiceDb.findById failed');
        logger.error(caller, error);
        return {ok: false};
    }
}
exports.deleteService = async(serviceId) => {
    const caller = 'deleteService';
    //Delete service from database
    try {
        await ServiceDb.findByIdAndDelete(serviceId);
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: ServiceDb.findByIdAndDelete failed');
        logger.error(caller, error);
        return {ok: false}
    }
    return {ok: true};
}
setService = (serviceData, configData) => {
    const caller = 'setService';
    const service = {
        id: serviceData._id.toString(),
        app: serviceData.app,
        name: serviceData.name,
        apiUrl: serviceData.apiUrl,
        apiPort: serviceData.apiPort,
        user: serviceData.user,
        password: serviceData.password,
        iv: serviceData.iv,
        color: serviceData.color,
        configData: configData,
        configFileName: serviceData.configFileName,
        configFilePath: serviceData.configFilePath,
        group: serviceData.group ? serviceData.group : null,
        owner: serviceData.owner,
        creationDate: serviceData.creationDate,
        organization: serviceData.organization,
        scope: serviceData.scope ? serviceData.scope : null,
        lastModificationDate: serviceData.lastModificationDate
    };
    return service;
}
