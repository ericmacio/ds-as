const Logger = require('../../utils/logger');
const logger = new Logger(__filename, 'plugin_dbToSlide1');
class Plugin {
    constructor(api, config) {
        this.api = api;
        this.config = config;
    }
    async dbData(dbDataList, storeDbDataList, prevDbDataList) {
        var caller = 'dbData';
        //Addon for template matrix
        const addonTemplateMatrix = {
            PRV_sales: {
                type: "text",
                name: "Text3"
            },
            PRV_photo: {
                type: "img",
                name: "Image1"
            },
            PRV_background: {
                type: "img",
                name: "Background"
            }
        }
        //Used to calculate the total number per category
        const keyList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        //Used to add specific attributes value to db data per product. Can be used as value for template fields or anything else (i.e. playlist)
        //This also could be part of the database itself ...
        const productDataSet = {
            'Skis': {
                PRV_background: 'medias/backgrounds/ski1.jpg',
                PRV_photo: 'medias/images/dbToSlide/ski1.png',
                PRV_playlist: 'ski'
            },
            'Boots': {
                PRV_background: 'medias/backgrounds/ski2.jpg',
                PRV_photo: 'medias/images/dbToSlide/boots1.png',
                PRV_playlist: 'ski'
            },
            'Bag': {
                PRV_background: 'medias/backgrounds/golf1.jpg',
                PRV_photo: 'medias/images/dbToSlide/golf1.png',
                PRV_playlist: 'golf'
            },
            'Golf set': {
                PRV_background: 'medias/backgrounds/golf2.jpg',
                PRV_photo: 'medias/images/dbToSlide/golfSet1.png',
                PRV_playlist: 'golf'
            },
            'Mountain bike': {
                PRV_background: 'medias/backgrounds/bike1.jpg',
                PRV_photo: 'medias/images/dbToSlide/bike1.png',
                PRV_playlist: 'bike'
            },
            'Rockrider': {
                PRV_background: 'medias/backgrounds/bike2.jpg',
                PRV_photo: 'medias/images/dbToSlide/bike2.png',
                PRV_playlist: 'bike'
            }
        }
        if(dbDataList.length == 0) {
            logger.log(caller, 'ERROR', 'ERROR: No data to process');
            var error = {msg: 'db data list is empty'}
            return {ok: false};
        }
        //Set deleted flag to slide from previous list
        for(var id=0; id<storeDbDataList.length; id++)
            storeDbDataList[id].PRV_deleted = prevDbDataList[id].PRV_deleted;

        //Create template matrix
        var templateMatrix = this.config.templateMatrix;
        //Add templateMatrix data
        for(var key in addonTemplateMatrix) {
            logger.log(caller, 'INFO2', 'Add key ' + key + ' to template matrix');
            templateMatrix[key] = addonTemplateMatrix[key];
        }
        //First look at the new entries and find max total value
        var maxTotalValue = 0;
        var maxTotalValueId = 0;
        for(var id=0; id<dbDataList.length; id++) {
            var dbData = dbDataList[id];
            //Initialize max total boolean
            dbData.PRV_maxTotal = false;
            //Personalize data set with additional attributes
            if(productDataSet[dbData.Product]) {
                //Set new attributes
                for(var key in productDataSet[dbData.Product])
                    dbData[key] = productDataSet[dbData.Product][key];
            }
            //Calculate total amount of sales
            dbData.PRV_total = 0;
            for(var keyId=0; keyId<keyList.length; keyId++) 
                dbData.PRV_total += parseInt(dbData[keyList[keyId]], 10);
            //Set sales information text
            dbData.PRV_sales = 'Total sales performed in 2019: ' + dbData.PRV_total;
            //Update max value if needed
            if(dbData.PRV_total > maxTotalValue) {
                maxTotalValue = dbData.PRV_total;
                maxTotalValueId = id;
            }
        }
        //Now make sure the data with max value will be built again with top template
        var dbWithMaxValue = dbDataList[maxTotalValueId];
        dbWithMaxValue.PRV_maxTotal = true;
        dbWithMaxValue.PRV_new = true;
        dbWithMaxValue.PRV_template = 'template_top';
        dbWithMaxValue.PRV_sales = 'Biggest sale of the Year: ' + dbWithMaxValue.PRV_total + ' ! Congratulation to the team !';
        //Now identify previous entry for max total value
        if(storeDbDataList.length > 0) {
            var prevMaxTotalValueId;
            for(var id=0; id<storeDbDataList.length; id++) {
                if(storeDbDataList[id].PRV_maxTotal) {
                    //We have identified the previous data with max total value. Save it
                    prevMaxTotalValueId = id;
                    logger.log(caller, 'INFO2', 'prevMaxTotalValueId: ' + prevMaxTotalValueId);
                    logger.log(caller, 'INFO2', 'prevMaxTotalValue: ' + storeDbDataList[prevMaxTotalValueId]);
                    break;
                }
            }
            //If not found this is an error
            if(typeof(prevMaxTotalValueId) == 'undefined')
                logger.log(caller, 'ERROR', 'ERROR: previous max total value not found');
            //Check if db data with max total has changed
            else if((typeof(dbWithMaxValue.PRV_prevId) == 'undefined') || (dbWithMaxValue.PRV_prevId != prevMaxTotalValueId)) {
                //Db data with max total has changed
                //We must set the previous slide with max total to be deleted
                storeDbDataList[prevMaxTotalValueId].PRV_deleted = true;
                //Now, if exists, set the previous slide of the new db data with max value to be deleted as well
                //Warning, value may very well have not changed
                if(typeof(dbWithMaxValue.PRV_prevId) != 'undefined')
                    storeDbDataList[dbWithMaxValue.PRV_prevId].PRV_deleted = true;
                //Get db data with previous max value and set it to true so that it will be created again
                //Warning, value may very well have not changed
                for(var id=0; id<dbDataList.length; id++) {
                    if((typeof(dbDataList[id].PRV_prevId) != 'undefined') && (dbDataList[id].PRV_prevId == prevMaxTotalValueId))
                        dbDataList[id].PRV_new = true;
                }
            } else
                //No need to generate slide with max value as it didn't change
                dbWithMaxValue.PRV_new = false;
        }
        //If new update variable
        if(dbWithMaxValue.PRV_new) {
            //Set variables with new top value. Warning: asynchronous request
            try {
                var var1 = {name: 'as-demo-var1', value: 'Biggest sale of the year for ' + dbWithMaxValue.Product + ' product !'};
                await this.api.variable.modify(var1);
                var var2 = {name: 'as-demo-var2', path: dbWithMaxValue.PRV_photo, imgName: 'top_product'};
                await this.api.variable.modify(var2);
                var var3 = {name: 'as-demo-var3', value: 'Total year sales: ' + dbWithMaxValue.PRV_total};
                await this.api.variable.modify(var3);
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: api.variable.modify failed');
                logger.error(caller, error);
                return {ok: false};
            }
        }
        return {ok: true, data: {dbDataList: dbDataList, storeDbDataList: storeDbDataList, templateMatrix: templateMatrix}};
    }
    async publishData(publishDataList) {
        var caller = 'publishData';
        //No change is needed. Return data as they are
        return {ok: true, data: publishDataList};
    }
}
module.exports = Plugin;