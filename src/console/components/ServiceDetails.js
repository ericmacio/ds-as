import React, { useState } from 'react';
import ServiceDetailsHeader from './ServiceDetailsHeader';
import ServiceDetailsItems from './ServiceDetailsItems';
import ServiceConfig from './ServiceConfig';
import LogsLive from './LogsLive';
import '../stylesheets/ServiceDetails.css';

const ServiceDetails = ({ service }) => {
    const [serviceView, setServiceView] = useState(true);
    const [logsView, setLogsView] = useState(true);
    const [configView, setConfigView] = useState(true);
    return(
        <div className='gb-details'>
            <ServiceDetailsHeader service={service} serviceView={serviceView} logsView={logsView} configView={configView} 
                changeServiceView={() => setServiceView(view => !view)} 
                changeLogsView={() => setLogsView(view => !view)} 
                changeConfigView={() => setConfigView(view => !view)} />
            <div className='gb-details-view'>
                {serviceView && <ServiceDetailsItems service={service} onClose={() => setServiceView(false)} />}
                {configView && <ServiceConfig service={service} onClose={() => setConfigView(false)} />}
                {logsView && <LogsLive context='servicedetails' onClose={() => setLogsView(false)}/>}
            </div>
        </div>
    )
} 
export default ServiceDetails