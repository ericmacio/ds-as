import React from 'react';
import { BsX } from 'react-icons/bs';
import LogFile from './LogFile';
import '../stylesheets/LogFiles.css';

const LogFiles = ({ loading, logFiles, onSetFileName, onClose }) => {
    return (
        <div className='gb-background-box gb-items logfiles-items'>
            <div className='gb-color-box gb-items-menu'>
                <BsX size={15} onClick={onClose} className='gb-items-menu-close' />
            </div>
            <div className='gb-title-color gb-items-title'>Log files</div>
            <div className='gb-items-list logfiles-list'>
                {loading ? 'loading' : logFiles.map((fileName, id) => <LogFile key={id} fileName={fileName} onSetFileName={onSetFileName} />)} 
            </div>
        </div>
    )
} 
export default LogFiles;