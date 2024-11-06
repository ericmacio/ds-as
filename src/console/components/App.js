import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { FaPencilAlt } from 'react-icons/fa';
import { BsFillTrashFill } from 'react-icons/bs';
import { MainContext } from '../providers/MainProvider';
import { AppContext } from '../providers/AppProvider';
import { ServiceContext } from '../providers/ServiceProvider';
import '../stylesheets/App.css';

const App = ({ id, name, srcFile, color }) => {
    const { displayErrorMsg, Icons: { AppsIcon }} = useContext(MainContext);
    const { openEditApp,  openRemoveApp} = useContext(AppContext);
    const { services } = useContext(ServiceContext);
    const onEdit = (id) => {
        //Get list of services currently running for this app
        const runningAppServices = services.filter(service => (service.app == name && service.status != 'stopped' && service.status != 'error')).map(service => service.name);
        if(runningAppServices.length > 0) {
            displayErrorMsg('Cannot modify app. You must first stop some services that are still running: ' + JSON.stringify(runningAppServices));
        } else {
            openEditApp(id);
        }
    }
    const onDelete = (id) => {
        const appServices = services.filter(service => service.app == name).map(service => service.name);
        if(appServices.length > 0) {
            displayErrorMsg('Cannot delete app. You must first delete services associated to it: ' + JSON.stringify(appServices));
        } else {
            openRemoveApp(id);
        }
    }
    return(
        <div className='gb-background-box gb-box app'>
            <div className='gb-color-box gb-box-menu'>
                <FaPencilAlt size={15} onClick={() => onEdit(id)} />
                <BsFillTrashFill size={15} onClick={() => onDelete(id)} />
            </div>
            <NavLink className='app-link' to={`/apps/${id}`}>
                <div className='app-item'>
                    <AppsIcon size={30} color={color} className='app-item-avatar' />
                    <div className='app-item-name'>{name}</div>
                    <div className='app-item-data'>src: {srcFile}</div>
                </div>
            </NavLink>
        </div>
    )
}
export default App