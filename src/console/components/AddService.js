import React, { useState, useContext } from 'react';
import { AppContext } from '../providers/AppProvider';
import { ServiceContext } from '../providers/ServiceProvider';
import '../stylesheets/AddService.css';

const AddService = () => {
    const { services, onAddService, closeEditService, serviceToEdit } = useContext(ServiceContext);
    const { apps } = useContext(AppContext);
    const [app, setApp] = useState(serviceToEdit ? serviceToEdit.app : '');
    const [serviceName, setServiceName] = useState(serviceToEdit ? serviceToEdit.name : '');
    const [comment, setComment] = useState('');
    const [configFile, setConfigFile] = useState();
    const [configFileName, setConfigFileName] = useState(serviceToEdit ? serviceToEdit.configFileName : null);
    const [apiUrl, setApiUrl] = useState(serviceToEdit ? serviceToEdit.apiUrl : 'qa-dsapi.piksel.com');
    const [apiPort, setApiPort] = useState(serviceToEdit ? serviceToEdit.apiPort : '80');
    const [userName, setUserName] = useState(serviceToEdit ? serviceToEdit.user : null);
    const [userPassword, setUserPassword] = useState();
    const [group, setGroup] = useState(serviceToEdit ? serviceToEdit.group : 'admin');
    const [scope, setScope] = useState(serviceToEdit ? serviceToEdit.scope : 'public');
    const onSubmit = (event) => {
        event.preventDefault();
        if(serviceToEdit) {
            onAddService({id: serviceToEdit.id, app, name:serviceName, configFile, configFileName, apiUrl, apiPort, color: serviceToEdit.color, user: userName, password: userPassword, group, scope});
            closeEditService();
        } else {
            //user and password field are not mandatory since services may not use the DS API at all (ex: SoftPlayer)
            if(app && serviceName && apiUrl && apiPort) {
                const appColor = apps.filter(appData => appData.name == app)[0].color;
                onAddService({app, name:serviceName, configFile, configFileName, apiUrl, apiPort, color: appColor, user: userName, password: userPassword, group, scope});
                closeEditService();
            } else
                alert('Missing fields: ' + (app ? '' : 'app, ') + (serviceName ? '' : 'service name, ')  + (apiUrl ? '' : 'apiUrl, ')
                  + (apiPort ? '' : 'apiPort, ') + (userName ? '' : 'user name, ')  + (userPassword ? '' : 'user password'));
        }
    }
    const onChangeName = (event) => {
        const serviceExist = services.find(service => service.name == event.target.value);
        if(serviceExist)
            setComment('Service already exist. Please choose another one');
        else {
            setServiceName(event.target.value);
            setComment('');
        }
    }
    const handleFileInput = (event) => {
        const file = event.target.files[0];
        //console.log('file name: ' + file.name + ', type: ' + file.type + ', size: ' + file.size);
        setConfigFile(file);
        setConfigFileName(file.name);
    }
    return (
        <div className='gb-overlay'>
            <form className='gb-add-form'>
                <h1>Please fill the form below and submit it</h1>
                <label>App:
                    <select defaultValue={app} onChange={(e) => setApp(e.target.value)} >
                        <option disabled={true} value=''>Select an app from the list</option>
                        {apps.map((app, i) => 
                            <option key={i} value={app.name} label={app.name} />
                        )}
                    </select>
                </label>
                <div className='gb-add-form-file'>
                    <label>Select a configuration file
                        <input
                            type='file'
                            accept='.json'
                            onChange={handleFileInput}
                        />
                    </label>
                    <div className='gb-add-form-file-preview'>{configFileName ? configFileName : 'No config file selected'}</div>
                </div>
                <label>Service name:
                    <input
                        autoComplete='off'
                        value={serviceName}
                        onChange={onChangeName}
                        type='text'
                        placeholder='Enter service name'
                        required
                    />
                    <div className='gb-add-form-comment'>{comment}</div>
                </label>
                <label>Server API URL:
                    <input
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        type='text'
                        placeholder='Enter API URL'
                        required
                    />
                </label>
                <label>Server API port:
                    <input
                        value={apiPort}
                        onChange={(e) => setApiPort(e.target.value)}
                        type='text'
                        placeholder='Enter API port'
                        required
                    />
                </label>
                <label>User:
                    <input
                        autoComplete ='new-username'
                        value={userName ? userName : ''}
                        onChange={(e) => setUserName(e.target.value)}
                        type='text'
                        placeholder='Enter user login'
                        required
                    />
                </label>
                <label>Password:
                    <input
                        autoComplete ='new-password'
                        value={userPassword ? userPassword : ''}
                        onChange={(e) => setUserPassword(e.target.value)}
                        type='password'
                        placeholder='Enter user password'
                        required
                    />
                </label>
                <label>Group:
                    <input
                        value={group}
                        onChange={(e) => setGroup(e.target.value)}
                        type='text'
                        placeholder='Enter service group'
                        required
                    />
                </label>
                <label>Scope:
                    <input
                        value={scope}
                        onChange={(e) => setScope(e.target.value)}
                        type='text'
                        placeholder='public / private'
                        required
                    />
                </label>
                <div className='gb-form-button'>
                    <button onClick={onSubmit}>Submit</button>
                    <button onClick={closeEditService}>Cancel</button>
                </div>
            </form>
        </div>
    )
} 
export default AddService