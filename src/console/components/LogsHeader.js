import React from 'react';
import { FaScroll, FaRegListAlt } from 'react-icons/fa';
import '../stylesheets/LogsHeader.css';

const LogsHeader = ({ logFilesView, logView, changeLogFilesView, changeLogView }) => {
    const logFilesViewClassName = logFilesView ? 'gb-header-viewMenu-enable' : 'gb-header-viewMenu-disable';
    const logViewClassName = logView ? 'gb-header-viewMenu-enable' : 'gb-header-viewMenu-disable';
    return (
        <div className='gb-header-color gb-background-box gb-header'>
            <div className = 'gb-header-viewMenu'>
                <FaRegListAlt size={20} className={logFilesViewClassName} onClick={() => changeLogFilesView()} />
                <FaScroll size={20} className={logViewClassName} onClick={() => changeLogView()} />
            </div>
        </div>
    )
}
export default LogsHeader;