import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { AppsPage, AppDetailsPage, LoginPage, HomePage, ServicesPage, ServiceDetailsPage, LogsPage, LogsLivePage, LogsSavedPage, AgentsPage, AgentDetailsPage, 
    SettingsPage, SettingUsersPage, SettingProxyPage, SettingOrganizationsPage, SettingGroupsPage, NotFound404 } from './Pages';
import { MainProvider } from '../providers/MainProvider';
import { AppProvider } from '../providers/AppProvider';
import { AgentProvider } from '../providers/AgentProvider';
import { ServiceProvider } from '../providers/ServiceProvider';
import { UserProvider } from '../providers/UserProvider';
import '../stylesheets/Main.css';

export const Main = () => {
    return (
        <MainProvider>
            <Switch>
                <Route exact path='/'>
                    <LoginPage />
                </Route>
                <Route exact path='/logs'>
                    <LogsPage />
                </Route>
                <Route exact path='/logs/live'>
                    <LogsLivePage />
                </Route>
                <Route exact path='/logs/saved'>
                    <LogsSavedPage />
                </Route>
                <Route exact path='/home'>
                    <ServiceProvider><AppProvider><HomePage /></AppProvider></ServiceProvider>
                </Route>
                <Route exact path='/apps'>
                    <ServiceProvider><AppProvider><AppsPage /></AppProvider></ServiceProvider>
                </Route>
                <Route exact path='/apps/:id'>
                    <ServiceProvider><AppProvider><AppDetailsPage /></AppProvider></ServiceProvider>
                </Route>
                <Route exact path='/services'>
                    <AppProvider><ServiceProvider><ServicesPage /></ServiceProvider></AppProvider>
                </Route>
                <Route exact path='/services/:id'>
                    <AppProvider><ServiceProvider><ServiceDetailsPage /></ServiceProvider></AppProvider>
                </Route>
                <Route exact path='/agents'>
                    <AgentProvider><AgentsPage /></AgentProvider>
                </Route>
                <Route exact path='/agents/:id'>
                    <AgentProvider><AgentDetailsPage /></AgentProvider>
                </Route>
                <Route exact path='/settings'>
                    <SettingsPage />
                </Route>
                <Route exact path='/settings/users'>
                    <UserProvider><SettingUsersPage /></UserProvider>
                </Route>
                <Route exact path='/settings/proxy'>
                    <SettingProxyPage />
                </Route>
                <Route exact path='/settings/organizations'>
                    <SettingOrganizationsPage />
                </Route>
                <Route exact path='/settings/groups'>
                    <SettingGroupsPage />
                </Route>
                <Route component={NotFound404} />
            </Switch>
        </MainProvider>
    )
}