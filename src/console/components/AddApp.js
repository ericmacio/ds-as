import React, { useState, useContext } from 'react';
import { SketchPicker } from 'react-color';
import { AppContext } from '../providers/AppProvider';
import '../stylesheets/AddApp.css';

const AddApp = () => {
    const { apps, onAddApp, closeEditApp, appToEdit } = useContext(AppContext);
    const [appName, setAppName] = useState(appToEdit ? appToEdit.name : '');
    const [comment, setComment] = useState('');
    const [srcFile, setSrcFile] = useState();
    const [origSrcFileName, setOrigSrcFileName] = useState(appToEdit ? appToEdit.origSrcFileName : null);
    const [scope, setScope] = useState(appToEdit ? appToEdit.scope : 'public');
    const [iconColor, setIconColor] = useState(appToEdit ? appToEdit.color : '#28546c');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [colorBox, setColorBox] = useState({backgroundColor: appToEdit ? appToEdit.color : '#28546c'});
    const onSubmit = (event) => {
        event.preventDefault();
        if(appToEdit) {
            onAddApp({id: appToEdit.id, name: appName, srcFile, origSrcFileName, color: iconColor, scope});
            closeEditApp();
        } else {
            if(appName && srcFile && origSrcFileName) {
                onAddApp({name: appName, srcFile, origSrcFileName, color: iconColor, scope});
                closeEditApp();
            } else
                alert('Missing fields: ' + (appName ? '' : 'app name, ') + (srcFile ? '' : 'source file, ')  + (origSrcFileName ? '' : 'source file name'));
        }
    }
    const onChangeName = (event) => {
        const appExist = apps.find(app => app.name == event.target.value);
        if(appExist)
            setComment('App already exist. Please choose another one');
        else {
            setAppName(event.target.value);
            setComment('');
        }
    }
    const handleFileInput = (event) => {
        const file = event.target.files[0];
        setSrcFile(file);
        setOrigSrcFileName(file.name);
    }
    const handleColor = (color) => {
        setIconColor(color.hex);
        setColorBox({backgroundColor: color.hex});
    }
    return (
        <div className='gb-overlay'>
            <form className='gb-add-form'>
                <h1>Please fill the form below and submit it</h1>
                <label>App name:
                    {appToEdit ? appName :
                    <>
                    <input
                        value={appName}
                        onChange={onChangeName}
                        type='text'
                        placeholder='Enter app name'
                        required
                    />
                    <div className='gb-add-form-comment'>{comment}</div>
                    </>
                    }
                </label>
                <div className='gb-add-form-file'>
                    <label>Select an app source file
                        <input
                            type='file'
                            accept='.js'
                            onChange={handleFileInput}
                        />
                    </label>
                    <div className='gb-add-form-file-preview'>{origSrcFileName ? origSrcFileName : 'No source file selected'}</div>
                </div>
                <label>Scope:
                    <input
                        value={scope}
                        onChange={(e) => setScope(e.target.value)}
                        type='text'
                        placeholder='public / private'
                        required
                    />
                </label>
                <label className='addapp-form-colorpicker'>Color:
                    <>
                        <div style={colorBox} className='addapp-form-colorpicker-box' />
                        <input
                            readOnly
                            value={iconColor}
                            type='text'
                            placeholder='Enter color for this app'
                            onClick={() => showColorPicker ? setShowColorPicker(false) : setShowColorPicker(true)}
                            required
                        />
                    </>
                </label>
                {showColorPicker &&
                    <SketchPicker
                        color={iconColor}
                        onChangeComplete={handleColor}
                    />
                }
                <div className='gb-form-button'>
                    <button onClick={onSubmit}>Submit</button>
                    <button onClick={closeEditApp}>Cancel</button>
                </div>
            </form>
        </div>
    )
} 
export default AddApp