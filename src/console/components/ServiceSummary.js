import React, { useContext } from 'react';
import { MainContext } from '../providers/MainProvider';
import '../stylesheets/ServiceSummary.css';

const ServicesSummary = (service) => {
    const { app, name, status, color } = service;
    const { Icons: { ServicesIcon } } = useContext(MainContext);
    const statusClassName = (status == 'error') ? 
        'servicesummary-serviceStatusError' : (status == 'running') ? 
        'servicesummary-serviceStatusRunning' : ((status == 'starting') || (status == 'stopping')) ?
        'servicesummary-serviceStatusIdle' : 'servicesummary-serviceStatus';
    return(
        <div className='servicesummary'>
            <ServicesIcon size='20' color={color} />
            <div className='servicesummary-serviceName'>{name}</div>
            <div className='servicesummary-appName'>{app}</div>
            <div className={statusClassName}>{status}</div>
        </div>
    )
}
export default ServicesSummary