var App = require('../src/app/App');
const httpClient = require('../src/utils/httpClient');
const parseXml = require('../src/utils/parseXml');
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'LM_Critizr');
/*--------------------------------------------------------------------------------------------
		LM_Critizr
---------------------------------------------------------------------------------------------*/
class LM_Critizr extends App {
	constructor(data, proxy) {
        super(data, proxy);
    }
	//Start service
	async start() {
		var caller = 'start';
		logger.log(caller, 'INFO0', 'LM_Critizr starting ...');
		//Request URL to get XML content
		try {
			const result = await httpClient.download(this.config.url);
			if(!result.ok) {
				logger.log(caller, 'ERROR', 'ERROR: httpClient.download result is ko');
				return {ok: false};
			}
			var slideDataXML = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: Cannot download file');
			logger.error(caller, error);
			return {ok: false};
		}
		//Parse XML
		logger.log(caller, 'DEBUG', 'slideDataXML: ' + slideDataXML);
		try {
			var parseResult = await parseXml.parse(slideDataXML);
			logger.log(caller, 'DEBUG', 'XML parse return: ' + JSON.stringify(parseResult));
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: parseXml failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Update slide data value
		const slideInfoList = this.config.slideInfoList.map(slideInfo => {
			logger.log(caller, 'INFO0', 'Parse slide info for slide: ' + slideInfo.name);
			for(var key in slideInfo.slideData) {
				if(!slideInfo.slideData[key].value)
					slideInfo.slideData[key].value = parseResult['xml'][slideInfo.slideData[key].tag].toString();
				if(slideInfo.slideData[key].type == 'img') {
					slideInfo.slideData[key].value = slideInfo.slideData[key].value.replace('http://dsxfer.demo.piksel.fr/templates/etoiles_lm', 'http://ftp.ds-piksel.com/feeds/XML/LM/images')
					if(slideInfo.slideData[key].value == 'do_not_display') slideInfo.slideData[key].value = 'http://ftp.ds-piksel.com/feeds/XML/LM/images/critizr-logo.png';
				}
				logger.log(caller, 'INFO0', 'value for key [' + key + ']: ' + slideInfo.slideData[key].value);
			}
			return slideInfo;
		});
		//First delete current slides
		const deleteSlide = async(slideInfo) => {
			//Delete slide from library
			try {
				let result = await this.api.slide.delete({name: slideInfo.name});
				if(!result.ok) {
					logger.log(caller, 'ERROR', 'ERROR: api.slide.delete result is ko');
				} else
					logger.log(caller, 'INFO0', 'Slide deleted: ' + slideInfo.name);
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: api.slide.create failed');
				logger.error(caller, error);
				return {ok: false};
			}
			return {ok: true};
		}
		const deleteSlideFunct = slideInfoList.map(slideInfo => {return deleteSlide(slideInfo);});
		try {
			const resultList = await Promise.all(deleteSlideFunct);
			//Now check the global status
			var allOk = resultList.find(result => !result.ok) ? false : true;
			if(!allOk)
				logger.log(caller, 'ERROR', 'ERROR: deleteSlideFunct result is ko');
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for deleteSlideFunct. ' + error);
			logger.error(caller, error);
			return {ok: false};
		}
		//Create slides and put them into the channel
		const createSlide = async(slideInfo) => {
			//Create slide from template
			try {
				let result = await this.api.slide.create(slideInfo);
				if(!result.ok) {
					logger.log(caller, 'ERROR', 'ERROR: api.slide.create result is ko');
					return {ok: false};
				} else
					logger.log(caller, 'INFO0', 'Slide created: ' + slideInfo.name);
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: api.slide.create failed');
				logger.error(caller, error);
				return {ok: false};
			}
			//Put slide into channel
			try {
				let result = await this.api.channel.postContent({name: this.config.channel, contentType: "slide", contentName: slideInfo.name});
				if(!result.ok) {
					logger.log(caller, 'ERROR', 'ERROR: api.channel.postContent result is ko');
					return {ok: false};
				} else
					logger.log(caller, 'INFO0', 'Slide ' + slideInfo.name + ' put into channel: ' + this.config.channel);
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: api.channel.postContent failed');
				logger.error(caller, error);
				return {ok: false};
			}
			return {ok: true};
		}
		const createSlideFunct = slideInfoList.map(slideInfo => {return createSlide(slideInfo);});
		try {
			const resultList = await Promise.all(createSlideFunct);
			//Now check the global status
			var allOk = resultList.find(result => !result.ok) ? false : true;
			if(!allOk) {
				logger.log(caller, 'ERROR', 'ERROR: createSlideFunct result is ko');
				return {ok: false};
			}
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for createSlideFunct. ' + error);
			logger.error(caller, error);
			return {ok: false};
		}
		//Publish channel
		try {
			let result = await this.api.channel.publish({name: this.config.channel});
			if(!result.ok) {
				logger.log(caller, 'ERROR', 'ERROR: api.channel.publish result is ko');
				return {ok: false};
			} else
				logger.log(caller, 'INFO0', 'Channel published: ' + this.config.channel);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: api.channel.publish failed');
			logger.error(caller, error);
			return {ok: false};
		}
		logger.log(caller, 'INFO0', 'LM_Critizr running ...');
		return {ok: true};
	};
	//End service
	async stop() {
		var caller = 'stop';
		logger.log(caller, 'INFO0', 'LM_Critizr stopping ...');
		return {ok: true};
	}
}
module.exports = LM_Critizr;