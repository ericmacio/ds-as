import React from 'react';
import '../stylesheets/LogFile.css';

const LogFile = ({ fileName, onSetFileName }) => {
    return (
        <button className='logfile-name' onClick={() => onSetFileName(fileName)}>
            {fileName}
        </button>
    )
} 
export default LogFile;