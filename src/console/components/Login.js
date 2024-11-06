import React, { useState, useContext } from "react";
import { useHistory } from "react-router-dom";
import { MainContext } from '../providers/MainProvider';
import { login } from '../utils/Auth';
import '../stylesheets/Global.css';
import '../stylesheets/Login.css';

const Login = () => {
    const history = useHistory();
    const { setAuthenticatedUser } = useContext(MainContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authFailed, setAuthFailed] = useState(false);

    const validateForm = () => {
        return email.length > 0 && password.length > 0;
    }
    const onSubmit = async (event) => {
        event.preventDefault();
        try{
            var result = await login({ email, password });
            if(!result.ok) {
                console.log('ERROR: login result is ko');
                setAuthFailed(true);
             } else {
                const { id, firstName, name, email } = result.data;
                setAuthenticatedUser({ id, firstName, name, email });
                history.push('/home');
            }
        } catch(error) {
            console.log('ERROR: getToken failed');
        }
    }
    return (
        <>
        <div className='login-header'>
            <div id='login-header-as'>
                <img id='login-header-as-logo' alt='AS logo' src = '/assets/images/asLogo.png'></img>
                <div id='login-header-as-title'>DS Application Server</div>
            </div>
            <img id='login-header-logo-piksel' alt='Piksel logo' src = '/assets/images/logo_master.png'></img>
        </div>
        <div className='login-background login-overlay'>
            <form className='login-form gb-background-dark'>
                Please enter your login information
                <input className='login-form-email'
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type='email'
                    placeholder='Email'
                    required
                />
                <input className='adduser-form-password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type='password'
                    placeholder='Password'
                    required
                />
                {authFailed ? <div className='login-failed'>ERROR: Bad email or user password</div> : <div><p> </p></div>}
                <button disabled={!validateForm()} onClick={onSubmit}>Login</button>
            </form>
        </div>
        </>
    );
}
export default Login