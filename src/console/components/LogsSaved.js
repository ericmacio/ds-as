import React, { useState, useEffect } from 'react';
import { getLogFilesList, getSavedLogFileData } from '../utils/Api';
import LogFiles from './LogFiles';
import LogsHeader from './LogsHeader';
import LogView from './LogView';
import '../stylesheets/LogsSaved.css';

const LogsSaved = () => {
    const [logFiles, setLogFiles] = useState([]);
    const [logFileName, setLogFileName] = useState();
    const [logFileData, setLogFileData] = useState();
    const [loadingFiles, setLoadingFiles] = useState(true);
    const [loadingFileData, setLoadingFileData] = useState(true);
    const [logFilesView, setLogFilesView] = useState(true);
    const [logView, setLogView] = useState(true);
    const getLogFiles = async() => {
        try{
            const result = await getLogFilesList();
            if(!result.ok)
                console.log('ERROR: getLogFilesList result is ko');
            else {
                setLogFiles([result.data.logFileName, ...result.data.logFileList.filter(file => file != result.data.logFileName)]);
                setLoadingFiles(false);
            }
        } catch(error) {
            console.log('ERROR: getLogFilesList failed: ' + error);
        }
    }
    const getSavedLogFile = async(fileName) => {
        try{
            const result = await getSavedLogFileData(fileName);
            if(!result.ok)
                console.log('ERROR: getLogFiles result is ko');
            else {
                //const logFileData = result.data.split('\n');
                //console.log('logFileData length: ' + logFileData.length);
                setLogFileData(result.data);
                setLoadingFileData(false);
            }
        } catch(error) {
            console.log('ERROR: getLogFiles failed');
        }
    }
    //useEffect
    useEffect(() => {
        //Get log files
        getLogFiles();
    }, []);
     //useEffect
     useEffect(() => {
        //Get log file data
        console.log('logFileName: ' + logFileName);
        logFileName && getSavedLogFile(logFileName);
    }, [logFileName]);
    return (
        <div className='gb-details'>
            <LogsHeader logFilesView={logFilesView} logView={logView}
                changeLogFilesView={() => setLogFilesView(view => !view)}
                changeLogView={() => setLogView(view => !view)} />
            <div className='gb-details-view'>
                {logFilesView && <LogFiles loadingFiles={loadingFiles} logFiles={logFiles} onSetFileName={(fileName) => setLogFileName(fileName)} onClose={() => setLogFilesView(false)}/>}
                {logView && <LogView loadingFileData={loadingFileData} logFileName={logFileName} logFileData={logFileData} onClose={() => setLogView(false)}/>}
            </div>
        </div>
    )
} 
export default LogsSaved;