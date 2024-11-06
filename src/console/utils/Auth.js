import {authenticateUser, refreshUserToken } from './Api';
const WAIT_REFRESH_SEC = 2;

export const login = async({ email, password }) => {
    try{
        var result = await authenticateUser({ email, password });
        if(!result.ok) {
            console.log('ERROR: authenticateUser failed');
            return {ok: false};
        } else {
            const {firstName, name, email, access_token, refresh_token, expired } = result.data;
            console.log('Got access token from server: ' + access_token + ', expired: ' + expired);
            console.log('Got refresh token from server: ' + refresh_token);
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
            return {ok: true, data: { firstName, name, email }};
        }
    } catch(error) {
        console.log('ERROR: authenticateUser failed: ' + error);
        return {ok: false};
    }
}
export const refreshToken = async () => {
    try {
        //Remove access_token before sending the request
        localStorage.removeItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        if(refreshToken) {
            //Remove refresh_token to prevent simultaneous requests
            localStorage.removeItem('refresh_token');
            console.log('Current refresh token: ' + refreshToken);
            const result = await refreshUserToken(refreshToken);
            if(!result.ok) {
                console.log('ERROR: refreshUserToken result is ko');
                return {ok: false};
            }
            //Get new tokens
            const {access_token, refresh_token, expired } = result.data;
            console.log('Got new access token from server: ' + access_token + ', expired: ' + expired);
            console.log('Got new refresh token from server: ' + refresh_token);
            //Store new tokens for next requests
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
            return {ok: true};
        } else {
            console.log('WARNING: refresh token process already started. Wait a while for completion then');
            await new Promise((resolve) => {setTimeout(() => {resolve()}, WAIT_REFRESH_SEC * 1000);});
            console.log('Return after wait');
            return {ok: true};
        }
    } catch(error) {
        console.log('ERROR: refreshUserToken failed: ' + error);
        return {ok: false};
    }
}
export const getToken = () => {
    return localStorage.getItem('access_token');
}
export const getRefreshToken = () => {
    return localStorage.getItem('refresh_token');
}
export const resetToken = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}