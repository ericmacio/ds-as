const fs = require('fs');
var util = require('util');
const Graph = require('../../utils/Graph');
const Logger = require('../../utils/logger');
const logger = new Logger(__filename, 'plugin_dbToSlide3');
const pluginConfig = require('./plugin_dbToSlide3.json');
class Plugin {
    constructor(api, config, logger) {
        this.api = api;
        this.config = config;
        this.logger = logger;
        this.categoryDataSet = {
            'Ski': {
                Background: {type: 'img', value: 'medias/backgrounds/ski1.jpg'}
            },
            'Golf': {
                Background: {type: 'img', value: 'medias/backgrounds/golf1.jpg'}
            },
            'Bike': {
                Background: {type: 'img', value: 'medias/backgrounds/bike1.jpg'}
            }
        }
    }
    async dbData(dbDataList, storeDbDataList, prevDbDataList) {
        var caller = 'dbData';
        //We will calculate the total amount per category and find the biggest value
        //We will then build a new database with only the values per month of this category
        //The graph will be then build on this unique category
        //Create new dbDataList
        var newDbDataList = [];
        if(pluginConfig.graphList.length == 0) {
            //Just return
            logger.log(caller, 'INFO0', 'Graph list is empty. Do nothing');
            return {ok: true, data: {dbDataList: dbDataList, storeDbDataList: storeDbDataList, templateMatrix: templateMatrix}};
        }
        //Create array of object for new data
        var graphDbDataList = [];
        //Create and init the total value per category to find the biggest one
        var totalPerCategory = new Object;
        for(var key in this.categoryDataSet)
            totalPerCategory[key] = 0;
        //Calculate the total for each category
        for(var dataId=0; dataId<dbDataList.length; dataId++) {
            var category = dbDataList[dataId].Category;
            for(var id=0; id<pluginConfig.datasetKeyList.length; id++) {
                var month = pluginConfig.datasetKeyList[id];
                var value = parseInt(dbDataList[dataId][month], 10);
                totalPerCategory[category] += value;
            }
        }
        //Look for the max value beetween categories
        this.maxValue = 0;
        this.maxCategory = 'undefined';
        //Parse each category and find the biggest value
        for(var key in totalPerCategory) {
            logger.log(caller, 'INFO2', 'Category: ' + key + ', total: '+ totalPerCategory[key]);
            if(totalPerCategory[key] > this.maxValue) {
                this.maxValue = totalPerCategory[key];
                this.maxCategory = key;
            }
        }
        logger.log(caller, 'INFO2', 'maxValue: ' + this.maxValue);
        logger.log(caller, 'INFO2', 'maxCategory: ' + this.maxCategory);
        //Create array of object for the new db data
        //Now set the new db data with only the value for the category with the biggest total
        var graphDbDataList = [];
        for(var dataId=0; dataId<dbDataList.length; dataId++) {
            var category = dbDataList[dataId].Category;
            if(category == this.maxCategory)
                graphDbDataList.push(dbDataList[dataId]);
        }
        //Now update the variable with information about top values. Warning tese are asynchronous requests
        logger.log(caller, 'INFO2', 'maxValue: ' + this.maxValue);
        logger.log(caller, 'INFO2', 'Top sales department: ' + this.maxCategory);
        try {
            var var4 = {name: 'as-demo-var4', value: 'Top sales department: ' + this.maxCategory};
            await this.api.variable.modify(var4);
            var var5 = {name: 'as-demo-var5', value: 'Total sales in 2019: ' + this.maxValue + ' !'};
            await this.api.variable.modify(var5);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: api.variable.modify failed');
            logger.error(caller, error);
            return {ok: false};
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
                Text: new Date().toLocaleTimeString(),
                PRV_template: this.config.template
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
        for(var id=0; id<publishDataList.length; id++) {
            var slideData = publishDataList[id].slideData.slideData;
            slideData.Title = {type: 'text', value: 'Top sales department in FY 2019: ' + this.maxCategory};
            slideData.Text1 = {type: 'text', value: 'Total sales in FY 2019: ' + this.maxValue + ' !'};
            slideData.Background = this.categoryDataSet[this.maxCategory].Background;
            logger.log(caller, 'INFO2', 'maxCategory: ' + this.maxCategory);
            logger.log(caller, 'INFO2', 'Background: ' + slideData.Background);
        }
        return {ok: true, data: publishDataList};
    }
}
module.exports = Plugin;