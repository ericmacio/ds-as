import React, { useState, useContext } from 'react';
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';
import { FaPencilAlt, FaSave } from 'react-icons/fa';
import { BsX } from 'react-icons/bs';
import { ServiceContext } from '../providers/ServiceProvider';
import '../stylesheets/ServiceConfig.css';

const ServiceConfig = ({ service, onClose }) => {
    const { onSaveConfig } = useContext(ServiceContext);
    const { configData } = service;
    const [viewOnly, setViewOnly] = useState(true);
    const [newConfigData, setNewConfigData] = useState(JSON.stringify(configData));
    const onEdit = () => {
        if(viewOnly)
            setViewOnly(false);
        else {
            setViewOnly(true);
            onSaveConfig(service, newConfigData);
        }
    }
    const onCancel = () => {
        setViewOnly(true);
    }
    const onChange = ( { json }) => {
        setNewConfigData(json);
    }
    return(
        <div className='gb-background-box gb-items service-config'>
            {viewOnly ?
            <>
                <div className='gb-color-box gb-items-menu'>
                    <FaPencilAlt size={15} onClick={onEdit} className='gb-items-menu-edit' />
                    <BsX size={15} onClick={onClose} className='gb-items-menu-close' />
                </div>
                <div className='gb-title-color gb-items-title'>Configuration</div>
                <div className='service-config-file'>{JSON.stringify(configData, null, 2)}</div>
            </>
            :
            <>
                <div className='gb-color-box gb-items-menu'>
                    <FaSave size={15} onClick={onEdit} className='service-config-menu-save' />
                    <button onClick={onCancel} className='service-config-menu-cancel'>Cancel</button>
                </div>
                <div className='gb-title-color gb-items-title'>Configuration</div>
                <div className='service-config-file'>
                    <JSONInput
                        id='1'
                        placeholder = { configData }
                        locale      = { locale }
                        height = '100%'
                        width = '100%'
                        onChange = { onChange }
                        waitAfterKeyPress = { 1000 }
                    />
                </div>
            </>
            }
        </div>
    )
}
export default ServiceConfig