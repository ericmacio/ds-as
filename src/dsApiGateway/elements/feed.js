const Generic = require('./Generic.js');
var SlideTemplate = require('./slideTemplate');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'feed');
var TYPE = 'feed';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get profile. " + error);
	process.exit();
}
/*--------------------------------------------------------------------------------------------
		Feed
---------------------------------------------------------------------------------------------*/
class Feed {
	constructor(apiCore) {
        this.apiCore = apiCore;
        this.profile = PROFILE;
        this.type = TYPE;
        this.generic = new Generic(this.apiCore, this.type, this.profile, this.getCreateInfo);
    }
    async getCreateInfo(data) {
        var caller = 'getCreateInfo';
        var createData = { ...PROFILE.createData };
        var urlPath;
        createData.title = data.name;
        createData.url = data.url;
        createData.frequency = data.frequency;
        createData.nb_items = data.nbItem;
        createData.resource_name = data.resource_name;
        createData.format = 'feed';
        logger.log(caller, 'DEBUG', 'Feed type: ' + data.type);
        if(data.type == 'ftp') {
            //For FTP media feeds only
            createData.typeFile = 'ftp';
            createData.type = 'ftp_feed';
            createData.login = data.login;
            createData.password = data.password;
            createData.img_duration_s = 10;
            createData.ftp_xml_path = data.ftpXmlPath;
            createData.ftp_xml_nodeType = data.ftpXmlNodeType;
            urlPath = '/ftpmedia';
            logger.log(caller, 'DEBUG', 'createData: ' + JSON.stringify(createData));
            var createInfo = {createData: createData, urlPath: urlPath};
            return {ok: true, data: createInfo};
        } else {         
            if(data.type == 'xml') {
                //XML media feeds only
                createData.typeFile = 'xml';
                createData.type = 'xml_feed';
                createData.type_generation = data.typeGeneration;
                createData.node = data.node;
                createData.fields = data.fields;
                urlPath = '/xmlmedia';
            } else if(data.type == 'rss') {
                //RSS media feed only
                createData.typeFile = 'rss';
                createData.type = 'user_feed';
                urlPath = '/rssmedia';
            }
            logger.log(caller, 'DEBUG', 'createData: ' + JSON.stringify(createData));
            var slideTemplate = new SlideTemplate(this.apiCore);
            try {
                let result = await slideTemplate.getId({name: data.template});
                if(!result.ok) {
                    logger.log(caller, 'DEBUG', 'ERROR: getId result is ko');
                    return result;
                }
                var templateId = result.data;
                logger.log(caller, 'DEBUG', 'templateId: ' + templateId);
                createData.template_id = templateId;
                logger.log(caller, 'DEBUG', 'createData: ' + JSON.stringify(createData));
                var createInfo = {createData: createData, urlPath: urlPath};
                return {ok: true, data: createInfo};
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: getId failed');
                return {ok: false};
            }
        }   
    }
    //We need a specific implement for check data because generation status is not available in standard getData process
    async checkData(data) {
        var caller = 'checkData';
        var mediaProfile = require('./media.json');
        var item = {type: 'media', profile: mediaProfile, data: data};
        try {
			let result = await this.apiCore.getItemByName(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: apiCore.getItemByName result is ko');
				return result;
			}
            var dsServerData = result.data;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemByName failed');
            logger.error(caller, error);
			return {ok: false};
		}
        var checkOk = true;
        for(var key in item.data.check) {
            if(typeof(dsServerData[key]) == 'undefined') {
                logger.log(caller, 'ERROR', 'ERROR: key ' + key + ' not found in server data: '+ JSON.stringify(dsServerData));
                checkOk = false;
            } else if(dsServerData[key] != item.data.check[key]) {
                logger.log(caller, 'ERROR', 'ERROR: key ' + key + ' value does not match. Expected: ' + item.data.check[key] + ', got: ' + dsServerData[key]);
                checkOk = false;
            } else
                logger.log(caller, 'INFO0', 'Check key ' + key + ' ok' + ', value: ' + dsServerData[key]);
        }
        return {ok: checkOk};
    };
    async generate(data) {
        var caller = 'generate';
        //First get feed csig
        try {
			let result = await this.getData(data);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getData result is ko');
				return result;
            }
            var csig = result.data.csig;
            logger.log(caller, 'INFO2', 'csig: ' + csig);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: apiCore.getData failed');
            logger.error(caller, error);
			return {ok: false};
		}
        //Generate feed content
        const urlPath = '/' + csig;
        var headers = {}, sentData, sentForm;
		const cmdName = this.profile.cmd.generate;
		const cmd = this.profile.cmdList[cmdName];
		try {
			let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'DEBUG', 'ERROR: apiCore.executeCmd result is ko');
			return result;
		} catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
            logger.error(caller, error);
			return {ok: false};
		}
    };
    async checkContentNb(data) {return await this.generic.checkContentNb(data).catch((error) => {logger.log('checkContentNb', 'ERROR', 'ERROR: generic.checkContentNb failed'); logger.error(caller, error); return {ok: false};})};
	async create(data) {return await this.generic.create(data).catch((error) => {logger.log('create', 'ERROR', 'ERROR: generic.create failed'); logger.error(caller, error); return {ok: false};})};
	async delete(data) {return await this.generic.delete(data).catch((error) => {logger.log('delete', 'ERROR', 'ERROR: generic.delete failed'); logger.error(caller, error); return {ok: false};})};
    async exist(data) {return await this.generic.exist(data).catch((error) => {logger.log('exist', 'ERROR', 'ERROR: generic.exist failed'); logger.error(caller, error); return {ok: false};})};
	async get(data) {return await this.generic.get(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); logger.error(caller, error); return {ok: false};})};
    async getData(data) {return await this.generic.getData(data).catch((error) => {logger.log('getData', 'ERROR', 'ERROR: generic.getData failed'); logger.error(caller, error); return {ok: false};})};
    async getDataById(data) {return await this.generic.getDataById(data).catch((error) => {logger.log('getDataById', 'ERROR', 'ERROR: generic.getDataById failed'); logger.error(caller, error); return {ok: false};})};
    async getContent(data) {return await this.generic.getContent(data).catch((error) => {logger.log('getContent', 'ERROR', 'ERROR: generic.getContent failed'); logger.error(caller, error); return {ok: false};})};
    async getContentById(data) {return await this.generic.getContentById(data).catch((error) => {logger.log('getContent', 'ERROR', 'ERROR: generic.getContent failed'); logger.error(caller, error); return {ok: false};})};
    async getId(data) {return await this.generic.getId(data).catch((error) => {logger.log('getId', 'ERROR', 'ERROR: generic.getId failed'); logger.error(caller, error); return {ok: false};})};
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); logger.error(caller, error); return {ok: false};})};
}
module.exports = Feed;