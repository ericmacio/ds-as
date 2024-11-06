import React, { useState, useContext } from 'react';
import { setUserPassword } from '../utils/Api'
import { MainContext } from '../providers/MainProvider';
import '../stylesheets/ModifyUserPassword.css';

const ModifyUserPassword = ({ onClose, user }) => {
    const { handleErrorRequest } = useContext(MainContext);
    const [password, setPassword] = useState('');
    const [passwordChecked, setPasswordChecked] = useState(false);
    const [passwordOk, setPasswordOk] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [displayConfirmPassword, setDisplayConfirmPassword] = useState(false);
    const [confirmedPassword, setConfirmedPassword] = useState('');
    const onSubmitCheckPassword = async(event) => {
        event.preventDefault();
        console.log('email: ' + user.email);
        console.log('password: ' + password);
        if(password) {
            //Check user password
            try {
                const result = await setUserPassword({ email: user.email, password: password });
                if(!result.ok) {
                    console.log('ERROR: setUserPassword failed for users');
                    handleErrorRequest(result.error);
                } else {
                    console.log(result.data.samePassword ? 'User password OK' : 'Bad password');
                    setPasswordOk(result.data.samePassword);
                    setPasswordChecked(true);
                }
            } catch(error) {
                console.log('ERROR: setUserPassword failed: ' + error);
                onClose();
            }
        } else {
            console.log('Password is undefined. Cannot check');
            setPasswordOk(false);
        }
    }
    const onSubmitNewPassword = async(event) => {
        event.preventDefault();
        console.log('email: ' + user.email);
        console.log('New password: ' + newPassword);
        setDisplayConfirmPassword(true);
    }
    const onSubmitConfirmPassword = async(event) => {
        event.preventDefault();
        console.log('email: ' + user.email);
        console.log('Confirmed password: ' + confirmedPassword);
        const confirmOk = (confirmedPassword == newPassword);
        console.log(confirmOk ? 'Passwords match !' : 'ERROR: passwords do not match');
        if(confirmOk) {
            //Set new user password
            try {
                const result = await setUserPassword({ email: user.email, password: newPassword });
                if(!result.ok) {
                    console.log('ERROR: setUserPassword failed for users');
                    handleErrorRequest(result.error);
                } else {
                    if(result.data.samePassword)
                        console.log('ERROR: Same password than previous one. No change');
                    else
                        console.log('User password has been successfully changed');
                }
            } catch(error) {
                console.log('ERROR: setUserPassword failed: ' + error);
                onClose();
            }
        }
        onClose();
    }
    return (
        <div className='gb-overlay'>
            {!passwordChecked && <form className='gb-add-form'>
                <h1>Please enter your password</h1>
                <label>Password:
                    <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type='password'
                        placeholder='Enter current password'
                        autoFocus
                    />
                </label>
                <div className='gb-form-button'>
                    <button onClick={onSubmitCheckPassword}>Submit</button>
                    <button onClick={onClose}>Cancel</button>
                </div>
            </form>}
            {(passwordChecked && !passwordOk) && <form className='gb-add-form'>
                <h1>Sorry, wrong password !</h1>
                <div className='gb-form-button'>
                    <button onClick={onClose}>Close</button>
                </div>
            </form>}
            {(passwordChecked && passwordOk && !displayConfirmPassword) && <form className='gb-add-form'>
                <h1>Please enter your new password</h1>
                <label>New Password:
                    <input
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        type='password'
                        placeholder='Enter new password'
                        autoFocus
                    />
                </label>
                <div className='gb-form-button'>
                    <button onClick={onSubmitNewPassword}>Submit</button>
                    <button onClick={onClose}>Cancel</button>
                </div>
            </form>}
            {(passwordChecked && passwordOk && displayConfirmPassword) && <form className='gb-add-form'>
                <h1>Please confirm your new password</h1>
                <label>New Password:
                    <input
                        value={confirmedPassword}
                        onChange={(e) => setConfirmedPassword(e.target.value)}
                        type='password'
                        placeholder='Confirm new password'
                        autoFocus
                    />
                </label>
                <div className='gb-form-button'>
                    <button onClick={onSubmitConfirmPassword}>Submit</button>
                    <button onClick={onClose}>Cancel</button>
                </div>
            </form>}
        </div>
    )
}
export default ModifyUserPassword;