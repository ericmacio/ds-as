import React, { useContext } from 'react';
import { FaRegPlayCircle, FaRegStopCircle, FaPencilAlt } from 'react-icons/fa';
import { BsFillTrashFill } from 'react-icons/bs';
import { NavLink } from 'react-router-dom';
import UseAnimations from "react-useanimations";
import loading from 'react-useanimations/lib/loading';
import { MainContext } from '../providers/MainProvider';
import { ServiceContext } from '../providers/ServiceProvider';
import '../stylesheets/Service.css';

const Service = ( { id, app, name, status, color }) => {
    const { Icons: { ServicesIcon } } = useContext(MainContext);
    const { openEditService, onStartStop, openRemoveService } = useContext(ServiceContext);
    const statusClassName = (status == 'error') ? 
        'boxes-serviceStatusError' : (status == 'running') ? 
        'boxes-serviceStatusRunning' : ((status == 'starting') || (status == 'stopping')) ?
        'boxes-serviceStatusIdle' : 'boxes-serviceStatus';
    return(
        <>
            <div className='gb-background-box gb-box boxes-service'>
                <div className='gb-color-box gb-box-menu'>
                    <FaPencilAlt size={15} onClick={() => openEditService(id)} />
                    <BsFillTrashFill size={15} onClick={() => openRemoveService(id)} />
                </div>
                <NavLink to={`/services/${id}`}>
                    <div className='boxes-service-data'>
                        <ServicesIcon size='20' color={color} />
                        <div className='boxes-serviceName'>{name}</div>
                        <div className='boxes-appName'>{app}</div>
                        <div className={statusClassName}>{status}</div>
                    </div>
                </NavLink>
                {(status == 'stopped' || status == 'error') && <FaRegPlayCircle size={25} onClick={() => onStartStop(id, 'start')} className='boxes-start' />}
                {(status == 'running') && <FaRegStopCircle size={25} onClick={() => onStartStop(id, 'stop')} className='boxes-stop' />}
                {(status == 'starting' || status == 'stopping') && <UseAnimations animation={loading} size={25} className='boxes-loading' />}
            </div>
        </>
    )
} 
export default Service