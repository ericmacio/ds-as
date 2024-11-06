import React, { useContext } from 'react';
import { ServiceContext } from '../providers/ServiceProvider';
import ServiceSummary from './ServiceSummary';
import '../stylesheets/ServicesSummary.css';

const ServicesSummary = () => {
    const { services, loading } = useContext(ServiceContext);
    const runningServices = services.filter(service => service.status == 'running');
    return(
        <div className='gb-background-box gb-box gb-summary servicessummary'>
            <div className='gb-summary-title'>Services</div>
            {(loading) ? 
                <div>Loading services ...</div> 
            : 
            <>
                <div className='gb-summary-items'>Number of services: {services.length}</div>
                <div className='gb-summary-items'>Number of running services: {runningServices.length}</div>
                <div className='gb-summary-list'>
                {(services.length == 0) ? <div>No services</div> : services.map((service, id) => <ServiceSummary key={id} {...service} />)}
                </div>
            </>
            }
        </div>
    )
}
export default ServicesSummary