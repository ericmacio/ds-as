const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'RunTimeService');
/*--------------------------------------------------------------------------------------------
		RunTimeService
---------------------------------------------------------------------------------------------*/
class RunTimeService {
	constructor(serviceData, sendNotify, proxy) {
        var caller = 'RunTimeService';
        this.status = 'stopped';
        this.sendNotify = sendNotify;
        //Clear current cache content
        delete require.cache[require.resolve('../../apps')];
        delete require.cache[require.resolve('../../apps/' + serviceData.app + '.js')];
        //Get list of current apps
        const Apps = require('../../apps');
        this.app = new Apps[serviceData.app](serviceData, proxy);
        //Set the status notifier for the app service so that it can return error situation
        this.app.setStatusNotifier(this.statusNotifier.bind(this));
        logger.log(caller, 'DEBUG', 'Create new service: ' + this.app.name + ', id: ' + this.app.getServiceId());
	}
    //Set status
	async setStatus(newStatus) {
		var caller = 'setStatus';
        logger.log(caller, 'INFO2', 'set status for ' + this.app.appName + ' service: ' + this.app.name);
        const mustSetStatus = newStatus == 'error' || newStatus != this.status;
        if(mustSetStatus) {
            logger.log(caller, 'INFO1', 'Status has changed: ' + newStatus);
            var result;
            switch(newStatus) {
                case 'starting':
                    try {
                        result = await this.start();
                        if(!result.ok)
                            logger.log(caller, 'DEBUG', 'ERROR: start result is ko');
                    } catch(error) {
                        logger.log(caller, 'ERROR', 'ERROR: start failed');
                        logger.error(caller, error);
                        result = {ok: false};
                    }
                    break;
                case 'stopping':
                    try {
                        result = await this.stop();
                        if(!result.ok)
                            logger.log(caller, 'DEBUG', 'ERROR: stop result is ko');
                    } catch(error) {
                        logger.log(caller, 'ERROR', 'ERROR: stop failed');
                        logger.error(caller, error);
                        result = {ok: false};
                    }
                    break;
                case 'error':
                    try {
                        logger.log(caller, 'INFO0', 'We must set the error status to the service');
                        this.statusNotifier(newStatus)
                    } catch(error) {
                        logger.log(caller, 'ERROR', 'ERROR: stop failed');
                        logger.error(caller, error);
                        result = {ok: false};
                    }
                    break;
                default:
                    logger.log(caller, 'ERROR', 'Unknown status: ' + newStatus);
                    result = {ok: false};
                    break;
            }
            return result;
        } else {
            logger.log(caller, 'WARNING', 'WARNING: status remains unchanged for service ' + this.app.name + ', status: ' + this.status);
            return {ok: true};
        }
	}
	//Start service
	async start() {
        var caller = 'start';
		if(this.status == 'running') {
			logger.log(caller, 'ERROR', 'ERROR: Service already started');
			throw new Error('Service is already running');
		} else {
            logger.log(caller, 'INFO0', 'Start ' + this.app.appName + ' service: ' + this.app.name);
            //First init service. Implemented by App class
            try {
                let result = await this.app.init();
                if(!result.ok) {
                    logger.log(caller, 'ERROR', 'ERROR: service.init result is ko');
                    this.status = 'error';
                    this.notify();
                    return result;
                }
                logger.log(caller, 'DEBUG', 'Init successfully for service ' + this.app.name);
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: service.init failed');
                this.status = 'error';
                this.notify();
                logger.error(caller, error);
                return {ok: false};
            }
            //Now start the service. Call the start entry point of the service
            try {
                //Start service
                this.status = 'running';
                //Send notification to the console
                this.notify();
                logger.log(caller, 'INFO0', 'Service started: ' + this.app.appName + ', name: ' + this.app.name);
                //Start the service (implemented by the service)
                let result = await this.app.start();
                if(!result.ok) {
                    logger.log(caller, 'ERROR', 'ERROR: service.start result is ko');
                    this.status = 'error';
                    //Send notification to the console
                    this.notify();
                    logger.log(caller, 'ERROR', 'ERROR: service ' + this.app.name + ' failed when starting');
                }
                //If service must be stopped automatically ...
                if(result.data && result.data.mustStop)
                    result = await this.stop();
                return result;
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: service ' + this.app.name + ' start failed');
                logger.error(caller, error);
                this.status = 'error';
                this.notify();
                try {
                    let result = await this.stop();
                    if(!result.ok)
                        logger.log(caller, 'INFO2', 'ERROR: this.stop result is ko');
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: this.stop failed');
                    logger.error(caller, error);
                }
                return {ok: false};
            }
		}
	}
	//Stop service
	async stop() {
        var caller = 'stop';
        logger.log(caller, 'INFO1', 'Stop ' + this.app.appName + ' service: ' + this.app.name);
        try {
            //Stop service (implemented by service)
            var result = await this.app.stop();
            if(!result.ok) {
                logger.log(caller, 'ERROR', 'ERROR: service.stop result is ko');
                this.status = 'error';
            } else {
                //Do not override status in case of previous error status
                if(this.status != 'error')
                    this.status = 'stopped';
                //Continue anyway
            }
            logger.log(caller, 'INFO0', 'Service stopped: ' + this.app.appName + ', name: ' + this.app.name + ', status: ' + this.status);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: service.stop failed');
            logger.error(caller, error);
            this.status = 'error';
            this.notify();
            //Continue anyway
        }
        try {
            //Shutdown service. Implemented by App class
            var result = await this.app.shutdown();
            if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: service.shutdown result is ko');
                //Continue anyway
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: service.shutdown failed');
            logger.error(caller, error);
            //Continue anyway
        }
        //Send notification to the console
        this.notify();
        return({ok: (this.status == 'stopped') ? true : false});
	}
	//Notify end of service
	notify() {
		var caller = 'notify';
		logger.log(caller, 'DEBUG', 'Send notify. Status: ' + this.status);
		//Send notify message with new status
		var msg = {
            type: 'NotifyMessage',
            id: this.app.getServiceId(),
			app: this.app.appName,
			name: this.app.name,
			status: this.status
		}
		this.sendNotify(msg);
	}
    //Set a new status and notify cients. Used by app to return new status during execution
	statusNotifier(status) {
		var caller = 'statusNotifier';
        //Update current status with new value
        this.status = status;
		logger.log(caller, 'INFO2', 'Send notify. Status: ' + this.status);
        //Notify clients
		this.notify();
	}
	//Get service info
	get() {
		const caller = 'get';
        logger.log(caller, 'INFO2', 'get ' + this.app.appName + ' service: ' + this.app.name);
        const info = {...this.app.getServiceData(), status: this.status}
        logger.log(caller, 'DEBUG', JSON.stringify(info));
		return {ok: true, data: info};
    }
    //Get service id
	getId() {
        const caller = 'getId';
        return this.app.getServiceId();
    }
    //Get service name
	getName() {
        const caller = 'getName';
        return this.app.name;
    }
    //Get app name
	getAppName() {
        const caller = 'getAppName';
        return this.app.appName;
    }
    //Get owner
	getOwner() {
        const caller = 'getOwner';
        return this.app.getOwner();
    }
    //Get scope
	getScope() {
        const caller = 'getScope';
        return this.app.getScope();
    }
     //Get serviceData
	getServiceData() {
        const caller = 'getServiceData';
        return this.app.getServiceData();
    }
    //Get service config
	getConfig() {
        const caller = 'getConfig';
        return this.app.config;
    }
    //Update service
    updateService(serviceData) {
        const caller = 'updateService';
        //Update app service
        this.app.setService(serviceData);
    }
}
module.exports = RunTimeService;