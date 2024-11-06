import React, { useContext } from 'react';
import { FaPencilAlt } from 'react-icons/fa';
import { BsX } from 'react-icons/bs';
import { MainContext } from '../providers/MainProvider';
import { AppContext } from '../providers/AppProvider';
import { ServiceContext } from '../providers/ServiceProvider';
import '../stylesheets/AppDetailsItems.css';

const AppDetailsItems = ({ app, onClose }) => {
    const { displayErrorMsg} = useContext(MainContext);
    const { openEditApp } = useContext(AppContext);
    const { name, scope, srcFile, origSrcFileName, creationDate, lastModificationDate, owner, organization } = app;
    const { services } = useContext(ServiceContext);
    const onEdit = (id) => {
        const runningAppServices = services.filter(service => (service.app == name && service.status != 'stopped' && service.status != 'error')).map(service => service.name);
        if(runningAppServices.length > 0) {
            displayErrorMsg('Cannot modify app. You must first stop some services that are still running: ' + JSON.stringify(runningAppServices));
        } else {
            openEditApp(id);
        }
    }
    return(
        <div className='gb-background-box gb-items app-items'>
            <div className='gb-color-box gb-items-menu'>
                <FaPencilAlt size={15} onClick={() => onEdit(app.id)} className='gb-items-menu-edit' />
                <BsX size={15} onClick={onClose} className='gb-items-menu-close' />
            </div>
            <div className='gb-title-color gb-items-title'>Properties</div>
            <div className='gb-items-list'>
                <div className='gb-items-data'>Name: {name}</div>
                <div className='gb-items-data'>Owner: {owner}</div>
                <div className='gb-items-data'>Scope: {scope}</div>
                <div className='gb-items-data'>Organization: {organization}</div>
                <div className='gb-items-data'>Source file name: {srcFile}</div>
                <div className='gb-items-data'>Originate source file name: {origSrcFileName}</div>
                <div className='gb-items-data'>Creation date: {creationDate}</div>
                <div className='gb-items-data'>Last modification date: {lastModificationDate}</div>
            </div>
        </div>
    )
}
export default AppDetailsItems;