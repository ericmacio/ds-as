const fsp = require('fs').promises;
const extractZip = require('extract-zip');
const httpClient = require('../../utils/httpClient');
const Generic = require('./Generic.js');
const Media = require('./media.js');
var SlideTemplate = require('./slideTemplate');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'slide');
var TYPE = 'slide';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get profile. " + error);
	logger.error(caller, error);
	process.exit();
}
var DEFAULT_TEMPLATE_VALUE = 'default_template_value';
var CLEAR_FIELD = 'do_not_display';
var DO_NOT_DISPLAY = 'do_not_display';
/*--------------------------------------------------------------------------------------------
		Slide
---------------------------------------------------------------------------------------------*/
class Slide {
	constructor(apiCore) {
        this.apiCore = apiCore;
		this.type = TYPE;
		this.profile = PROFILE;
		this.generic = new Generic(this.apiCore, this.type, this.profile, null);
    }
    async createFromFile(data) {
		var caller = 'createFromFile';
		if(!data.url && !data.src) {
			logger.log(caller, 'ERROR', 'ERROR: no src or url specified in data');
			return {ok: false};
		}
		var itemData = data;
		if(data.src) {
			//Read media data from file to create slide using template
			try {
				var fileData = await fsp.readFile(data.src);
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: Cannot read file');
				logger.error(caller, error);
				return {ok: false};
			}
			try {
				itemData.slideData = JSON.parse(fileData);
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: cannot parse JSON data from read file');
				logger.error(caller, error);
				return {ok: false};
			}
		} else {
			try {
				const result = await httpClient.download(data.url);
				if(!result.ok) {
					logger.log(caller, 'ERROR', 'ERROR: httpClient.download result is ko');
					return {ok: false};
				}
				itemData.slideData = result.data;
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: Cannot download file');
				logger.error(caller, error);
				return {ok: false};
			}
		}
		//Create media from template
		try {
			let result = await this.create(itemData);
			if(!result.ok)
				logger.log(caller, 'DEBUG', 'ERROR: create result is ko');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: create failed');
			logger.error(caller, error);
			return {ok: false};
		}
    }
    async create(data) {
		var caller = 'create';
        var item = {type: TYPE, profile: PROFILE, data: data};
        //Create media from template
		logger.log(caller, 'INFO1', 'mediaName: ' + data.name);
		logger.log(caller, 'INFO1', 'templateName: ' + data.template);
		//Get template content
		var slideTemplate = new SlideTemplate(this.apiCore);
		try {
			let result = await slideTemplate.getContent({name: data.template});
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: slideTemplate.getContent result is ko');
				return result;
			}
			logger.log(caller, 'INFO2', 'slideTemplate.getContent OK for ' + data.template);
			item.data.templateContent = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: slideTemplate.getContent failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Get template data
		try {
			let result = await slideTemplate.get({name: data.template});
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: slideTemplate.get result is ko');
				return result;
			}
			logger.log(caller, 'INFO2', 'slideTemplate.get OK for ' + data.template);
			item.data.templateData = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: slideTemplate.get failed');
			logger.error(caller, error);
			return {ok: false};
		}
		logger.log(caller, 'INFO1', 'Start media generation: ' + item.data.name);
		logger.log(caller, 'INFO1', 'item.data: ' + JSON.stringify(item.data));
		//Generate media from template
		try {
			let result = await generateMediaFromTemplate(this.apiCore, item);
			if(!result.ok)
				logger.log(caller, 'DEBUG', 'ERROR: generateMediaFromTemplate result is ko');
			else
				logger.log(caller, 'INFO1', 'Media sucessfully generated: ' + item.data.name);
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: generateMediaFromTemplate failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	async downloadPGZ(data) {
		var caller = 'downloadPGZ';
		const tmpDir = "D:/Node.js/ds-as/src/tmp/uploads";
		const localDir = tmpDir + '/' + data.name;
		try {
			let result = await this.getData(data);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: getData result is ko');
				return result;
			}
			var pgzUrl = result.data.file_url;
			logger.log(caller, 'INFO0', 'pgzUrl: ' + pgzUrl);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getData failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Create local directory with name
		try {
			await fsp.mkdir(localDir);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: Cannot create directory: ' + localDir);
			logger.error(caller, error);
			return {ok: false};
		}
		//Download pgz file
		const localPgzFile = localDir + '/' + data.name + '.pgz';
		try {
			let result = await httpClient.downloadToFile(pgzUrl, localPgzFile);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: httpClient.downloadToFile result is ko');
				return result;
			}
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: httpClient.downloadToFile failed');
			logger.error(caller, error);
			return {ok: false};
		}
		if(data.unzip) {
			//Extract files
			try {
				await extractZip(localPgzFile, { dir: localDir });
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: extractZip failed');
				logger.error(caller, error);
				return {ok: false};
			}
			//Rename images with local pgz name + id
			//Read files from folder
			try {
				var files = await fsp.readdir(localDir);
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: fsp.readdir failed');
				logger.error(caller, error);
				return {ok: false};
			}
			const images = files.filter(file => file.toLowerCase().includes('jpg')||file.toLowerCase().includes('jpeg')||file.toLowerCase().includes('png')||file.toLowerCase().includes('bmp'));
			for(let id=0; id<images.length; id++) {
				logger.log(caller, 'INFO0', 'image: ' + images[id]);
				try {
					await fsp.rename(localDir + '/' + images[id], localDir + '/' + data.name + '-' + id + '.' + images[id].split('.')[1]);
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: fsp.rename failed');
					logger.error(caller, error);
					return {ok: false};
				}
			}
		}
		return ({ok: true, data: { localDir }});
	}
	async uploadImagesFromPgzToLibrary(data) {
		var caller = 'uploadImagesFromPgzToLibrary';
		try {
			const result = await this.downloadPGZ({ name: data.name, unzip: true });
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: downloadPGZ result is ko');
				return result;
			}
			var localDir = result.data.localDir;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR:downloadPGZ failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Get list of images
		try {
			var files = await fsp.readdir(localDir);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: fsp.readdir failed');
			logger.error(caller, error);
			return {ok: false};
		}
		const imagesList = files.filter(file => file.toLowerCase().includes('jpg')||file.toLowerCase().includes('jpeg')||file.toLowerCase().includes('png')||file.toLowerCase().includes('bmp'))
			.map(image => {return {name: image, path: localDir + '/' + image}});
		for(let id=0; id<imagesList.length; id++)
			logger.log(caller, 'INFO0', 'imagesList[' + id + ']: ' + imagesList[id].name);
		//Upload media to library
		var media = new Media(this.apiCore);
		const uploadImage = async(image) => {
			try {
				var mediaData = {name: image.name, src: image.path};
				var result = await media.upload(mediaData);
				if(!result.ok)
					logger.log(caller, 'DEBUG', 'ERROR: media.upload result is ko');
				else
					logger.log(caller, 'INFO0', 'Image ' + image.name + ' uploaded successfully into library');
				return result;
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: media.upload failed');
				logger.error(caller, error);
				return {ok: false};
			}
		}
		//Create and execute in parallel upload function for each media
		var uploadFunct = imagesList.map((image) => {return uploadImage(image);});
		try {
			const resultList = await Promise.all(uploadFunct);
			//Now check the global status
			var allOk = true;
			for(let id=0; id<resultList.length; id++) {if(!resultList[id].ok) {logger.log(caller, 'ERROR', 'ERROR: uploadImage result is ko'); allOk = false;}};
			return {ok: allOk};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for uploadFunct. ' + error);
			logger.error(caller, error);
			return {ok: false};
		}
	}
	async delete(data) {return await this.generic.delete(data).catch((error) => {logger.log('delete', 'ERROR', 'ERROR: generic.delete failed'); logger.error(caller, error); return {ok: false};})};
    async exist(data) {return await this.generic.exist(data).catch((error) => {logger.log('exist', 'ERROR', 'ERROR: generic.exist failed'); logger.error(caller, error); return {ok: false};})};
	async get(data) {return await this.generic.get(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); logger.error(caller, error); return {ok: false};})};
    async getData(data) {return await this.generic.getData(data).catch((error) => {logger.log('getData', 'ERROR', 'ERROR: generic.getData failed'); logger.error(caller, error); return {ok: false};})};
	async getContent(data) {return await this.generic.getContent(data).catch((error) => {logger.log('getContent', 'ERROR', 'ERROR: generic.getContent failed'); logger.error(caller, error); return {ok: false};})};
	async getId(data) {return await this.generic.getId(data).catch((error) => {logger.log('getId', 'ERROR', 'ERROR: generic.getId failed'); logger.error(caller, error); return {ok: false};})};
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); logger.error(caller, error); return {ok: false};})};
}
module.exports = Slide;
/*--------------------------------------------------------------------------------------------
		generateMediaFromTemplate
---------------------------------------------------------------------------------------------*/
async function generateMediaFromTemplate(apiCore, item) {
	var caller = 'generateMediaFromTemplate';
	logger.log(caller, 'DEBUG', 'Begin');
	//Update content of template with new values from mediaTemplate
	try {
		let result = await updateMediaTemplate(apiCore, item.data.templateContent, item.data.slideData);
		if(!result.ok) {
			logger.log(caller, 'DEBUG', 'ERROR: updateMediaTemplate result is ko');
			return result;
		}
		logger.log(caller, 'INFO2', 'updateMediaTemplate complete');
		item.data.newMedia = result.data;
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: updateMediaTemplate failed');
		logger.error(caller, error);
		return {ok: false};
	}
	//Post media template
	try {
		let result = await postMediaTemplate(apiCore, item);
		if(!result.ok)
			logger.log(caller, 'DEBUG', 'ERROR: postMediaTemplate result is ko');
		return result;
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: postMediaTemplate failed');
		logger.error(caller, error);
		return {ok: false};
	}
}
/*--------------------------------------------------------------------------------------------
		updateMediaTemplate
---------------------------------------------------------------------------------------------*/
async function updateMediaTemplate (apiCore, templateContent, mediaData) {
	var caller = 'updateMediaTemplate';
	logger.log(caller, 'DEBUG', 'Begin');
	async function setMediaItem(newMediaItem, mediaData) {
		var statusOk = true;
		logger.log(caller, 'DEBUG', 'Media item Name: ' + newMediaItem.Name);
		//Check whether item has been specified in the media
		if(typeof(mediaData[newMediaItem.Name]) != 'undefined') {
			//Check data is not empty
			if(mediaData[newMediaItem.Name] != '') {
				//check value is not set to default value from template
				if(mediaData[newMediaItem.Name] != DEFAULT_TEMPLATE_VALUE) {
					logger.log(caller, 'INFO2', 'Set media item Name: ' + newMediaItem.Name);
					//Set 'Modified' parameter to true
					newMediaItem.Modified = 1;
					switch(newMediaItem.Type) {
						case 'Text':
							if((mediaData[newMediaItem.Name].value == CLEAR_FIELD)) {
								//Field must not be displayed
								newMediaItem.Content.Value = DO_NOT_DISPLAY;
								logger.log(caller, 'INFO1', "Field value has been set to: " + DO_NOT_DISPLAY + ' for media name: ' + newMediaItem.Name);
							} else
								newMediaItem.Content.Value = mediaData[newMediaItem.Name].value;
							logger.log(caller, 'INFO2', 'Modifying Item [' + newMediaItem.Name + '] Content.Value with value: ' + newMediaItem.Content.Value, 'black', 'bold');
							//Set 'Modified' parameter to true
							newMediaItem.Content.Modified = 1;
							break;
						case 'ImageFond':
						case 'Image':
						case 'Video':
							const mediaValue = mediaData[newMediaItem.Name].value;
							if(mediaValue == CLEAR_FIELD) {
								//Field must not be displayed
								newMediaItem.Content.Value = DO_NOT_DISPLAY;
								logger.log(caller, 'INFO1', "Field value has been set to: " + DO_NOT_DISPLAY + ' for media name: ' + newMediaItem.Name);
							} else {
								//We must first upload the media
								const isHttp = mediaValue.includes('http');
								var mediaFileDesc = {
									name: mediaValue,
									path: isHttp ? null : mediaValue,
									url: isHttp ? mediaValue : null,
									uploadData: {
										name: mediaValue
									}
								}
								try {
									let result = await apiCore.uploadFile(mediaFileDesc);
									if(!result.ok) {
										logger.log(caller, 'ERROR', 'ERROR: apiCore.uploadFile result is ko');
										statusOk = false;
									} else {
										var uploadData = result.data;
										logger.log(caller, 'INFO1', "Media file uploaded: " + mediaFileDesc.name);
										logger.log(caller, 'INFO2', "Media url: " + uploadData.url);
										logger.log(caller, 'INFO2', "Media kse_url: " + uploadData.urlXfer);
										newMediaItem.Content.Modified = 1;
										newMediaItem.Content.Value = uploadData.url;
										newMediaItem.Content.Kse_value = uploadData.urlXfer;
										newMediaItem.Content.Bm_media_id = '';
										logger.log(caller, 'DEBUG', 'New media Content field: ' + JSON.stringify(newMediaItem.Content));
									}
								} catch(error) {
									logger.log(caller, 'ERROR', 'ERROR: apiCore.uploadFile failed');
									logger.error(caller, error);
									statusOk = false;
								}
							}
							break;
						case 'Graphic':
							logger.log(caller, 'WARNING', 'WARNING: Unimplemented item type: ' + newMediaItem.Type);
							break;
						default:
							logger.log(caller, 'ERROR', 'ERROR: Unsupported item type: ' + newMediaItem.Type);
							throw new Error('Cannot update mediaItem');
					}
				}  else {
					//Item is empty. Keep default value from the template then
					logger.log(caller, 'INFO2', 'Row data is set to default template value');
				}
			} else {
				//Item is empty. Keep default value from the template then
				logger.log(caller, 'WARNING', 'WARNING: Row data is empty. Skip it then');
			}
		} else {
			//Item is not specified in the database. Keep default value from the template then
			logger.log(caller, 'INFO1', 'WARNING: Item is not defined in media data: ' + newMediaItem.Name + ', use default template value');
		}
		return {ok: statusOk};
	}
	if(templateContent) {
		//Initialize media with current template value
		var newMedia = templateContent;
		var itemList = newMedia.Items.Item;
		var setMediaItemFunct = itemList.map((item) => {return setMediaItem(item, mediaData);});
		try {
			const resultList = await Promise.all(setMediaItemFunct);
			logger.log(caller, 'INFO1', 'Init resultList length: ' + resultList.length);
			//Now check the global status
			var allOk = true;
			for(let id=0; id<resultList.length; id++) {
				if(!resultList[id].ok) {
					logger.log(caller, 'ERROR', 'ERROR: result is ko for id: ' + id + ', result: ' + resultList[id].ok); 
					allOk = false;
				}
			}
			return {ok: allOk, data: newMedia};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for setMediaItemFunct. ' + error);
			logger.error(caller, error);
			return {ok: false};
		}
	} else {
		logger.log(caller, 'ERROR', 'ERROR: No templateContent specified. No change done');
		return {ok: true, data: newMedia};
	}
}
/*--------------------------------------------------------------------------------------------
		postMediaTemplate
---------------------------------------------------------------------------------------------*/
async function postMediaTemplate (apiCore, item) {
	var caller = 'postMediaTemplate';
	var templateData = item.data.templateData;
	var newMedia = item.data.newMedia;
	var urlPath = '/' + templateData.id;
	var headers = {};
	var sentData = item.data.newMedia;
	var sentForm;
	var cmd = item.profile.cmdList[item.profile.cmd.post];
	try {
		let result = await apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
		if(!result.ok) {
			logger.log(caller, 'DEBUG', 'ERROR: apiCore.executeCmd result is ko');
			return result;
		}
		var generatedMediaData = result.data;
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
		logger.error(caller, error);
		return {ok: false};
	}
	logger.log(caller, 'DEBUG', 'post slide data: ' + JSON.stringify(generatedMediaData));
	var urlPath = '/' + templateData.id;
	var headers = {};
	var sentData = {
		id: templateData.id,
		category: ['manual'],
		creation_date: templateData.creation_date,
		description: templateData.description,
		image_file: templateData.image_file,
		isDefaultForNewOrga: 0,
		last_update_date: templateData.last_update_date,
		last_update_firstname: '',
		last_update_surname: '',
		last_update_username: '',
		media_file: templateData.media_file,
		media_type: templateData.media_type,
		parent_template_id: templateData.parent_template_id,
		protectedTemplate: templateData.protectedTemplate,
		rights_products: templateData.rights_products,
		rights_users: templateData.rights_users,
		title: templateData.title,
		xml_file: templateData.xml_file,
		range: {
			position: templateData.range.position,
			total: templateData.range.total
		},
		link: '#templates/' + templateData.id,
		info: {
			File: newMedia.MediaInfo.File,
			XMLVersion:  newMedia.MediaInfo.XMLVersion,
			MediaVersion: newMedia.MediaInfo.MediaVersion,
			EstimatedDuration: newMedia.MediaInfo.EstimatedDuration,
			MinDuration: newMedia.MediaInfo.MinDuration,
			Width: newMedia.MediaInfo.Width,
			Height: newMedia.MediaInfo.Height,
		},
		content: '',
		status: '',
		upload: '',
		newContent: '',
		preview_file: generatedMediaData.preview_file,
		start_validity: '2017-05-01 00:00:00',
		start_validity_date: '01-05-2017',
		share: 'shared',
		hebdo_days: 127,
		days: [2, 4, 8, 16, 32, 64, 1],
		allow_in_playlist: 1,
		continuous_diffusion: true,
		start_datetime: '2017-05-01 00:00:00',
		start_datetime_date: '01-05-2017',
		start_datetime_hours: 0,
		start_datetime_mins: 0,
		media_title: item.data.name
	}
	var sentForm;
	var cmd = item.profile.cmdList[item.profile.cmd.postValidate];
	try {
		let result = await apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
		if(!result.ok)
			logger.log(caller, 'DEBUG', 'ERROR: apiCore.executeCmd result is ko');
		return result;
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
		logger.error(caller, error);
		return {ok: false};
	}
}