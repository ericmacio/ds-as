import React, { useState, useEffect } from 'react';
import { BsX } from 'react-icons/bs';
import LogSetup from './LogSetup';
import LogDisplay from './LogDisplay';
import { getLogConfig, updateLogConfig, getLogFileData } from '../utils/Api';
import '../stylesheets/LogsLive.css';

var ws, lastMsgRef;
var msgBuffer = [];
var inProgress = false;
const MaxLogMsg = 300;

const LogsLive = ( {context, serviceName, onClose} ) => {
    const [wsConfig, setWsConfig] = useState();
    const [logConfig, setLogConfig] = useState();
    const [logFileName, setLogFileName] = useState();
    const [logMsgChildren, setLogMsgChildren] = useState([]);
    const [configIsReady, setConfigIsReady] = useState(false);
    //handleMessage
    const handleMessage = (msg) => {
        if(msg.type == 'LogMessage') {
            var logText = '';
            for(var key in logConfig.logFormatList) {
                if(logConfig.logFormatList[key])
                    logText += " [" + msg[key] + "] ";
            }
            logText +=  msg.text;
            //console.log('Receive Log message: ' + logText);
            msgBuffer.push(logText);
            //If we have received new messages whereas the previous update has not completed yet
            //we must bufferize the messages for a later update after the next render
            if(!inProgress) {
                inProgress = true;
                //console.log('logMsgChildren length: ' + logMsgChildren.length);
                //Limit the number of msg to 200 only
                const newLogMsgChildren = [...logMsgChildren.slice(-MaxLogMsg), ...msgBuffer];
                msgBuffer = [];
                setLogMsgChildren(newLogMsgChildren);
            }
        } else
            console.log('ERROR: unknown msg type: ' + msg.type)
    }
    //setLastMsgRef
    const setLastMsgRef = (ref) => {
        //console.log('Set ref');
        lastMsgRef = ref;
    }
    //scrollToBottom
    const scrollToBottom = () => {
        if(lastMsgRef)
            lastMsgRef.scrollIntoView({ behavior: "smooth" });
    }
    const setConfig = async(data) => {
        try {
            const result = await updateLogConfig(ws.clientId, data)
            if(!result.ok) console.log('ERROR: updateLogConfig failed');
            return result;
        } catch(error) {
            console.log('ERROR: updateLogConfig failed: ' + error);
            return {ok: false};
        }
    }
    const onClickLogLevel = async(event) => {
        const logData = {
            logLevelName: event.target.value,
            logTypeList: logConfig.logTypeList,
            logServiceName: logConfig.logServiceName,
            logFileName: logConfig.logFileName
        }
        const result = await setConfig(logData);
        if(!result.ok)
            console.log('ERROR: setConfig failed');
        else {
            //Get value from server response. Should be the same
            const newLogLevelName = result.data.logLevelName;
            //Send it to the logServer so that it can update values
            let msg = {
                type: 'setConfig',
                data: {
                    clientId: ws.clientId,
                    logLevelName: newLogLevelName,
                    logTypeList: logConfig.logTypeList,
                    logServiceName: logConfig.logServiceName,
                    logFileName: logConfig.logFileName
                }
            }
            ws.send(JSON.stringify(msg));
            //Update local states
            const newLogConfig = {...logConfig, logLevelName: newLogLevelName};
            setLogConfig(newLogConfig);
        }
    }
    const onClickLogType = async(event) => {
        const name = event.target.name;
        const status = !(logConfig.logTypeList[name]);
        //console.log('OnClick log type. Name: ' + name + ', new status: ' + status);
        const logData = {
            logLevelName: logConfig.logLevelName,
            logTypeList: {...logConfig.logTypeList, [name]: status},
            logServiceName: logConfig.logServiceName,
            logFileName: logConfig.logFileName
        }
        const result = await setConfig(logData);
        if(!result.ok)
            console.log('ERROR: setConfig failed');
        else {
            const newLogTypeList = result.data.logTypeList;
            let msg = {
                type: 'setConfig',
                data: {
                    clientId: ws.clientId,
                    logLevelName: logConfig.logLevelName,
                    logServiceName: logConfig.logServiceName,
                    logFileName: logConfig.logFileName,
                    logTypeList: newLogTypeList
                }
            }
            ws.send(JSON.stringify(msg));
            const newLogConfig = {...logConfig, logTypeList: newLogTypeList};
            setLogConfig(newLogConfig);
        }
    }
    const onClickLogFormat = (event) => {
        const name = event.target.name;
        const status = logConfig.logFormatList[name];
        //console.log('OnClick log format. Name: ' + name + ', status: ' + status);
        const newLogFormat = {...logConfig, logFormatList: {...logConfig.logFormatList, [name]: !status}};
        setLogConfig(newLogFormat);
    }
    const onClickLogServiceName = async(event) => {
        const logData = {
            logServiceName: event.target.value,
            logFileName: logConfig.logFileName,
            logLevelName: logConfig.logLevelName,
            logTypeList: logConfig.logTypeList
        }
        console.log('logServiceName: ' + logData.logServiceName);
        const result = await setConfig(logData);
        if(!result.ok)
            console.log('ERROR: setConfig failed');
        else {
            //Get value from server response. Should be the same
            const logServiceName = result.data.logServiceName;
            //Send it to the logServer so that it can update values
            let msg = {
                type: 'setConfig',
                data: {
                    clientId: ws.clientId,
                    logServiceName: logServiceName,
                    logFileName: logConfig.logFileName,
                    logLevelName: logConfig.logLevelName,
                    logTypeList: logConfig.logTypeList
                }
            }
            ws.send(JSON.stringify(msg));
            //Update local states
            const newLogConfig = {...logConfig, logServiceName: logServiceName};
            setLogConfig(newLogConfig);
        }
    }
    const onClickLogFileName = async(event) => {
        const logData = {
            logFileName: event.target.value,
            logServiceName: logConfig.logServiceName,
            logLevelName: logConfig.logLevelName,
            logTypeList: logConfig.logTypeList
        }
        const result = await setConfig(logData);
        if(!result.ok)
            console.log('ERROR: setConfig failed');
        else {
            //Get value from server response. Should be the same
            const logFileName = result.data.logFileName;
            //Send it to the logServer so that it can update values
            let msg = {
                type: 'setConfig',
                data: {
                    clientId: ws.clientId,
                    logFileName: logFileName,
                    logServiceName: logConfig.logServiceName,
                    logLevelName: logConfig.logLevelName,
                    logTypeList: logConfig.logTypeList
                }
            }
            ws.send(JSON.stringify(msg));
            //Update local states
            const newLogConfig = {...logConfig, logFileName: logFileName};
            setLogFileName(logFileName);
            setLogConfig(newLogConfig);
        }
    }
    const onClick = {onClickLogLevel, onClickLogType, onClickLogFormat, onClickLogServiceName, onClickLogFileName};
    const getLogFile = async(fileName) => {
        try{
            const result = await getLogFileData(fileName);
            if(!result.ok)
                console.log('ERROR: getLogFiles result is ko');
            else {
                const logFileData = result.data.split('\n');
                console.log('logFileData length: ' + logFileData.length);
                setLogMsgChildren(logFileData);
            }
        } catch(error) {
            console.log('ERROR: getLogFiles failed');
        }
    }
    //useEffect
    useEffect(() => {
        //Get log file data
        logFileName && getLogFile(logFileName);
    }, [logFileName]);
    useEffect(() => {
        //Get log file data
        logConfig && setLogFileName(logConfig.logFileName);
    }, [logConfig]);
    //useEffect
    useEffect(() => {
        //If we are here that means that the preious update of logMsgChildren has completed
        inProgress = false;
        scrollToBottom();
        if(msgBuffer.length > 0) {
            //console.log('Update logMsgChildren from useEffect. Buffer length: ' + msgBuffer.length);
            inProgress = true;
            //console.log('logMsgChildren length: ' + logMsgChildren.length);
            const newLogMsgChildren = [...logMsgChildren.slice(-MaxLogMsg), ...msgBuffer];
            msgBuffer = [];
            setLogMsgChildren(newLogMsgChildren);
        }
    }, [logMsgChildren]);
    //useEffect
    useEffect(() => {
        const getConfig = async () => {
            //get config from server
            try {
                const result = await getLogConfig();
                if(!result.ok)
                    console.log('ERROR: getLogConfig failed');
                else {
                    setWsConfig(result.data.wsConfig);
                    setLogConfig(result.data.logConfig);
                }
                return result;
            } catch(error) {
                console.log('ERROR: getLogConfig failed: ' + error);
                return {ok: false};
            }
        }
        //Get configuration
        getConfig().then((result) => result.ok ? console.log('getConfig done') : console.log('getConfig failed'));
    }, []);
    //useEffect
    useEffect(() => {
        //Set configIsReady so that we can open the webSocket afterwards
        if(!configIsReady && (logConfig && wsConfig)) {
            setConfigIsReady(true);
        }
    }, [logConfig, wsConfig]);
    //useEffect
    useEffect(() => {
        if(!configIsReady) return;
        //Called only once after configIsReady has been set to true
        if(!ws || (ws && (ws.readyState == WebSocket.CLOSED))) {
            const wsServer = wsConfig.url + wsConfig.ip + ":" + wsConfig.port;
            ws = new WebSocket(wsServer);
        }
        ws.onopen = () => {
            const logData = {
                logLevelName: logConfig.logLevelName,
                logFileName: logConfig.logFileName,
                logTypeList: logConfig.logTypeList,
                logServiceName: logConfig.logServiceName,
                logServiceList: logConfig.logServiceList
            }
            const helloMsg = {type: 'hello', data: logData};
            ws.send(JSON.stringify(helloMsg));
        };
        //Warning the return function is called whenever the useEffect needs to be called again after a re-rendering
        return () => {
            //Close the web socket when unmounting the component
            if(ws && (ws.readyState == WebSocket.OPEN)) {
                ws.close();
            }
        }
    }, [configIsReady]);
    //useEffect
    useEffect(() => {
        if(!ws) return;
        ws.onmessage = (event) => {
            var msg = JSON.parse(event.data);
            if(msg.type == 'helloResponse') {
                ws.clientId = msg.clientId;
                console.log('Connected to log web socket. Client id: ' + ws.clientId);
            } else
                handleMessage(msg);
        };
        ws.onclose = () => {
            ws.close();
        };
    }, [configIsReady, logMsgChildren]);
    return(
        <div className='gb-background-box logs'>
            <div className='gb-color-box logs-menu'>
                {(context == 'servicedetails' || context == 'agentdetails') ? <BsX size={15} onClick={onClose} className='logs-close' /> : null}
            </div>
            <LogSetup context={context} serviceName={serviceName} logConfig={logConfig} onClick={onClick} />
            <LogDisplay context={context} logMsgChildren={logMsgChildren} setLastMsgRef={setLastMsgRef} />
        </div>
    )
}
export default LogsLive;