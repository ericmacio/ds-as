import React, { useContext, useState, useEffect } from 'react';
import { ServiceContext } from '../providers/ServiceProvider';
import AppDetailsHeader from './AppDetailsHeader';
import AppDetailsItems from './AppDetailsItems';
import AppServices from './AppServices';
import AppSrc from './AppSrc';
import { getAppSrc } from '../utils/Api';
import '../stylesheets/AppDetails.css';

const AppDetails = ({ app }) => {
    const [appSrc, setAppSrc] = useState();
    const [appView, setAppView] = useState(true);
    const [appServicesView, setAppServicesView] = useState(true);
    const [srcView, setSrcView] = useState(true);
    const { services } = useContext(ServiceContext);
    const appServices = services.filter(service => service.app == app.name).map(service => service.name);
    const getServerAppSrc = async(id) => {
        try{
            const result = await getAppSrc(id);
            if(!result.ok)
                console.log('ERROR: getAppSrc result is ko');
            else {
                setAppSrc(result.data);
            }
        } catch(error) {
            console.log('ERROR: getAppSrc failed');
        }
    }
    //useEffect
    useEffect(() => {
        //Get app src
       getServerAppSrc(app.id);
    }, [app]);
    return (
        <div className='gb-details'>
            <AppDetailsHeader app={app} appView={appView} appServicesView={appServicesView} srcView={srcView} 
                changeAppView={() => setAppView(view => !view)}
                changeAppServicesView={() => setAppServicesView(view => !view)}
                changeSrcView={() => setSrcView(view => !view)} />
            <div className='gb-details-view'>
                {appView && <AppDetailsItems app={app} onClose={() => setAppView(false)} />}
                {appServicesView && <AppServices appServices={appServices} onClose={() => setAppServicesView(false)} />}
                {srcView && <AppSrc src={appSrc} onClose={() => setSrcView(false)} />}
            </div>
        </div>
    )
} 
export default AppDetails;