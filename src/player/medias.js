const fsp = require('fs').promises;
const path = require('path');
const httpClient = require('../utils/httpClient');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'medias');

exports.getAllMediasFromServer = async(mediaList, mediaLibrary) => {
    var caller = 'getAllMediasFromServer';
    downloadMedia = async(media) => {
        const caller = 'downloadMedia';
        logger.log(caller, 'INFO2', 'Media url: ' + media.url);
        const localFile = mediaLibrary + '/' + media.fileName;
        const mediaUrl = 'http://' + media.host + ':' + media.port + '/' + media.url;
        logger.log(caller, 'INFO2', 'MediaUrl: ' + mediaUrl);
        try {
            var result = await httpClient.downloadMedia(mediaUrl, localFile);
            if(!result.ok)
                logger.log(caller, 'INFO2', 'ERROR: httpClient.downloadToFile result is ko');
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: httpClient.downloadToFile failed');
            logger.error(caller, error);
            return {ok: false};
        }
        return {ok: true, data: localFile};
    }
	if(mediaList) {
        const downloadAllMedias = mediaList.map((media) => {return downloadMedia(media)});
        try {
            const resultList = await Promise.all(downloadAllMedias);
            //Now check the global status
            const allOk = resultList.find(result => !result.ok) ? false : true;
            if(!allOk)
                return{ok: false};
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: getAllIdentifier failed');
            logger.error(caller, error);
            return {ok: false};
        }
        return {ok: true};
	} else {
        logger.log(caller, 'ERROR', 'ERROR: mediaList undefined');
        return {ok: false};
    }
}
exports.clearContent = async(directory) => {
    const caller = 'clearContent';
    //First read directory content
    try {
        var dirContent = await fsp.readdir(directory);
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Cannot read dir content: ' + error);
        return {ok: false};
    }
    //Now delete all files from directory
    deleteFile = async(file) => {
        try {
            await fsp.unlink(file);
        } catch(error) {
            logger.log(caller, 'DEBUG', 'unlink failed');
            return {ok: false};
        }
        return {ok: true};
    }
    const deleteAllFiles = dirContent.map(file => deleteFile(path.join(directory, file)));
    try {
        const resultList = await Promise.all(deleteAllFiles);
        const allOk = resultList.find(result => !result.ok) ? false : true;
		return {ok: allOk};
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: deleteAllFiles failed');
		logger.error(caller, error);
		return {ok: false};
	}
}
    