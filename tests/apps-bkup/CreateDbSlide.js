const fs = require('fs');
const util = require('util');
const App = require('../src/apps/App');
const ScanXls = require('../src/utils/scanXls');
const pluginDefault = 'appsData/DbToSlide/plugin_default.js';
const dbDataStorePath = 'appsData/DbToSlide/Storage/';
const dbDataStoreFile = 'dbDataStore.json';
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'CreateDbSlide');
/*--------------------------------------------------------------------------------------------
		CreateDbSlide
---------------------------------------------------------------------------------------------*/
class CreateDbSlide extends App {
    constructor(data, proxy) {
        super(data, proxy);
        this.status = 'stopped';
    }
	//Start service
	async start() {
        var caller = 'start';
        this.isStopped = false;
        this.isStopping = false;
        logger.log(caller, 'INFO0', 'Starting service');
        //Check XLS dataConnector has been specified
        if(!this.config.dataConnectors.Xls1) {
            logger.log(caller, 'ERROR', 'Xls1 dataConnector undefined');
            this.status = 'error';
            throw new Error('Xls1 DataConnector missing in service configuration');
        }
        //Set const value
        this.storeFilePath = dbDataStorePath + this.config.prefix + dbDataStoreFile;
        this.slidePrefix = this.config.prefix + this.config.slideName + '_';
        //Set plugin for customized processing of db and slide data
        const pluginFile = (this.config.plugin) ? this.config.plugin : pluginDefault;
        //Add plugin definitions
        const Plugin = require(pluginFile);
        //Create plugin instance
        this.plugin = new Plugin(this.api, this.config, this.logger);
        //All dataConnectors have been created at this stage
        //implement service processing here ...
        //Start service processing
        this.mustRun = true;
        //We must delete local storage so that all slides will be build according to current db content if changed
        //Indeed this one may have change since service has been stopped
        //Storage will be then rebuild
        //Set starting state
        this.justStarted = true;
        //Delete local storage
        const unlink = util.promisify(fs.unlink);
        try {
            await unlink(this.storeFilePath);
        } catch(error) {
            logger.log(caller, 'DEBUG', 'unlink failed: ' + error);
            //Continue anyway. File may not yet exist
        }
        logger.log(caller, 'INFO0', 'Data storage have been reset');
        if(!this.dataConnectorList.Xls1) {
            logger.log(caller, 'ERROR', 'ERROR: dataConnectorList.Xls1 is undefined');
            this.status = 'error';
            throw new Error('Cannot create ScanXls');
        }
        //Force callback even if no change as we need to allways store data in case of move only in database
        //This is important as slide deletion is based on its id (position in the db data list)
        //If the id has changed since then we will not be able to delete the right slide
        this.config.forceOnChange = true;
        this.status = 'running';
        //Create scan xls service by provinding it with the appropriate dataCollector (Xls1)
        this.scanService = new ScanXls(this.api, this.proxy, this.config, this.dataConnectorList.Xls1, this.onChange.bind(this));
        try {
            let result = await this.scanService.startService();
            logger.log(caller, 'INFO1', 'scanService.startService returned: ' + JSON.stringify(result));
            //Let service running until it stops
            //We will be informed of any change in the db data thanks to the call of onChange method
            if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: scanService.startService result is ko');
                this.status = 'error';
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: scanService.startService failed');
            logger.error(caller, error);
            this.status = 'error';
        } finally {
            //Stop the service if not yet stopped
            if(!this.isStopped && !this.isStopping) {
                try {
                    let result = await this.stop();
                    if(!result.ok)
                        logger.log(caller, 'DEBUG', 'ERROR: stop result is ko');
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: stop failed');
                    logger.error(caller, error);
                    this.status = 'error';
                }
            }
            return {ok: (this.status == 'error') ? false : true};
        }
    }
    //Stop service
	async stop() {
        var caller = 'stop';
        logger.log(caller, 'INFO2', 'Stopping service');
        this.mustRun = false;
        this.isStopping = true;
        try {
            let result = await this.scanService.stopService();
            if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: scanService.stopService result is ko');
                this.status = 'error';
            }
            /*
            try {
                let result = await this.waitScanServiceStopped();
                if(!result.ok) {
                    logger.log(caller, 'DEBUG', 'ERROR: waitScanServiceStopped result is ko');
                    this.status = 'error';
                }
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: waitScanServiceStopped failed');
                logger.error(caller, error);
                this.status = 'error';
            }
            */
            this.isStopped = true;
            this.isStopping = false;
            if(this.status != 'error')
                this.status = 'stopped';
            logger.log(caller, 'INFO0', 'Service stopped. Status: ' + this.status);
            return {ok: (this.status == 'error') ? false : true};
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: scanService.stopService failed');
            logger.error(caller, error);
            this.status = 'error';
            return {ok: false};
        }
    }
    //waitScanServiceStopped
    async waitScanServiceStopped() {
        var caller = 'waitScanServiceStopped';
        async function wait (timeout) {
			return await new Promise((resolve) => {setTimeout(() => {resolve()}, timeout * 1000);});
        }
        //Wait until scan service is not running any more or exit after 10 retries
		const MAX_RETRIES = 20;
		var retry = 0;
		logger.log(caller, 'INFO1', 'Waiting for end of scanning ...');
		while(this.scanService.running && (retry < MAX_RETRIES)) {
            //const timeout = Math.pow(2, retry);
            const timeout = 3;
			logger.log(caller, 'INFO2', 'Not stopped yet. Retry in ' + timeout + 's ...');
            retry++;
            try {
                await wait(timeout);
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: wait failed');
                logger.error(caller, error);
                this.status = 'error';
            }
        }
        if(this.scanService.running)
			logger.log(caller, 'ERROR', 'ERROR: Scanning cannot be stopped'); 
		return {ok: !this.scanService.running};
    }
    //getDbDataFromStore
    async getDbDataFromStore() {
        var caller = 'getDbDataFromStore';
        //Just return if first start as no storage exists yet (deleting during the starting process)
        if(this.justStarted)
            return {ok: true};
        //Read previous data from storage
        const readFile = util.promisify(fs.readFile);
        try {
            var fileDbData = await readFile(this.storeFilePath);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: readFile failed: ' + error);
            throw new Error('Cannot read db data from storage');
        }
        //Parse json data from storage
        try {
            var storeDbData = JSON.parse(fileDbData);
        } catch (error) {
            logger.log(caller, 'ERROR', 'ERROR: JSON.parse failed. ERROR: ' + error);
            throw new Error('Cannot parse stored data');
        }
        return {ok: true, data: storeDbData};
    }
    //storeDbData
    async storeDbData(dbDataList) {
        var caller = 'storeDbData';
        //Store data into file
        //Read previous data from storage
        const writeFile = util.promisify(fs.writeFile);
        try {
            await writeFile(this.storeFilePath, JSON.stringify(dbDataList));
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: writeFile failed: ' + error);
            throw new Error('Cannot store db data to storage');
        }
        return {ok: true};
    }
    //onChange
    async onChange(dbDataList, prevDbDataList) {
        var caller = 'onChange';
        //We forced to be called even if data have not been updated. We need to update local storage anyway if id have changed
        //UpdateSlides
        this.updateSlides = async() => {
            //Delete all slides in the toBeDeleted list
            if(this.toBeDeleted.length > 0) {
                logger.log(caller, 'INFO0', 'Deleting slides ...');
                try {
                    let result = await this.api.utils.deleteMedias(this.toBeDeleted);
                    if(!result.ok) {
                        logger.log(caller, 'WARNING', 'WARNING: Error during deleting process. Continue anyway');
                        //Keep going. Slides may not exist yet
                    }
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: this.api.utils.deleteMedias failed');
                    logger.error(caller, error);
                    this.status = 'error';
                    return {ok: false};
                }
            }
            //Publish slides
            if(this.publishDataList.length > 0) {
                logger.log(caller, 'INFO0', 'Publishing new slides ...');
                try {
                    let result = await this.api.utils.publishSlides(this.publishDataList);
                    if(!result.ok) {
                        this.status = 'error';
                        logger.log(caller, 'DEBUG', 'ERROR: this.api.utils.publishSlides result is ko');
                        return {ok: false, data: {mustStop: true}};
                    }
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: this.api.utils.publishSlides failed');
                    logger.error(caller, error);
                    this.status = 'error';
                    return {ok: false, data: {mustStop: true}};
                }
            }
            //Store new data
            logger.log(caller, 'INFO0', 'Storing new data ...');
            try {
                let result = await this.storeDbData(this.dbDataList);
                if(!result.ok) {
                    this.status = 'error';
                    logger.log(caller, 'DEBUG', 'ERROR: storeDbData result is ko');
                    return {ok: false, data: {mustStop: true}};
                }
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: storeDbData failed');
                logger.error(caller, error);
                this.status = 'error';
                return {ok: false, data: {mustStop: true}};
            }
            logger.log(caller, 'INFO0', 'Processing completed');
            return {ok: true};
        }
        var mustStop = false;
        if(this.status != 'running') {
            //We must stop here ...
            logger.log(caller, 'INFO0', 'Status is ' + this.status + ', we must stop');
            try {
                let result = await this.stop();
                if(!result.ok)
                    logger.log(caller, 'DEBUG', 'ERROR: stop result is ko');
                return result;
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: stop failed');
                logger.error(caller, error);
                return {ok: false};
            }
        }
        //Initialize local instance of db data list
        this.dbDataList = dbDataList;
        //Create list of slides to be deleted
        this.toBeDeleted = [];
        //Create list of slide data to be created
        this.publishDataList = [];
        logger.log(caller, 'INFO0', 'onChange called. Start processing ...');
        logger.log(caller, 'DEBUG', JSON.stringify(this.dbDataList));
        this.mustDeleteAllSlides = false;
        var storageError = false;
        var storeDbDataList = [];
        //Get last storage of db data
        try {
            let result = await this.getDbDataFromStore();
            if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: getDbDataFromStore result is ko');
                storageError = true;
            } else
                storeDbDataList = result.data;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: getDbDataFromStore failed');
            logger.error(caller, error);
            return {ok: false};
        }
        //Build the whole set of slides if just started, or cannot get storage, or previous list is empty
        if(this.justStarted || storageError || (prevDbDataList.length == 0)) {
            //Make sure all previous slides will be deleted
            this.mustDeleteAllSlides = true;
            //Set starting status accordingly
            this.justStarted = false;
            //Clear previous data list
            storeDbDataList = [];
            //Set all data to new so that slides will be created again
            for(var id=0; id<this.dbDataList.length; id++)
                this.dbDataList[id].PRV_new = true;
        }
        //First update db data and stored db data by calling local plugin processing function
        try {
            let result = await this.plugin.dbData(this.dbDataList, storeDbDataList, prevDbDataList);
            if(!result.ok) {
                this.status = 'error';
                logger.log(caller, 'DEBUG', 'ERROR: this.plugin.dbData result is ko');
                mustStop = true;
            } else {
                this.dbDataList = result.data.dbDataList;
                storeDbDataList = result.data.storeDbDataList;
                var templateMatrix = result.data.templateMatrix;
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: this.plugin.dbData failed');
            logger.error(caller, error);
            mustStop = true;
        }
        if(!mustStop) {
            //Parse new db data to create slide data to be published
            //This part must be synchronous ....
            var playlistIdMap = new Map();
            for(var id=0; id<this.dbDataList.length; id++) {
                var dbData = this.dbDataList[id];
                logger.log(caller, 'DEBUG', 'Data Id: ' + id);
                //We should skip data with empty name cell ....
                if(dbData.PRV_new || this.config.forceUpdate) {
                    //The data has changed for this slide. So update it
                    //Assign a name to this new slide
                    dbData.PRV_slideName = this.slidePrefix + Math.floor(Math.random() * 10000);
                    logger.log(caller, 'INFO1', 'Updating slide: ' + dbData.PRV_slideName + ' ...');
                    //Create template data for this slide
                    var templateData = new Object();
                    //Parse slide data
                    for(var key in dbData) {
                        //Set value to all template field if specified in dbData
                        //Check if key is used as template's field data
                        if(key in templateMatrix) {
                            //Get the element from the template matrix
                            var keyTemplateElement = templateMatrix[key];
                            logger.log(caller, 'INFO2', 'Use ' + key + ' with value: ' + dbData[key]);
                            //Set template field type and value
                            templateData[keyTemplateElement.name] = {
                                type: keyTemplateElement.type,
                                value: dbData[key]
                            };
                            logger.log(caller, 'INFO2', 'Slide data. Key: ' + keyTemplateElement.name + ', type: ' + templateData[keyTemplateElement.name].type + ', value: ' + templateData[keyTemplateElement.name].value);
                        }
                    }
                    //Make sure template is different for each slide to be created simultaneously .... (API limitation)
                    var templateName = (dbData.PRV_template) ? dbData.PRV_template : this.config.template + id;
                    //If playlist has been set specifically for this data use it otherwise use the default configured one
                    var playlist = (dbData.PRV_playlist) ? dbData.PRV_playlist : this.config.playlist;
                    //Get playist id if not yet stored
                    if(!playlistIdMap.has(playlist)) {
                        try {
                            let result = await this.api.playlist.getId({name: playlist});
                            if(!result.ok)
                                logger.log(caller, 'DEBUG', 'ERROR: api.playlist.getId result is ko');
                            var playlistId = result.data;
                            logger.log(caller, 'INFO2', 'Add playlistId: ' + playlistId);
                            playlistIdMap.set(playlist, playlistId);
                        } catch(error) {
                            logger.log(caller, 'ERROR', 'ERROR: api.playlist.getId failed');
                            logger.error(caller, error);
                            return {ok: false};
                        }
                    } else
                        var playlistId = playlistIdMap.get(playlist);
                    //Create new publish data fro slide creation and playlist publishing
                    var publishData = {
                        playlist: playlist,
                        playlistId: playlistId,
                        slideData: {name: dbData.PRV_slideName, template: templateName, slideData: templateData}
                    }
                    //Put new publish data into list
                    this.publishDataList.push(publishData);  
                } else {
                    //The slide is not new so no need to create slide
                    logger.log(caller, 'INFO2', 'PRV_prevId: ' + dbData.PRV_prevId);
                    //Set slide name from storage previous data to db data before saving it again into storage
                    dbData.PRV_slideName = storeDbDataList[dbData.PRV_prevId].PRV_slideName;
                    logger.log(caller, 'INFO1', 'No change for slide: ' + dbData.PRV_slideName + ', id: ' + id);
                }
            }
            //Call post processing of slide data before creating and publishing them
            try {
                let result = await this.plugin.publishData(this.publishDataList);
                if(!result.ok) {
                    this.status = 'error';
                    logger.log(caller, 'DEBUG', 'ERROR: plugin.publishData result is ko');
                    try {
                        let result = await this.stop();
                        if(!result.ok)
                            logger.log(caller, 'DEBUG', 'ERROR: stop result is ko');
                    } catch(error) {
                        logger.log(caller, 'ERROR', 'ERROR: stop failed');
                        logger.error(caller, error);
                        return {ok: false};
                    }
                }
                this.publishDataList = result.data;
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: plugin.publishData failed');
                logger.error(caller, error);
                return {ok: false};
            }
            //Now we must delete older slides if needed and create the new ones
            if(this.mustDeleteAllSlides) {
                //We must delete all previous slides
                //This can be done asynchronously. Just for cleanup
                //Get the list of slides from the server containing the slide prefix
                try {
                    let result = await this.api.slide.list({attributes: {title: this.slidePrefix, text: this.slidePrefix}});
                    if(!result.ok) {
                        logger.log(caller, 'DEBUG', 'ERROR: api.slide.list result is ko');
                        return result;
                    }
                    var slideList = result.data;
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: api.slide.list failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                var user = this.api.utils.getUser();
                logger.log(caller, 'INFO2', 'User: ' + user);
                //Build the list of slides to be deleted
                for(var id=0; id<slideList.length; id++) {
                    //Double check name before deleting
                    //We also check we are the owner of the file
                    if((slideList[id].title.indexOf(this.slidePrefix) == 0) 
                        && (slideList[id].propertyUsername == user)) {
                        //Add slide name to the list
                        this.toBeDeleted.push(slideList[id].title);
                        logger.log(caller, 'INFO1', 'Slide will be deleted: ' + slideList[id].title);
                    }
                }
            } else {
                //Build the list of slides to be deleted
                //Parse all previous slide data
                for(var id=0; id<storeDbDataList.length; id++) {
                    if(storeDbDataList[id].PRV_deleted || this.config.forceUpdate) {
                        //This slide must be deleted
                        //Get slide name and add it to the list
                        var slideName = storeDbDataList[id].PRV_slideName;
                        this.toBeDeleted.push(slideName);
                        logger.log(caller, 'INFO1', 'Slide will be deleted: ' + slideName);
                    }
                }
            }
            //Now create new slides
            try {
                let result = await this.updateSlides();
                if(!result.ok) {
                    logger.log(caller, 'DEBUG', 'ERROR: updateSlides result is ko');
                    mustStop = result.data.mustStop;
                }
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: updateSlides failed');
                logger.error(caller, error);
                return {ok: false};
            }
        }
        if(mustStop)
            //Return right now from the update process so that the caller will be informed at once
            return {ok: false};
        else if(this.mustRun) return {ok: true}; //Go back to scanning process
    }
}
module.exports = CreateDbSlide;