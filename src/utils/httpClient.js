const axios = require('axios');
const fs = require('fs');
const fsp = require('fs').promises;
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'httpClient');

exports.sendRequest = async(requestData) => {
	const caller = 'sendRequest';
	const scheme = requestData.port == 443 ? 'https://' : 'http://';
	const url = scheme + requestData.host + ':' + requestData.port + requestData.url;
	logger.log(caller, 'INFO2', 'Send request to server: ' + requestData.method + ' ' + url);
	var config = {
		method: requestData.method,
		url: url,
		headers: requestData.headers,
		maxContentLength: Infinity,
		maxBodyLength: Infinity
	};
	if(requestData.data)
		config.data = requestData.data;
	else if(requestData.form)
		config.data = requestData.form;
		//requestData.form.pipe(config.data);
	try {
		let res = await axios(config);
		logger.log(caller, 'DEBUG', 'Data: ' + JSON.stringify(res.data));
		return {ok: true, data: res.data};
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: Request failed: ' + requestData.method + ' ' + url + ': ' + error);
		logger.log(caller, 'ERROR', 'ERROR: data sent: ' + config.data);
		if (error.response) {
			// Request made and server responded
			logger.log(caller, 'ERROR', 'ERROR: ' + error.response.status + ' ' + error.response.statusText);
			logger.log(caller, 'ERROR', 'ERROR: Data: ' + JSON.stringify(error.response.data));
		} else if (error.request) {
			// The request was made but no response was received
			logger.log(caller, 'ERROR', 'ERROR: No response received from the server');
			logger.log(caller, 'ERROR', 'ERROR: Request sent: ' + requestData.method + ' ' + url);
		}
		return {ok: false};
	}
}
exports.downloadMedia = async(url, filePath) => {
	const caller = 'downloadMedia';
	//Used by SoftPlayer app
	const writer = fs.createWriteStream(filePath);
	try {
		var response = await axios({url: url, method: 'GET', responseType: 'stream'});
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: axios failed: ' + error);
		return {ok: false};
	}

	response.data.pipe(writer);
	
	return new Promise((resolve, reject) => {
		writer.on('finish', resolve({ok: true}));
		writer.on('error', reject({ok: false}));
	});
}
exports.download = async(url) => {
	const caller = 'download';
	try {
		if(url.includes('pgz'))
			var response = await axios({url: url, method: 'GET', headers: {'Accept-Encoding': 'gzip'}, responseType: 'arraybuffer'});
		else
			var response = await axios({url: url, method: 'GET', headers: {'Accept-Encoding': 'gzip'}});
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: axios failed for request: GET ' + url);
		logger.error(caller, error);
		return {ok: false};
	}
	return{ok: true, data: response.data};
}
exports.downloadToFile = async(url, filePath) => {
	const caller = 'downloadToFile';
	try {
		if(url.includes('pgz'))
			var response = await axios({url: url, method: 'GET', headers: {'Accept-Encoding': 'gzip'}, responseType: 'arraybuffer'});
		else
			var response = await axios({url: url, method: 'GET', headers: {'Accept-Encoding': 'gzip'}});
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: axios failed for request: GET ' + url);
		logger.error(caller, error);
		return {ok: false};
	}
	try {
		await fsp.writeFile(filePath, response.data)
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: fsp.writeFile failed for file path ' + filePath);
		logger.error(caller, error);
		return {ok: false};
	}
	return {ok: true};
}
/*
exports.downloadToFile = async(url, filePath) => {
	const caller = 'downloadToFile';
	const writer = fs.createWriteStream(filePath);
	try {
		var response = await axios({url: url, method: 'GET', responseType: 'stream'});
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: axios failed for request: GET ' + url);
		logger.error(caller, error);
		return {ok: false};
	}
	response.data.pipe(writer);
	return new Promise((resolve, reject) => {
		writer.on('finish', resolve({ok: true}));
		writer.on('error', reject({ok: false}));
	});
}
*/