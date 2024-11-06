const fs = require('fs');
var util = require('util');
const Graph = require('../../utils/Graph');
const Logger = require('../../utils/logger');
const logger = new Logger(__filename, 'plugin_dbToSlide2');
const pluginConfig = require('./plugin_dbToSlide2.json');
class Plugin {
    constructor(api, config) {
        this.api = api;
        this.config = config;
    }
    async dbData(dbDataList, storeDbDataList, prevDbDataList) {
        var caller = 'dbData';
        //We will calculate the total amount per month per category and change the db data accordingly
        //Graph will only be build using total amount per month for each category
        //Set the list of categories we want to deal with
        const categorySet = ["Ski", "Golf", "Bike"]
        //Create new dbDataList
        var newDbDataList = [];
        if(pluginConfig.graphList.length == 0) {
            //Just return
            logger.log(caller, 'INFO0', 'Graph list is empty. Do nothing');
            return {ok: true, data: {dbDataList: dbDataList, storeDbDataList: storeDbDataList, templateMatrix: templateMatrix}};
        }
        //Create array of object for new data
        var graphDbDataList = [];
        //First fill category value in new db data list
        for(var id=0; id<categorySet.length; id++) {
            graphDbDataList[id] = new Object();
            graphDbDataList[id].Category = categorySet[id];
        }
        //Now set the total value per category for each month
        var totalPerMonth = new Object;
        for(var id=0; id<pluginConfig.datasetKeyList.length; id++) {
            var month = pluginConfig.datasetKeyList[id];
            logger.log(caller, 'DEBUG', 'Month: ' + month);
            totalPerMonth[month] = new Object;
            //Init total per month for each category
            for(var i=0; i<categorySet.length; i++)
                totalPerMonth[month][categorySet[i]] = 0;
            for(var dataId=0; dataId<dbDataList.length; dataId++) {
                var category = dbDataList[dataId].Category;
                var value = parseInt(dbDataList[dataId][month], 10);
                totalPerMonth[month][category] += value;
                logger.log(caller, 'DEBUG', 'Category: ' + category + ', Value: ' + value);
            }
        }
        //Fill new db data with total value per category per month
        for(var id=0; id<categorySet.length; id++) {
            var category = categorySet[id];
            for(var monthId=0; monthId<pluginConfig.datasetKeyList.length; monthId++) {
                var month = pluginConfig.datasetKeyList[monthId];
                //Set total per month for each category
                graphDbDataList[id][month] = totalPerMonth[month][category];
                logger.log(caller, 'DEBUG', 'totalPerMonth for ' + category + ' on ' + month + ': ' + graphDbDataList[id][month]);
            }
        }
        var templateMatrix = this.config.templateMatrix;
        var nbGraph = 0;
        const createGraphImg = async(graphConfig, graphDbDataList) => {
            try {
                var graph = new Graph(pluginConfig.datasetKeyList, pluginConfig.labelRef);
                var imagePng = await graph.create(graphConfig, graphDbDataList);
                logger.log(caller, 'INFO2', 'Graph created: ' + graphConfig.name);
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: graph.create failed');
                logger.error(caller, error);
                return {ok: false};
            }
            //Write graph to file
            const writeFile = util.promisify(fs.writeFile);
            try {
                await writeFile(graphConfig.graphFile, imagePng);
                logger.log(caller, 'INFO1', 'Image created: ' + graphConfig.graphFile);
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: writeFile failed');
                logger.error(caller, error);
                return {ok: false};
            }
            //Fill slide data with graph data
            newDbDataList[nbGraph++] = {
                Image: graphConfig.graphFile,
                Text: new Date().toLocaleTimeString()
            }
            return {ok: true};
        }
        var createGraphFunct = [];
        //Parse all graphs from config
        for(let id=0; id<pluginConfig.graphs.length; id++) {
            var graphConfig = pluginConfig.graphs[id];
            if(pluginConfig.graphList.indexOf(graphConfig.name) >= 0)
                createGraphFunct.push(createGraphImg(graphConfig, graphDbDataList));
        }
        try {
			const resultList = await Promise.all(createGraphFunct);
			//Now check the global status
			var allOk = true;
			for(let id=0; id<resultList.length; id++) {if(!resultList[id].ok) {logger.log(caller, 'ERROR', 'ERROR: createGraphImg result is ko'); allOk = false;}};
			if(!allOk) return {ok: false};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for createGraphFunct. ' + error);
			logger.error(caller, error);
			return {ok: false};
		}
        return {ok: true, data: {dbDataList: newDbDataList, storeDbDataList: storeDbDataList, templateMatrix: templateMatrix}};
    }
    async publishData(publishDataList) {
        var caller = 'publishData';
        //No change is needed. Return data as they are
        return {ok: true, data: publishDataList};
    }
}
module.exports = Plugin;