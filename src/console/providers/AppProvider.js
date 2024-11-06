import React, { useState, useEffect, createContext, useContext } from 'react';
import { MainContext } from './MainProvider';
import AddApp from '../components/AddApp';
import Dialog from '../components/Dialog';
import { getApps, createApp, updateApp, deleteApp } from '../utils/Api';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const { isAuthenticated, handleErrorRequest } = useContext(MainContext);
    const [loading, setLoading] = useState(true);
    const [searchAppInput, setSearchAppInput] = useState('');
    const [appToEdit, setAppToEdit] = useState();
    const [editAppOpen, setEditAppOpen] = useState(false);
    const [appToDelete, setAppToDelete] = useState();
    const [apps, setApps] = useState([]);
    const [dialogAppOpen, setDialogAppOpen] = useState(false);
    const getServerApps = async() => {
        try{
            const result = await getApps();
            if(!result.ok) {
                console.log('ERROR: getApps result is ko');
                handleErrorRequest(result.error);
            } else {
                setApps(result.data);
                setLoading(false);
            }
        } catch(error) {
            console.log('ERROR: getApps failed: ' + error);
        }
    }
    //openRemoveApp
    const openRemoveApp = (id) => {
        const app = apps.find(app => app.id == id);
        setAppToDelete(app);
        setDialogAppOpen(true);
    }
    //onConfirmAppDialog
    const onConfirmAppDialog = () => {
        onRemoveApp(appToDelete.id);
        setAppToDelete(null);
        setDialogAppOpen(false);
    }
    //onCloseAppDialog
    const onCloseAppDialog = () => {
        setAppToDelete(null);
        setDialogAppOpen(false);
    }
    //onCloseEditApp
    const closeEditApp = () => {
        setEditAppOpen(false);
        setAppToEdit(null);
    }
    //openEditApp
    const openEditApp = (id) => {
        if(id) {
            const app = apps.find(app => app.id == id);
            setAppToEdit(app);
        }
        setEditAppOpen(true);
    }
    const onAddApp = async({ id, name, srcFile, origSrcFileName, color, scope }) => {
        const formData = new FormData();
        formData.append('name', name);
        //Do not send undefined element
        if(srcFile)
            formData.append('srcFile', srcFile);
        if(origSrcFileName)
            formData.append('origSrcFileName', origSrcFileName);
        formData.append('color', color);
        formData.append('scope', scope);
        if(id) {
            //Modify existing app
            try {
                var result = await updateApp(id, formData);
            } catch(error) {
                console.log('ERROR: updateApp failed: ' + error);
            }
            if(!result.ok) {
                console.log('ERROR: updateApp result is ko');
                handleErrorRequest(result.error);
            }
        } else {
            //Create new app
            try{
                let result = await createApp(formData);
                if(!result.ok) {
                    console.log('ERROR: createApp / updateApp result is ko');
                    handleErrorRequest(result.error);
                }
            } catch(error) {
                console.log('ERROR: createApp failed: ' + error);
            }
        }
        //Update Apps list
        try {
            const result = await getApps();
            if(!result.ok) {
                console.log('ERROR: getApps result is ko');
                handleErrorRequest(result.error);
            } else 
                setApps(result.data);
        } catch(error) {
            console.log('ERROR: geApps failed: ' + error);
        }
    }
    const onRemoveApp = async(id) => {
        //Delete the service
        try{
            const result = await deleteApp(id);
            if(!result.ok) {
                console.log('ERROR:  deleteApp result is ko');
                handleErrorRequest(result.error);
            }
        } catch(error) {
            console.log('ERROR:  deleteApp failed: ' + error);
        }
        //Update Apps list
        try {
            const result = await getApps();
            if(!result.ok) {
                console.log('ERROR: getApps result is ko');
                handleErrorRequest(result.error);
            } else 
                setApps(result.data);
        } catch(error) {
            console.log('ERROR: getApps failed: ' + error);
        }
    }
    //useEffect
    useEffect(() => {
        //Get list of apps
        console.log('getServerApps');
        isAuthenticated && getServerApps();
    }, [isAuthenticated]);
    return (
        <AppContext.Provider value={{ loading, apps, searchAppInput, appToEdit, 
            onAddApp, openEditApp, openRemoveApp, closeEditApp, setSearchAppInput}}>
            {children}
            {editAppOpen && <AddApp />}
            {dialogAppOpen && <Dialog onCloseDialog={onCloseAppDialog} onConfirmDialog={onConfirmAppDialog}
             title='Are you sure ?' text={`Please confirm you want to delete the app ${appToDelete.name}`} />}
        </AppContext.Provider>
    )
}