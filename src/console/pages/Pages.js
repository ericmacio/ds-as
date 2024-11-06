import React, { useContext } from "react";
import { useParams } from "react-router";
import { MainContext } from '../providers/MainProvider';
import { AppContext } from '../providers/AppProvider';
import { AgentContext } from '../providers/AgentProvider'
import { ServiceContext } from '../providers/ServiceProvider';
import Header from '../components/Header';
import Login from '../components/Login';
import Apps from '../components/Apps';
import AppDetails from '../components/AppDetails';
import Services from '../components/Services';
import ServiceDetails from '../components/ServiceDetails';
import Logs from '../components/Logs';
import LogsLive from '../components/LogsLive';
import LogsSaved from '../components/LogsSaved';
import Settings from '../components/Settings';
import SettingUsers from '../components/SettingUsers';
import Agents from '../components/Agents';
import AgentDetails from '../components/AgentDetails';
import ServicesSummary from '../components/ServicesSummary';
import AppsSummary from '../components/AppsSummary';
import MainMenu from '../components/MainMenu';
import '../stylesheets/Global.css';
import '../stylesheets/Pages.css';

const logos = {
    asLogo: '/assets/images/asLogo.png',
    pikselLogo: '/assets/images/logoemotion-white.png'
};

const PageTemplate = ({name, Icon, menuItems, children}) => 
    <div className='gb-background template'>
        <Header name={name} Icon={Icon} menuItems={menuItems} />
        <MainMenu logos={logos} />
        {children}
    </div>

export function LoginPage() {
    console.log('LoginPage');
    return (
        <Login />
    )
}
export function HomePage() {
    console.log('HomePage');
    const { Icons: { HomeIcon } } = useContext(MainContext);
    const menuItems = [
    ];
    return (
        <PageTemplate name='Home' Icon={HomeIcon} menuItems={menuItems} >
            <div className='page-home'>
                <AppsSummary />
                <ServicesSummary />
            </div>
        </PageTemplate>
    )
}
export function AppsPage() {
    console.log('AppsPage');
    const { Icons: { AppsIcon } } = useContext(MainContext);
    const menuItems = [
    ];
    return (
        <PageTemplate name='Apps' Icon={AppsIcon} menuItems={menuItems}>
            <div className='page'>
                <Apps />
            </div>
        </PageTemplate>
    )
}
export function AppDetailsPage() {
    console.log('AppDetailsPage');
    const { Icons: { AppsIcon } } = useContext(MainContext);
    const { apps } = useContext(AppContext);
    let { id } = useParams();
    const app = apps.find((app) => (app.id == id));
    if(!app)
        console.log('Error: app not found: ' + id);
    const menuItems = [
    ];
    return (
        <PageTemplate name='Apps' Icon={AppsIcon} menuItems={menuItems}>
            <div className='page'>
                <AppDetails app={app} />
            </div>
        </PageTemplate>
    )
}
export function ServicesPage() {
    console.log('ServicesPage');
    const { Icons: { ServicesIcon } } = useContext(MainContext);
    const menuItems = [
    ];
    return (
        <PageTemplate name='Services' Icon={ServicesIcon} menuItems={menuItems}>
            <div className='page'>
                <Services />
            </div>
        </PageTemplate>
    )
}
export function ServiceDetailsPage() {
    console.log('ServiceDetailsPage');
    const { Icons: { ServicesIcon } } = useContext(MainContext);
    const { services } = useContext(ServiceContext);
    let { id } = useParams();
    const service = services.find((service) => (service.id == id));
    if(!service)
        console.log('Error: service not found: ' + id)
    const menuItems = [
    ];
    return (
        <PageTemplate name='Services' Icon={ServicesIcon} menuItems={menuItems}>
            <div className='page'>
                <ServiceDetails service={service} />
            </div>
        </PageTemplate>
    )
}
export function LogsPage() {
    console.log('LogsPage');
    const { Icons: { LogsIcon } } = useContext(MainContext);
    const menuItems = [
        {path: '/logs/live', name: 'Live logs'},
        {path: '/logs/saved', name: 'Saved logs'}
    ];
    return (
        <PageTemplate name='Logs' Icon={LogsIcon} menuItems={menuItems}>
            <div className='page'>
                <Logs />
            </div>
        </PageTemplate>
    )
}
export function LogsLivePage() {
    console.log('LogsLivePage');
    const { Icons: { LogsIcon } } = useContext(MainContext);
    const menuItems = [
        {path: '/logs/live', name: 'Live logs'},
        {path: '/logs/saved', name: 'Saved logs'}
    ];
    return (
        <PageTemplate name='Logs > Live logs' Icon={LogsIcon} menuItems={menuItems}>
            <div className='page-logs'>
                <LogsLive context={'logs'} />
            </div>
        </PageTemplate>
    )
}
export function LogsSavedPage() {
    console.log('LogsSavedPage');
    const { Icons: { LogsIcon } } = useContext(MainContext);
    const menuItems = [
        {path: '/logs/live', name: 'Live logs'},
        {path: '/logs/saved', name: 'Saved logs'}
    ];
    return (
        <PageTemplate name='Logs > Saved logs' Icon={LogsIcon} menuItems={menuItems}>
            <div className='page-logs'>
                <LogsSaved />
            </div>
        </PageTemplate>
    )
}
export function AgentsPage() {
    console.log('AgentsPage');
    const { Icons: { AgentsIcon } } = useContext(MainContext);
    const menuItems = [
    ];
    return (
        <PageTemplate name='Agents' Icon={AgentsIcon} menuItems={menuItems}>
            <div className='page'>
                <Agents />
            </div>
        </PageTemplate>
    )
}
export function AgentDetailsPage() {
    console.log('AgentDetailsPage');
    const { Icons: { AgentsIcon } } = useContext(MainContext);
    const { agents } = useContext(AgentContext);
    let { id } = useParams();
    const agent = agents.find((agent) => (agent.id == id));
    if(!agent)
        console.log('Error: agent not found: ' + id);
    const menuItems = [
    ];
    return (
        <PageTemplate name='Agents' Icon={AgentsIcon} menuItems={menuItems}>
            <div className='page'>
                <AgentDetails agent={agent} />
            </div>
        </PageTemplate>
    )
}
export function SettingsPage() {
    console.log('SettingsPage');
    const { Icons: { SettingsIcon } } = useContext(MainContext);
    const menuItems = [
        {path: '/settings/Users', name: 'Users'},
        {path: '/settings/Proxy', name: 'Proxy'},
        {path: '/settings/Organizations', name: 'Organizations'},
        {path: '/settings/Groups', name: 'Groups'}
    ];
    return (
        <PageTemplate name='Settings' Icon={SettingsIcon} menuItems={menuItems}>
            <div className='page'>
                <Settings />
            </div>
        </PageTemplate>
    )
}
export function SettingUsersPage() {
    console.log('SettingUsersPage');
    const { Icons: { SettingUsersIcon } } = useContext(MainContext);
    const menuItems = [
        {path: '/settings/Users', name: 'Users'},
        {path: '/settings/Proxy', name: 'Proxy'},
        {path: '/settings/Organizations', name: 'Organizations'},
        {path: '/settings/Groups', name: 'Groups'}
    ];
    return (
        <PageTemplate name='Settings > Users' Icon={SettingUsersIcon} menuItems={menuItems}>
            <div className='page'>
                <SettingUsers />
            </div>
        </PageTemplate>
    )
}
export function SettingProxyPage() {
    console.log('SettingProxyPage');
    const { Icons: { SettingProxyIcon } } = useContext(MainContext);
    const menuItems = [
        {path: '/settings/Users', name: 'Users'},
        {path: '/settings/Proxy', name: 'Proxy'},
        {path: '/settings/Organizations', name: 'Organizations'},
        {path: '/settings/Groups', name: 'Groups'}
    ];
    return (
        <PageTemplate name='Settings > Proxy' Icon={SettingProxyIcon} menuItems={menuItems}>
            <div className='page'>
                Proxy
            </div>
        </PageTemplate>
    )
}
export function SettingOrganizationsPage() {
    console.log('SettingOrganizationsPage');
    const { Icons: { SettingOrganizationsIcon } } = useContext(MainContext);
    const menuItems = [
        {path: '/settings/Users', name: 'Users'},
        {path: '/settings/Proxy', name: 'Proxy'},
        {path: '/settings/Organizations', name: 'Organizations'},
        {path: '/settings/Groups', name: 'Groups'}
    ];
    return (
        <PageTemplate name='Settings > Organizations' Icon={SettingOrganizationsIcon} menuItems={menuItems}>
            <div className='page'>
                Organizations
            </div>
        </PageTemplate>
    )
}
export function SettingGroupsPage() {
    console.log('SettingGroupsPage');
    const { Icons: { SettingGroupsIcon } } = useContext(MainContext);
    const menuItems = [
        {path: '/settings/Users', name: 'Users'},
        {path: '/settings/Proxy', name: 'Proxy'},
        {path: '/settings/Organizations', name: 'Organizations'},
        {path: '/settings/Groups', name: 'Groups'}
    ];
    return (
        <PageTemplate name='Settings > Groups' Icon={SettingGroupsIcon} menuItems={menuItems}>
            <div className='page'>
                Groups
            </div>
        </PageTemplate>
    )
}
export const NotFound404 = ({ location }) =>
    <div>
        <h1>Resource not found at '{location.pathname}'</h1>
    </div>
