import React from 'react';
import '../stylesheets/LogLevel.css';

const LogLevel = ({logLevelList, logLevelName, onClick}) => {
    //console.log('LogLevel rendered');
    //console.log('logLevelName: ' + logLevelName);
    var logLevelArray = [];
    for(var name in logLevelList)
        logLevelArray.push({name: name, value: logLevelList[name]});
    return(
        <div className = 'selectLevel'>
            <div className='title'>Level: </div>
            <select className='list' value={logLevelName} onChange={onClick} >
                {logLevelArray.map(({name}, i) => 
                    <option key={i} value={name} label={name} />
                )}
            </select>
        </div>
    )
}
export default LogLevel