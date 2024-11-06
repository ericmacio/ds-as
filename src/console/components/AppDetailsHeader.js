import React from 'react';
import { FaScroll, FaGlobe } from 'react-icons/fa';
import '../stylesheets/AppDetailsHeader.css';

const AppDetailsHeader = ({ app, appView, appServicesView, srcView, changeAppView, changeAppServicesView, changeSrcView }) => {
    const { name, color } = app;
    const appViewClassName = appView ? 'gb-header-viewMenu-enable' : 'gb-header-viewMenu-disable';
    const appServicesViewClassName = appServicesView ? 'gb-header-viewMenu-enable' : 'gb-header-viewMenu-disable';
    const srcViewClassName = srcView ? 'gb-header-viewMenu-enable' : 'gb-header-viewMenu-disable';
    return (
        <div className='gb-header-color gb-background-box gb-header'>
            <FaGlobe size='24' color={color} />
            <div className='gb-header-name'>{name}</div>
            <div className = 'gb-header-viewMenu'>
                <FaGlobe size={20} className={appViewClassName} onClick={() => changeAppView()} />
                <FaGlobe size={20} className={appServicesViewClassName} onClick={() => changeAppServicesView()} />
                <FaScroll size={20} className={srcViewClassName} onClick={() => changeSrcView()} />
            </div>
        </div>
    )
}
export default AppDetailsHeader;