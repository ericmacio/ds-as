import React, { useContext } from 'react';
import { MainContext } from '../providers/MainProvider';
import '../stylesheets/AppSummary.css';

const AppSummary = ({ name, color, services }) => {
    const { Icons: { AppsIcon } } = useContext(MainContext);
    return(
        <div className='appsummary'>
            <AppsIcon size='20' color={color}/>
            <div className='appsummary-appName'>{name}</div>
            <div className='appsummary-appNb'>Services: {JSON.stringify(services)}</div>
        </div>
    )
}
export default AppSummary