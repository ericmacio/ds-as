import axios from 'axios';
import { getToken, resetToken, refreshToken } from './Auth';
import { refreshUrl } from './Api';
import history from "./history";

// Create interceptor for handling 401 Unauthorized response
axios.interceptors.response.use((response) => {
    // Return a successful response back to the calling service
    return response;
}, async(error) => {
    const originalRequest = error.config;
    if(error.response.status == 403 && originalRequest.url == refreshUrl) {
        console.log('Refresh token expired');
        resetToken();
        history.push('/');
        return Promise.reject(error);
    } else {
        if(error.response.status == 401 && originalRequest && !originalRequest.__retry) {
            console.log('We received an authentication request');
            originalRequest.__retry = true;
            try {
                console.log('Try and get a new access token');
                var result = await refreshToken();
                if(!result.ok) {
                    console.log('ERROR: refreshToken result is ko. Do not not send the request again');
                    return Promise.reject(error);
                } else {
                    const access_token = getToken();
                    originalRequest.headers.Authorization = 'Bearer ' + access_token;
                    return axios(originalRequest);
                }
            } catch(error) {
                console.log('ERROR: refreshToken failed');
                return Promise.reject(error);
            }
        } else
            return Promise.reject(error);
    }
});

const sendRequest = async({method, url, headers, data}) => {
    const config = {
        method: method,
        url: url,
        headers: headers ? headers : {},
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    };
    const access_token = getToken();
    //console.log('access_token from storage: ' + access_token);
    //In case refresh token already set
    //if(access_token)
      //  config.headers.Authorization = 'Bearer ' + access_token;
    if(data)
        config.data = data;
    config.headers = {
        'Authorization': access_token ? 'Bearer ' + access_token : null,
        'Cache-Control': 'no-cache'
    }
    try {
        let res = await axios(config);
        //console.log('Server data: ' + JSON.stringify(res.data));
        if(!res.data.ok)
            console.log('ERROR: Server returned a ko status. Request: ' + method + ' ' + url + ', error: ' + res.data.error.msg);
        return {ok: res.data.ok, data: res.data.data};
    } catch(error) {
        console.log('ERROR: Request failed: ' + method + ' ' + url + ', ' + error);
        if(error.response) {
            console.log('ERROR: ' + error.response.status + ' ' + error.response.statusText);
            console.log('ERROR: Msg: ' + JSON.stringify(error.response.data));
            return {ok: false, error: { method, url, status: error.response.status, statusText: error.response.statusText, error: error.response.data.error }};
        } else if(error.request) {
            //The request was made but no response was received
            console.log('ERROR: No response received from the server for request ' + method + ' ' + url);
            return {ok: false, error: { method, url}};
        }
    }
}
export default sendRequest;