import React, { useState, useEffect, useContext, createContext } from 'react';
import { MainContext } from './MainProvider';
import AddService from '../components/AddService';
import Dialog from '../components/Dialog';
import { getServices, createService, updateService, deleteService, updateServiceStatus } from '../utils/Api';

var wsService;

export const ServiceContext = createContext();

export const ServiceProvider = ({ children }) => {
    const { loadingConfig, isAuthenticated, config, handleErrorRequest } = useContext(MainContext);
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState([]);
    const [searchServiceInput, setSearchServiceInput] = useState('');
    const [editServiceOpen, setEditServiceOpen] = useState(false);
    const [serviceToEdit, setServiceToEdit] = useState();
    const [serviceToDelete, setServiceToDelete] = useState();
    const [dialogServiceOpen, setDialogServiceOpen] = useState(false);
    //openRemoveService
    const openRemoveService = (id) => {
        const service = services.find(service => service.id == id);
        setServiceToDelete(service);
        setDialogServiceOpen(true);
    }
    //onConfirmServiceDialog
    const onConfirmServiceDialog = () => {
        onRemoveService(serviceToDelete.id);
        setServiceToDelete(null);
        setDialogServiceOpen(false);
    }
    //onCloseServiceDialog
    const onCloseServiceDialog = () => {
        setServiceToDelete(null);
        setDialogServiceOpen(false);
    }
    //onCloseEditService
    const closeEditService = () => {
        setEditServiceOpen(false);
        setServiceToEdit(null);
    }
    //openEditService
    const openEditService = (id) => {
        if(id) {
            const service = services.find(service => service.id == id);
            setServiceToEdit(service);
        }
        setEditServiceOpen(true);
    }
    //setServiceStatus
    const setServiceStatus = (id, status) => {
        const newServices = services.map((service) => (service.id == id) ? {...service, status: status} : service);
        setServices(newServices);
    }
    //onServiceNotification
    const onServiceNotification = (msg) => {
        //We have been notified
        if(msg.type == 'NotifyMessage') {
            const { id, name, status } = msg;
            console.log('Receive service notify message. Id: ' + id + ', Name: ' + name + ', status: ' + status);
            //Update service status
            setServiceStatus(id, status);
        } else
            console.log('ERROR: unknown msg type: ' + msg.type)
    }
    //onStartStop
    const onStartStop = async(id, action) => {
        const service = services.find((service) => (service.id == id));
        if(service) {
            //console.log('Process service request: ' + service.name);
            if((service.status == 'starting') 
            || (service.status == 'stopping') 
            || ((service.status == 'running') && (action == 'start')) 
            || ((service.status == 'stopped') && (action == 'stop'))) {
                console.log('Service state is already ' + service.status + '. Do nothing');
                return;
            }
            const requestStatus = (action == 'start') ? 'starting' : (action == 'stop') ? 'stopping' : null;
            if(requestStatus) {
                setServiceStatus(id, requestStatus);
                try {
                    const result = await updateServiceStatus(id, requestStatus);
                    if(!result.ok) {
                        console.log('ERROR: updateServiceStatus failed');
                        setServiceStatus(id, 'error');
                        handleErrorRequest(result.error);
                    }
                } catch(error) {
                    console.log('ERROR: updateServiceStatus failed: ' + error);
                }
            } else
                console.log('ERROR: Unknown action ' + action);
            //Status will be updated from server notification via web socket once changed on the server
        } else
            console.log('ERROR: Service not found. Id: ' + id);
    }
    const onAddService = async({ id, app, name, configFile, configData, configFileName, apiUrl, apiPort, color, user, password, group, scope }) => {
        const formData = new FormData();
        formData.append('app', app);
        formData.append('name', name);
        //Do not send undefined element
        if(configFile)
            formData.append('configFile', configFile);
        if(configData)
            formData.append('configData', configData);
        formData.append('configFileName', configFileName);
        formData.append('apiUrl', apiUrl);
        formData.append('apiPort', apiPort);
        formData.append('color', color);
        formData.append('user', user);
        //Send password only if set by user
        if(password)
            formData.append('password', password);
        formData.append('group', group);
        formData.append('scope', scope);
        try{
            if(id)
                //Modify existing service
                var result = await updateService(id, formData);
            else
                //Create new service
                var result = await createService(formData);
        } catch(error) {
            console.log('ERROR: updateService or createService failed: ' + error);
        }
        if(!result.ok) {
            console.log('ERROR: createService / updateService result is ko');
            handleErrorRequest(result.error);
        } else {
            //Update Services list
            try {
                const result = await getServices();
                if(!result.ok) {
                    console.log('ERROR: getServices result is ko');
                    handleErrorRequest(result.error);
                } else 
                    setServices(result.data);
            } catch(error) {
                console.log('ERROR: getServices failed: ' + error);
            }
        }
    }
    const onUpdateService = async() => {
        //Update Services list
        console.log('onUpdateService');
        try {
            const result = await getServices();
            if(!result.ok) {
                console.log('ERROR: getServices result is ko');
                handleErrorRequest(result.error);
            } else 
                setServices(result.data);
        } catch(error) {
            console.log('ERROR: getServices failed: ' + error);
        }
    }
    const onRemoveService = async(id) => {
        //Delete the service
        try{
            const result = await deleteService(id);
            if(!result.ok) {
                console.log('ERROR:  deleteService result is ko');
                handleErrorRequest(result.error);
            }
        } catch(error) {
            console.log('ERROR:  deleteService failed: ' + error);
        }
        //Update Services list
        try {
            const result = await getServices();
            if(!result.ok) {
                console.log('ERROR: getServices result is ko');
                handleErrorRequest(result.error);
            } else 
                setServices(result.data);
        } catch(error) {
            console.log('ERROR: getServices failed: ' + error);
        }
    }
    const onSaveConfig = (service, newconfigData) => {
        //console.log('service: ' + service.name + ', newconfigData: ' + newconfigData);
        onAddService({...service, configData: newconfigData});
    }
    const getServerServices = async() => {
        try {
            const result = await getServices();
            if(!result.ok) {
                console.log('ERROR: getServices result is ko');
                handleErrorRequest(result.error);
             } else {
                setServices(result.data);
                setLoading(false);
            }
        } catch(error) {
            console.log('ERROR: getServices failed: ' + error);
        }
    }
    //useEffect
    useEffect(() => {
        //Get list of services
        isAuthenticated && getServerServices();
    }, [isAuthenticated]);
    //useEffect
    useEffect(() => {
        //Connect to notify server so that we will keep informed about the services' status
        if(loadingConfig) return;
        const { wsServiceConfig } = config;
        if(!wsService) {
            const wsServer = wsServiceConfig.url + wsServiceConfig.ip + ':' + wsServiceConfig.port;
            wsService =  new WebSocket(wsServer);
        }
        wsService.onopen = () => {
            const helloMsg = {type: 'hello', data: 'Websocket client'};
            wsService.send(JSON.stringify(helloMsg));
        };
        wsService.onmessage = (event) => {
            var msg = JSON.parse(event.data);
            if(msg.type == 'helloResponse') {
                wsService.clientId = msg.clientId;
                console.log('Connected to service notify web socket. Client id: ' + wsService.clientId);
            } else
                onServiceNotification(msg);
        };
        wsService.onclose = () => {
            wsService.close();
        };
    }, [loadingConfig, services]);
    return (
        <ServiceContext.Provider value={{
            loading, services, searchServiceInput, serviceToEdit, 
            getServerServices, onCloseServiceDialog, onConfirmServiceDialog,
            openRemoveService, closeEditService, openEditService, setSearchServiceInput, onStartStop, onAddService, onUpdateService,
            onRemoveService, onSaveConfig}}>
            {children}
            {editServiceOpen && <AddService />}
            {dialogServiceOpen && <Dialog onCloseDialog={onCloseServiceDialog} onConfirmDialog={onConfirmServiceDialog} 
                title='Are you sure ?' text={`Please confirm you want to delete the service ${serviceToDelete.name}`} />}
        </ServiceContext.Provider>
    )
}