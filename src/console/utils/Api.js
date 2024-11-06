import sendRequest from './SendRequest';

const logsUrl = '../api/logs';
const appUrl = '../api/apps';
const serviceUrl = '../api/Services';
const configUrl = '../api/config';
const configServiceUrl = '../api/config/Services';
const configAgentUrl = '../api/config/agents';
const configLogUrl = '../api/config/log';
const userUrl = '../api/users';
export const refreshUrl = '../api/auth/refresh';
const loginUrl = '../api/auth/login';
const passwordUrl = '../api/auth/password';
const agentUrl = '../api/agents';
const logOutUrl = '../api/auth/logout';

export const logOut = async(email) => {
    try {
        const request = {method: 'POST', url: logOutUrl, data: { email: email }};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed: ' + error);
        return {ok: false};
    }
}
export const getLogFilesList = async() => {
    try {
        const request = {method: 'GET', url: logsUrl};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed: ' + error);
        return {ok: false};
    }
}
export const getLogFileData = async(logFile) => {
    try {
        const request = {method: 'GET', url: logsUrl + '/' + logFile};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed: ' + error);
        return {ok: false};
    }
}
export const getSavedLogFileData = async(logFile) => {
    try {
        const request = {method: 'GET', url: '../' + logsUrl + '/' + logFile};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed: ' + error);
        return {ok: false};
    }
}
export const getApps = async() => {
    try {
        const request = {method: 'GET', url: appUrl};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const updateApp = async(id, data) => {
    try {
        const request = {method: 'PUT', url: appUrl + '/' + id, data: data};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const createApp = async(data) => {
    try {
        const request = {method: 'POST', url: appUrl, data: data};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const deleteApp = async(id) => {
    try {
        const request = {method: 'DELETE', url: appUrl + '/' + id};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const getAppSrc = async(id) => {
    try {
        const request = {method: 'GET', url: appUrl + '/' + id + '/src'};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const getAgents = async() => {
    try {
        const request = {method: 'GET', url: agentUrl};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const updateAgent = async(id, data) => {
    try {
        const request = {method: 'PUT', url: agentUrl + '/' + id, data: data};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const createAgent = async(data) => {
    try {
        const request = {method: 'POST', url: agentUrl, data: data};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const deleteAgent = async(id) => {
    try {
        const request = {method: 'DELETE', url: agentUrl + '/' + id};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const sendAgentCmd = async(id, cmd) => {
    try {
        const request = {method: 'POST', url: agentUrl + '/' + id + '/cmd', data: { cmd }};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const getServices = async() => {
    try {
        const request = {method: 'GET', url: serviceUrl};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const getServiceConfig = async() => {
    try {
        const request = {method: 'GET', url: configServiceUrl};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const getAgentConfig = async() => {
    try {
        const request = {method: 'GET', url: configAgentUrl};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const getConfig = async() => {
    try {
        const request = {method: 'GET', url: configUrl};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const updateServiceStatus = async(id, status) => {
    try {
        const request = {method: 'PUT', url: serviceUrl + '/' + id + '/status', data: { status }};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const updateService = async(id, data) => {
    try {
        const request = {method: 'PUT', url: serviceUrl + '/' + id, data: data};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const createService = async(data) => {
    try {
        const request = {method: 'POST', url: serviceUrl, data: data};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const deleteService = async(id) => {
    try {
        const request = {method: 'DELETE', url: serviceUrl + '/' + id};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const getUsers = async() => {
    try {
        const request = {method: 'GET', url: userUrl};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const updateUser = async(id, data) => {
    try {
        const request = {method: 'PUT', url: userUrl + '/' + id, data: data};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const createUser = async(data) => {
    try {
        const request = {method: 'POST', url: userUrl, data: data};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const deleteUser = async(id) => {
    try {
        const request = {method: 'DELETE', url: userUrl + '/' + id};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const authenticateUser = async({ email, password }) => {
    try{
        const request = {method: 'POST', url: loginUrl, data: { email, password }};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const setUserPassword = async({ email, password }) => {
    try{
        const request = {method: 'PUT', url: passwordUrl, data: { email, password }};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const refreshUserToken = async (refreshToken) => {
    try{
        const request = {method: 'POST', url: refreshUrl, data: {token: refreshToken}};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const getLogConfig = async() => {
    try {
        const request = {method: 'GET', url: configLogUrl};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}
export const updateLogConfig = async(id, data) => {
    try {
        const request = {method: 'PUT', url: configLogUrl + '/' + id, data: data};
        const result = await sendRequest(request);
        if(!result.ok)
            console.log('ERROR: sendRequest result is ko');
        return(result);
    } catch(error) {
        console.log('ERROR: sendRequest failed');
        return {ok: false};
    }
}