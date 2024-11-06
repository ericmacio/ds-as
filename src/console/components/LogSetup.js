import React from 'react';
import LogFileName from './LogFileName';
import LogLevel from './LogLevel';
import LogService from './LogService';
import CheckboxList from './CheckboxList';
import '../stylesheets/LogSetup.css';

const LogSetup = ({context, serviceName, logConfig=[], onClick}) => {
    //console.log('LogSetup rendered');
    const {logLevelList, logLevelName, logTypeList, logFormatList, logServiceList, logServiceName, logFilesList, logFileName} = logConfig;
    const {onClickLogLevel, onClickLogType, onClickLogFormat, onClickLogServiceName, onClickLogFileName} = onClick;
    const selectServiceName = serviceName ? serviceName : logServiceName;
    //Seletor is not working as not dependant on the service name but on the app parameter of logger actually
    const displayServiceList = false;
    return(
        <div className = {`logsetup-${context}`}>
            <LogFileName logFilesList={logFilesList} logFileName={logFileName} onClick={onClickLogFileName} />
            <LogLevel logLevelList={logLevelList} logLevelName={logLevelName} onClick={onClickLogLevel} />
            {displayServiceList && <LogService logServiceList={logServiceList} logServiceName={selectServiceName} onClick={onClickLogServiceName} />}
            <CheckboxList checkboxList={logTypeList} title='Type' className='checkboxlist' titleClassName='checkboxTitle' onClick={onClickLogType}  />
            <CheckboxList checkboxList={logFormatList} title='Format' className='checkboxlist' titleClassName='checkboxTitle' onClick={onClickLogFormat}  />
        </div>
    )
}
export default LogSetup