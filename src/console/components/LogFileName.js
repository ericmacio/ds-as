import React from 'react';
import '../stylesheets/LogFileName.css';

const LogFileName = ({logFilesList=[], logFileName, onClick}) => {
    //console.log('LogFileName rendered. logFileName: ' + logFileName);
    return(
        <div className = 'logfilename-select'>
            <div className='logfilename-title'>Log file: </div>
            <select className='logfilename-list' value={logFileName} onChange={onClick} >
                {logFilesList.map((file, i) => 
                    <option key={i} value={file.logFileName} label={file.logFileName} />
                )}
            </select>
        </div>
    )
}
export default LogFileName