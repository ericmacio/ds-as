import React, { useContext } from 'react';
import { FaRegPlayCircle, FaRegStopCircle, FaScroll, FaRegListAlt, FaGlobe } from 'react-icons/fa';
import UseAnimations from "react-useanimations";
import loading from 'react-useanimations/lib/loading';
import { ServiceContext } from '../providers/ServiceProvider';
import '../stylesheets/ServiceDetailsHeader.css';

const ServiceDetailsHeader = ({ service, serviceView, logsView, configView, changeServiceView, changeLogsView, changeConfigView }) => {
    const { onStartStop } = useContext(ServiceContext);
    const { status, id, name, color } = service;
    var statusClassName = (status == 'error') ? 'error' : (status == 'running') ? 'running' : ((status == 'starting') || (status == 'stopping')) ? 'idle' : 'stopped';
    var serviceViewClassName, configViewClassName, logsViewClassName;
    serviceView ? serviceViewClassName = 'gb-header-viewMenu-enable' : serviceViewClassName = 'gb-header-viewMenu-disable';
    configView ? configViewClassName = 'gb-header-viewMenu-enable' : configViewClassName = 'gb-header-viewMenu-disable';
    logsView ? logsViewClassName = 'gb-header-viewMenu-enable' : logsViewClassName = 'gb-header-viewMenu-disable';
    return(
        <div className='gb-header-color gb-background-box gb-header'>
            <FaGlobe size='24' color={color} />
            <div className='gb-header-name'>{name}</div>
            <div className='servicedetails-header-status-title'>Status: </div>
            <div className={`servicedetails-header-status ${statusClassName}`}>{status}</div>
            {(status == 'stopped' || status == 'error') && <FaRegPlayCircle size={24} onClick={() => onStartStop(id, 'start')} className='servicedetails-header-start' />}
            {(status == 'running') && <FaRegStopCircle size={24} onClick={() => onStartStop(id, 'stop')} className='servicedetails-header-stop' />}
            {(status == 'starting' || status == 'stopping') && <UseAnimations animation={loading} size={18} className='servicedetails-header-loading' />}
            <div className = 'gb-header-viewMenu'>
                <FaGlobe size={20} className={serviceViewClassName} onClick={() => changeServiceView()} />
                <FaRegListAlt size={20} className={configViewClassName} onClick={() => changeConfigView()} />
                <FaScroll size={20} className={logsViewClassName} onClick={() => changeLogsView()} />
            </div>
        </div>
    )
} 
export default ServiceDetailsHeader;