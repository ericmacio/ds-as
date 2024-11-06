import React, { useContext } from 'react';
import { FaPencilAlt } from 'react-icons/fa';
import { BsX } from 'react-icons/bs';
import { ServiceContext } from '../providers/ServiceProvider';
import '../stylesheets/ServiceDetailsItems.css';

const ServiceDetailsItems = ({ service, onClose }) => {
    const { openEditService } = useContext(ServiceContext);
    return(
        <div className='gb-background-box gb-items service-items'>
            <>
            <div className='gb-color-box gb-items-menu'>
                <FaPencilAlt size={15} onClick={() => openEditService(service.id)} className='gb-items-menu-edit' />
                <BsX size={15} onClick={onClose} className='gb-items-menu-close' />
            </div>
            <div className='gb-title-color gb-items-title'>Properties</div>
            <div className='gb-items-list'>
                <div className='gb-items-data'>App: {service.app}</div>
                <div className='gb-items-data'>Name: {service.name}</div>
                <div className='gb-items-data'>User: {service.user}</div>
                <div className='gb-items-data'>API url: {service.apiUrl}</div>
                <div className='gb-items-data'>API port: {service.apiPort}</div>
                <div className='gb-items-data'>Owner: {service.owner}</div>
                <div className='gb-items-data'>Creation date: {service.creationDate}</div>
                <div className='gb-items-data'>Group: {service.group}</div>
                <div className='gb-items-data'>Organization: {service.organization}</div>
                <div className='gb-items-data'>Color: {service.color}</div>
                <div className='gb-items-data'>configFileName: {service.configFileName}</div>
                <div className='gb-items-data'>Scope: {service.scope}</div>
            </div>
            </>
        </div>
    )
}
export default ServiceDetailsItems