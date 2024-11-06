import React from 'react';
import { BsX } from 'react-icons/bs';
import '../stylesheets/LogView.css';

const LogView = ({ loadingFileData, logFileName, logFileData=[], onClose }) => {
    return (
        <div className='gb-background-box gb-items logview'>
            <div className='gb-color-box gb-items-menu'>
                <BsX size={15} onClick={onClose} className='gb-items-menu-close' />
            </div>
            <div className='gb-title-color gb-items-title'>Log file: {logFileName}</div>
            <div className='logview-txt'>
                {loadingFileData ? logFileName ? 'loading file data' : 'Select a log file in the list' : logFileData}
            </div>
        </div>
    )
}
export default LogView