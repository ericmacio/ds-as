var fs = require('fs');
var util = require('util');
var Logger = require('../logging/logger');
var logger = new Logger(__filename, 'scanDir');
var DEFAULT_SCAN_TIMER_SEC = 15;
/*--------------------------------------------------------------------------------------------
		ScanDir
---------------------------------------------------------------------------------------------*/
class ScanDir {
    constructor(api, configData, onChange) {
        var caller = 'ScanDir';
        this.onChange = onChange
        this.api = api;
        //Init file time
        this.prevFileTime = new Date().getTime();
        //Get config settings
        if(configData && configData.dirToScan)
            this.dirToScan = configData.dirToScan;
        else
            logger.log(caller, 'ERROR', 'ERROR: dirToScan is not specified');
        if(configData && configData.scanTimeSec)
            this.scanTimeSec = configData.scanTimeSec;
        else
            this.scanTimeSec = DEFAULT_SCAN_TIMER_SEC;
        //create mediaList
        this.mediaList = [];
    }
    startService(callback) {
        var caller = 'startService';
        this.startScan = () => {
            var caller = 'startScan';
            logger.log(caller, 'INFO2', 'Scanning ' + this.dirToScan + '...' );
            //Restart the scan function
            this.restart = () => {
                if(!this.mustStop)
                    this.timer = setTimeout(() => {this.startScan();}, this.scanTimeSec * 1000);
            }
            //First set all current media status to idle
			for(var mediaId=0; mediaId<this.mediaList.length; mediaId++)
                this.mediaList[mediaId]. status = 'idle';
            //Check if directory content has been modified
			fs.readdir(this.dirToScan, (error, files) => {
				if(error)
					logger.log(caller, 'ERROR', 'ERROR: fs.readdir failed');
                else {
                    var newList = false;
                    for(var i=0; i<files.length; i++) {
                        //Check it's not a directory
                        if(!files[i].isDir) {
                            var found = false;
                            for(var mediaId=0; mediaId < this.mediaList.length; mediaId++) {
                                //Check if file already exist in current media list
                                if(this.mediaList[mediaId].name == files[i]) {
                                    //Media already exist in list. We must check if it has been modified since
                                    found = true;
                                    var fileStats = fs.statSync(this.dirToScan + '/' + files[i]);
                                    //var fileTime = (fileStats.mtime > fileStats.ctime) ? fileStats.mtime : fileStats.ctime;
                                    var date = new Date(util.inspect(fileStats.ctime));
                                    var time = date.getTime();
                                    //Check if file date has change
                                    if(this.mediaList[mediaId].time < time) {
                                        //File has been modified
                                        newList = true;
                                        logger.log(caller, 'DEBUG', 'Update file: ' + files[i]);
                                        this.mediaList[mediaId].size = fileStats.size,
                                        this.mediaList[mediaId].time = time,
                                        //Set status to modified
                                        this.mediaList[mediaId].status = 'modified';
                                    } else
                                        this.mediaList[mediaId].status = 'found';
                                    break;
                                }
                            }
                            if(!found) {
                                //New media
                                newList = true;
                                //Add new media in list and set status to new
                                var fileStats= fs.statSync(this.dirToScan + '/' + files[i]);
                                //var fileTime = (fileStats.mtime > fileStats.ctime) ? fileStats.mtime : fileStats.ctime;
                                var date = new Date(util.inspect(fileStats.ctime));
                                var time = date.getTime();
                                logger.log(caller, 'DEBUG', 'Add new media: ' + files[i] + ', size: ' + fileStats.size + ', time: ' + time);
                                this.mediaList.push({
                                    name: files[i],
                                    path: this.dirToScan + '/' + files[i],
                                    size: fileStats.size,
                                    time: time,
                                    status: 'new'
                                });
                            }
                        }
                    }
                    //Now clean mediaList
                    var mediaIdToRemove = [];
                    for(var id=0; id<this.mediaList.length; id++) {
                        if(this.mediaList[id].status == 'idle') {
                            newList = true;
                            mediaIdToRemove.push(id);
                        }
                    }
                    for (var id=mediaIdToRemove.length-1; id>=0; id--)
                        this.mediaList.splice(mediaIdToRemove[id],1);
                    //Sort by time
                    this.mediaList.sort((a,b) => (a.time < b.time) ? 1 : -1);
                    var fileList = [];
                    for(var id=0; id<this.mediaList.length; id++)
                        fileList.push(this.mediaList[id].path);
                    //Call onchange if needed
                    if(newList) {
                        logger.log(caller, 'INFO2', 'NewList. mediaList length: ' + this.mediaList.length);
                        for(var id=0; id<this.mediaList.length; id++) {
                            logger.log(caller, 'DEBUG', 'file: ' + this.mediaList[id].name + ', time: ' + this.mediaList[id].time);
                        }
                        logger.log(caller, 'INFO2', 'Call onChange callback');
                        this.onChange(fileList, this.restart);
                    } else
                        //Just restart then
                        this.restart();
                }
            });
        }
        if(this.dirToScan) {
            logger.log(caller, 'INFO0', 'ScanDir service started on directory: ' + this.dirToScan);
            this.startScan();
            callback();
        } else {
            logger.log(caller, 'ERROR', 'ERROR: dir to scan is undefined. Service not started');
            var err = {msg: 'Cannot start scan'};
            callback(err);
        }
    }
    stopService(callback) {
        var caller = 'stopService';
        if(this.timer)
            clearTimeout(this.timer);
        callback();
    }
    getFileList(callback) {
        var caller = 'getFileList';
        //Return current directory file list.
        fs.readdir(this.dirToScan, (error, files) => {
            if(error)
                logger.log(caller, 'ERROR', 'ERROR: fs.readdir failed');
            else {
                var currMediaList = [];
                for(var i=0; i<files.length; i++) {
                    //Check it's not a directory
                    if(!files[i].isDir) {
                        currMediaList[i] = new Object();
                        var fileStats= fs.statSync(this.dirToScan + '/' + files[i]);
                        //var fileTime = (fileStats.mtime > fileStats.ctime) ? fileStats.mtime : fileStats.ctime;
                        var time = new Date(util.inspect(fileStats.ctime)).getTime();
                        currMediaList[i] = {
                            time: time,
                            path: this.dirToScan + '/' + files[i]
                        }
                    }
                }
                //Sort by time
                this.currMediaList.sort((a,b) => (a.time < b.time) ? 1 : -1);
                var fileList = [];
                for(var id=0; id<this.currMediaList.length; id++)
                    fileList.push(currMediaList[id].path);
            }
            callback(error, fileList);
        });
    }
}
module.exports = ScanDir;