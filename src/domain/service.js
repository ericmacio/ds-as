const { encrypt, decrypt } = require('../utils/crypto');
const ServiceRepository = require('../repository/services');
const RunTimeService = require('./RunTimeService');
const User = require('./user');
const EventServer = require('../event/EventServer');
const Proxy = require('../proxy/Proxy');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'ServiceDomain');
const { serverConfig } = require('../../config/asApi.json');
const { useProxy } = require('../../config/service.json');
const runTimeServices = {};

const eventServer = new EventServer('Services notification', serverConfig.serviceNotifier.port);
eventServer.start();

var proxy;
//Create and start Proxy if needed
if(useProxy) {
    proxy = new Proxy();
    //Start Proxy
    proxy.start();
    logger.log('Service', 'INFO0', '--- Proxy server started ---');
}
exports.getProxy = () => {
    return proxy;
}
exports.getServices = async(userId) => {
    const caller = 'getServices';
    //Get user properties
    try {
        const userProps = await User.getUserProps(userId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanGetServices = userProps.canGetServices;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanGetServices) {
        const errorMsg = 'Forbidden action. User is not allowed to get services list. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
    try {
        const result = await ServiceRepository.getServices();
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.getServices result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing ServiceRepository'}};
        }
        var services = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.getServices failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    try {
        //Get services allowed for this user
        const result = await getUserServices(userId, services);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: getUserServices result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing ServiceRepository'}};
        }
        const userServices = result.data;
        //Remove private information about this service
        const serviceList = userServices.map(service => {
            return {
                ...service,
                password: null,
                iv: null,
                status: runTimeExists(service.id) ? getServiceStatus(service.id) : 'stopped'
            }
        });
        return{ok: true, data: serviceList};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserServices failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
}
exports.saveNewService = async(userId, serviceData, serviceConfig, serviceConfigFilePath) => {
    const caller = 'saveNewService';
    //Get user properties
    try {
        const userProps = await User.getUserProps(userId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanCreateService = userProps.canCreateService;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanCreateService) {
        const errorMsg = 'Forbidden action. User is not allowed to create any service. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
    //Encrypt password
    if(serviceData.password) {
        try {
            var encryptedData = encrypt(serviceData.password);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: encrypt failed');
            logger.error(caller, error);
            return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
        }
    }
    //Set date
    const creationDate = new Date().getTime();
    //Create service by adding information about config data and config file path
    //Note: only config file path is used so far
    const serviceDataToSave = {
        ...serviceData,
        password: serviceData.password ? encryptedData.content : null,
        iv: serviceData.password ? encryptedData.iv : null,
        creationDate,
        lastModificationDate: creationDate,
        owner: userId, 
        organization: 'Admin', 
        configData: serviceConfig ? JSON.stringify(serviceConfig) : null,
        configFilePath: serviceConfigFilePath ? serviceConfigFilePath:null
    };
    try {
        const result = await ServiceRepository.saveService(serviceDataToSave);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.saveService result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing ServiceRepository'}};
        }
        logger.log(caller, 'INFO0', 'Service saved: ' + serviceDataToSave.name);
        return {ok: true};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.saveService failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
}
exports.deleteService = async(userId, serviceId) => {
    const caller = 'deleteService';
    //Get user rights
    try {
        const result = await userHasRightsOnService(userId, serviceId);
        if(!result.ok) {
            const errorMsg = 'ERROR userHasRightsOnService returned ko. userId: ' + userId;
            logger.log(caller, 'ERROR', errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanDeleteService = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: userHasRightsOnService failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanDeleteService) {
        const errorMsg = 'Forbidden action. Only owner and admin are allowed to delete the service. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
    //Delete the service
    try {
        const result = await ServiceRepository.deleteService(serviceId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.deleteService result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing ServiceRepository'}};
        }
        logger.log(caller, 'INFO0', 'Service deleted');
        return {ok: true};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.deleteService failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
}
exports.updateService = async(userId, serviceId, serviceData, serviceConfig, serviceConfigFilePath) => {
    const caller = 'updateService';
    //Check user rights
    try {
        const result = await userHasRightsOnService(userId, serviceId);
        if(!result.ok) {
            const errorMsg = 'ERROR userHasRightsOnService returned ko. userId: ' + userId;
            logger.log(caller, 'ERROR', errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanModifyService = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanModifyService) {
        const errorMsg = 'Forbidden action. Only owner and admin are allowed to modify the service. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
    //Create service data
    const serviceDataToSave = {...serviceData,
        lastModificationDate: new Date().getTime()
    };
    //Encrypt password if any
    if(serviceData.password) {
        try {
            const encryptedData = encrypt(serviceData.password);
            serviceDataToSave.password = encryptedData.content;
            serviceDataToSave.iv = encryptedData.iv;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: encrypt failed');
            logger.error(caller, error);
            return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
        }
    }
    //Create service by adding information about config data and config file path
    //Note: only config file path is used so far
    if(serviceConfig)
        serviceDataToSave.configData = JSON.stringify(serviceConfig);
    if(serviceConfigFilePath)
        serviceDataToSave.configFilePath = serviceConfigFilePath;   
    //Save service data into repository
    try {
        const result = await ServiceRepository.updateService(serviceId, serviceDataToSave);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.saveService result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing ServiceRepository'}};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.saveService failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    //Delete current runtime service if exists
    if(runTimeExists(serviceId)) {
        //A run time service already exists
        if(runTimeCanBeDeleted(serviceId)) {
            //Delete current entry
            logger.log(caller, 'INFO0', 'Delete current run-time service: ' + serviceDataToSave.name);
            delete runTimeServices[serviceId];
        } else {
            //Invalid entry only
            logger.log(caller, 'INFO0', 'Current run-time service cannot be deleted. Unvalidate it: ' + serviceDataToSave.name);
            runTimeServices[serviceId].modified = true;
        }
    } 
    logger.log(caller, 'INFO0', 'Service updated: ' + serviceDataToSave.name);
    return {ok: true};
}
exports.updateServiceStatus = async(userId, serviceId, newStatus) => {
    const caller = 'updateServiceStatus';
    logger.log(caller, 'DEBUG', 'updateServiceStatus called');
    //Check user rights
    try {
        const result = await userHasRightsOnService(userId, serviceId);
        if(!result.ok) {
            const errorMsg = 'ERROR userHasRightsOnService returned ko. userId: ' + userId;
            logger.log(caller, 'ERROR', errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        const userCanModifyServiceStatus = result.data;
        if(!userCanModifyServiceStatus) {
            const errorMsg = 'Forbidden action. Only owner and admin are allowed to start / stop the service. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
            //Force service status to error to get out from starting state.
            //Dont return and let the runTime service notify the console about the error status
            newStatus = 'error';
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    var runTimeService;
    //First check if a runtime service already exists for this serviceId and can be used
    if(runTimeCanBeUsed(serviceId)) {
        //Service run time already exist and can be used
        //If service is already running we must be able to stop it with the same runtime instance
        logger.log(caller, 'INFO0', 'Run-time service already exists and can be used. Current status: ' + getServiceStatus(serviceId));
        runTimeService = runTimeServices[serviceId].service;
    } else {
        //Delete current runtime if exists
        if(runTimeCanBeDeleted(serviceId)) {
            logger.log(caller, 'INFO0', 'Delete unvalid run-time service');
            delete runTimeServices[serviceId];
        }
        //We must create a new active service
        logger.log(caller, 'INFO0', 'Create new run-time service');
        //Get service from repository
        try {
            const result = await ServiceRepository.getService(serviceId);
            if(!result.ok) {
                logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.getService result is ko.');
                return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing ServiceRepository'}};
            }
            var serviceDbData = result.data;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.getService failed');
            logger.error(caller, error);
            return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
        }
        //Decrypt password
        if(serviceDbData.password) {
            //Decode password
            const decryptedPassword = decrypt( { content: serviceDbData.password, iv: serviceDbData.iv });
            serviceDbData.password = decryptedPassword;
        }
        //Create new instance of stateful service
        runTimeService = new RunTimeService(serviceDbData, sendNotify, proxy);
        //Put this instance into run-time services list
        runTimeServices[serviceId] = {
            service: runTimeService,
            modified: false
        };
    }
    //now update current service status with new status
    try {
        //Update runtime service status
        const result = await runTimeService.setStatus(newStatus);
        if(!result.ok)
            logger.log(caller, 'DEBUG', 'ERROR: runTimeService.setStatus result is ko');
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: runTimeService.setStatus failed');
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    //Previous call may never return ....
    return {ok: true};
}
exports.getServiceConfig = async(userId, serviceId) => {
    const caller = 'getServiceConfig';
    try {
        const result = await ServiceRepository.getServiceConfig(serviceId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.getServiceConfig result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing ServiceRepository'}};
        }
        return {ok: true};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.getServiceConfig failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
}
exports.appHasChanged = async({ name, color}) => {
    const caller = 'appHasChanged';
    //Parse current runtime service to notify about the change
    for(let key in runTimeServices) {
        const runTimeService = runTimeServices[key].service;
        if(runTimeService.getAppName() == name) {
            logger.log(caller, 'INFO0', 'Set runtime service to modified: ' + runTimeService.getName());
            runTimeServices[key].modified = true;
        }
    }
    //We must also update services in database about changes that impact services (i.e. color)
    //Get the list of services from repository
    try {
        const result = await ServiceRepository.getServices();
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.getServices result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing ServiceRepository'}};
        }
        var services = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.getServices failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    //Filter impacted services and created new list with updated values
    const newServices = services.filter(service => service.app == name).map(service => {return {id: service.id, name: service.name, color: color}});
    logger.log(caller, 'INFO2', 'newServices length: ' + newServices.length);
    //Save all impacted services into repository
    const updateServiceFunct = newServices.map(async(service) => {
        try {
            const result = await ServiceRepository.updateService(service.id, service);
            if(!result.ok)
                logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.saveService result is ko.');
            else
                logger.log(caller, 'INFO1', 'Service saved: ' + service.name);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.saveService failed');
            logger.error(caller, error);
            return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
        }
        return {ok: true};
    });
    try {
        const resultList = await Promise.all(updateServiceFunct);
        //Now check the global status
        const allOk = resultList.find(result => !result.ok) ? false : true;
        if(!allOk)
            logger.log(caller, 'ERROR', 'ERROR: updateServiceFunct result is ko');
        return {ok: allOk};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for updateServiceFunct. ' + error);
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
}
const getUserServices = async (userId, services) => {
    const caller = 'getUserServices';
    try {
        const userProps = await User.getUserProps(userId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        } else {
            //Filter services only allowed for this user
            const userServiceList =  userProps.canGetServices ? 
                services : 
                services.filter(service => (service.owner == userId || service.scope == 'public'));
            return {ok: true, data: userServiceList};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false}
    }
}
const userHasRightsOnService = async (userId, serviceId) => {
    const caller = 'userHasRightsOnService';
    //Get user properties
    try {
        var userProps = await User.getUserProps(userId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false}
    }
     //Check user can modify the service
     try {
        const result = await ServiceRepository.getService(serviceId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.getService result is ko.');
            return {ok: false};
        }
        const service = result.data;
        const userHasRights = (service.owner == userId || userProps.isAdminOrManager);
        return {ok: true, data: userHasRights};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: ServiceRepository.getService failed');
        logger.error(caller, error);
        return {ok: false};
    }
}
const sendNotify = (msg) => {
    const caller = 'sendNotify';
    //This will be used by all service to send their current status to the console
    msg.type = 'NotifyMessage';
    eventServer.sendMsgToClient(msg);
}
const runTimeExists = (serviceId) => {
    const caller = 'runTimeExists';
    return (serviceId in runTimeServices);
}
const runTimeCanBeUsed = (serviceId) => {
    const caller = 'runTimeCanBeUsed';
    if(runTimeExists(serviceId) && runTimeServices[serviceId].service) {
        const currStatus = getServiceStatus(serviceId);
        //If service is currently running we must be able to stop the current runtime instance
        //Otherwise check service has not be modified
        return (!runTimeServices[serviceId].modified || (currStatus == 'running' || currStatus == 'starting' || currStatus == 'stopping'));
    } else
        return false;
}
const getServiceStatus = (serviceId) => {
    const caller = 'getServiceStatus';
    if(runTimeExists(serviceId) && runTimeServices[serviceId].service)
        return runTimeServices[serviceId].service.status;
    else {
        logger.log(caller, 'ERROR', 'ERROR: Service undefined. Cannot get status');
        return null;
    }
}
const runTimeCanBeDeleted = (serviceId) => {
    const caller = 'runTimeCanBeDeleted';
    if(runTimeExists(serviceId) && runTimeServices[serviceId].service) {
        const currStatus = getServiceStatus(serviceId);
        return (currStatus != 'starting' && currStatus != 'running' && currStatus != 'stopping');
    } else
        return false;
}