const util = require('util');
const fs = require('fs');
const httpClient = require('../utils/httpClient');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'lisFile');

exports.getLisFileInfo = async(cmdServerData, mediaLibrary) => {
    var caller = 'getLisFileInfo';
    var host = cmdServerData.baseurl.replace('http://', '');
    var url = cmdServerData.lisFilePath.replace(/ /g, '%20');
    const port = 80;
    const requestData = {
        url: url,
        method: 'GET',
        headers: {},
        host: host,
        port: port,
        rejectUnauthorized: false
    }
    logger.log(caller, 'DEBUG', 'Call httpClient.sendRequest');
    try {
        var result = await httpClient.sendRequest(requestData);
        if(!result.ok)
            logger.log(caller, 'INFO2', 'ERROR: httpClient.sendRequest result is ko');
        else if(result.data == '') 
            logger.log(caller, 'DEBUG', 'No data received from server');
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: httpClient.sendRequest failed');
        logger.error(caller, error);
        return {ok: false};
    }
    var serverData = result.data;
    //Store lis file locally
    var urlArray = cmdServerData.lisFilePath.split('/');
    const localLisFile = mediaLibrary + '/' + urlArray[urlArray.length-1] + '-v' + cmdServerData.version;
    logger.log(caller, 'DEBUG', 'localLisFile path: ' + localLisFile);
    const writeFile = util.promisify(fs.writeFile);
    try {
        await writeFile(localLisFile, serverData);
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: writeFile failed');
        return {ok: false};
    }
    //Analyze lis file entries
    var lisArray = serverData.split(/\n/);
    var lisFileList = [];
    //First line contains root path for files
    const rootPath = lisArray[0];
    logger.log(caller, 'DEBUG', 'rootPath: ' + rootPath);
    for(var i=1; i<lisArray.length; i++) {
        logger.log(caller, 'INFO2', 'lis data [' + i + ']: ' + lisArray[i]);
        if(lisArray[i] != '') {
            //var lisEntryArray = lisArray[i].split(/\s+/);
            var lisEntryArray = lisArray[i].split(/\t/);
            logger.log(caller, 'INFO2', 'lisEntryArray: ' + lisEntryArray.toString());
            var fileName = lisEntryArray[lisEntryArray.length-1];
            logger.log(caller, 'DEBUG', 'file entry name: ' + fileName);
            if(cmdServerData.type == 'channel') {
                if(fileName.indexOf('tv_infos') > 0) { //fonts
                    fileName = fileName.replace(/c:/, ''); //Remove root for fonts
                    var url = cmdServerData.path + fileName.replace(/\\/g, '/');
                } else
                    var url = cmdServerData.path + rootPath.replace('c:\\', '/') + fileName.replace(/\\/g, '/');
                url = url.replace(/\s+/g, '%20'); //Replace espace by escape char
            } else {
                var url;
                if(typeof(fileName) != 'undefined') {
                    url = fileName.replace(/\\/g, '/');
                    url = url.replace(/\s+/g, '%20'); //Replace espace by escape char
                }
            }
            logger.log(caller, 'INFO2', 'url: ' + url);
            var nameArray = fileName.split('\\');
            fileName = nameArray[nameArray.length-1];
            logger.log(caller, 'INFO1', 'fileName: ' + fileName);
            lisFileList.push({
                host: host,
                url: url,
                port: port,
                fileName: fileName,
                fullFileName: cmdServerData.baseurl + url,
                localFile: mediaLibrary + '/' + fileName
            });
        }
    }
    const lisData = {localLisFile, lisFileList};
    return {ok: true, data: lisData};
}
exports.getPrgFileListFromLisData = (lisFileList) => {
	var caller = 'getPrgFileListFromLisData';
	var prgFileList =[];
    var found = false;
    logger.log(caller, 'INFO2',  'lisFileList length: ' + lisFileList.length);
	for(var id=0; id<lisFileList.length; id++) {
        var fileName = lisFileList[id].fileName;
        logger.log(caller, 'INFO2',  'fileName: ' + fileName);
		//Check if lis entry is a channel
		var posPrg;
		if((posPrg = fileName.indexOf('.prg')) > 0) {
			prgFileList.push(fileName);
			logger.log(caller, 'INFO2',  'prg file found: ' + fileName);
			found = true;
		}
	}
	if(!found)
        logger.log(caller, 'ERROR', 'ERROR: Prg file not found in lis data');
	return prgFileList;
}