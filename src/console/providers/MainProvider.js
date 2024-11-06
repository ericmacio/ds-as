import React, { useState, useEffect, createContext } from 'react';
import { useHistory } from 'react-router-dom';
import { FaHome, FaGlobe, FaScroll, FaShareAltSquare, FaTools, FaUsers, FaProjectDiagram, FaObjectUngroup, FaUserFriends } from 'react-icons/fa';
import DisplayError from '../components/DisplayError';
import { getConfig, logOut } from '../utils/Api';

const iconsList = {HomeIcon: FaHome, AppsIcon: FaGlobe, ServicesIcon: FaGlobe, LogsIcon: FaScroll, AgentsIcon: FaShareAltSquare, SettingsIcon: FaTools, 
    SettingUsersIcon: FaUsers, SettingOrganizationsIcon: FaUserFriends, SettingGroupsIcon: FaObjectUngroup, SettingProxyIcon: FaProjectDiagram,};

export const MainContext = createContext();

export const MainProvider = ({ children }) => {
    const history = useHistory();
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userLogged, setUserLogged] = useState({});
    const [config, setConfig] = useState();
    const [Icons] = useState(iconsList);
    const [errorMsg, setErrorMsg] = useState();
    const setAuthenticatedUser = ({ id, firstName, name, email }) => {
        setIsAuthenticated(true);
        setUserLogged({ id, firstName, name, email });
    }
    const logout = async() => {
        setIsAuthenticated(false);
        history.push('/');
        try {
            const result = await logOut(userLogged.email);
            if(!result.ok)
                console.log('ERROR: logOut result is ko');
        } catch(error) {
            console.log('ERROR: logOut failed: ' + error);
        }
    }
    const getServerConfig = async() => {
        try {
            const result = await getConfig();
            if(!result.ok)
                console.log('ERROR: getConfig failed');
            else {
                setConfig(result.data);
                setLoadingConfig(false);
            }
        } catch(error) {
            console.log('ERROR: getConfig failed: ' + error);
        }
    }
    const displayErrorMsg = (msg) => {
        setErrorMsg(msg);
    }
    const handleErrorRequest = ({ method, url, status, statusText, error }) => {
        const errorMsg = error ? ': ' + error.msg : '';
        setErrorMsg('Server request failed: ' + method + ' ' + url + ', response: ' + status + ' ' + statusText + errorMsg);
    }
    const closeErrorMsg = () => {
        setErrorMsg(null);
    }
    //useEffect
    useEffect(() => {
        //Get server config
        isAuthenticated && getServerConfig();
    }, [isAuthenticated]);
    return (
        <MainContext.Provider value={{ isAuthenticated, userLogged, Icons, config, loadingConfig, errorMsg,
            setAuthenticatedUser, logout, handleErrorRequest, displayErrorMsg, closeErrorMsg }}>
            {children}
            {errorMsg && <DisplayError />}
        </MainContext.Provider>
    )
}