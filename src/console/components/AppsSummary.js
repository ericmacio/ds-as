import React, { useContext } from 'react';
import { AppContext } from '../providers/AppProvider';
import { ServiceContext } from '../providers/ServiceProvider';
import AppSummary from './AppSummary';
import '../stylesheets/AppsSummary.css';

const AppsSummary = () => {
    const { services } = useContext(ServiceContext);
    const { apps, loading } = useContext(AppContext);
    var appSummaryList = [];
    for(let id=0; id<apps.length; id++)
        appSummaryList.push({name: apps[id].name, color: apps[id].color, services: services.filter(service => service.app == apps[id].name).map(service => (service.name))});
    return(
        <div className='gb-background-box gb-box gb-summary'>
            <div className='gb-summary-title'>Apps</div>
            {(loading) ? 
                <div>Loading apps ...</div> 
            : 
            <>
                <div className='gb-summary-items'>Number of apps: {apps.length}</div>
                <div className='gb-summary-list'>
                {(apps.length == 0) ? <div>No apps</div> : appSummaryList.map((appSummary, id) => <AppSummary key={id} {...appSummary} />)}
                </div>
            </>
            }
        </div>
    )
}
export default AppsSummary;