const Logger = require('../../utils/logger');
const logger = new Logger(__filename, 'plugin_demo1');
class Plugin {
    constructor(api, config) {
        this.api = api;
        this.config = config;
    }
    async dbData(dbDataList, storeDbDataList, prevDbDataList) {
        var caller = 'dbData';
        //Set deleted flag to slide from previous list
        for(var id=0; id<storeDbDataList.length; id++)
            storeDbDataList[id].PRV_deleted = prevDbDataList[id].PRV_deleted;
        return {ok: true, data: {dbDataList: dbDataList, storeDbDataList: storeDbDataList, templateMatrix: this.config.templateMatrix}};
    }
    async publishData(publishDataList) {
        var caller = 'publishData';
        //No change is needed. Return data as they are
        return {ok: true, data: publishDataList};
    }
}
module.exports = Plugin;