import React, { useContext } from 'react';
import { BsPlusCircle } from 'react-icons/bs';
import { AgentContext } from '../providers/AgentProvider'
import Agent from './Agent';
import Search from './Search';
import '../stylesheets/Agents.css';

const Agents = () => {
    const { loading, agents, openEditAgent, searchAgentInput, setSearchAgentInput } = useContext(AgentContext);
    const getFilteredAgents = () => {
        return (
            (searchAgentInput != '') ?
            agents.filter(agent => agent.hostName.indexOf(searchAgentInput) >= 0).map((agent, id) => <Agent key={id} {...agent} />)
            :
            agents.map((agent, id) => <Agent key={id} {...agent} />)
        )
    }
    return( 
        <div className='gb-listcontainer'>
            <div className='gb-listcontainer-menu'>
                <div className='gb-listcontainer-menu-actions'>
                    <button className='gb-background-color' name='add' onClick={() => openEditAgent()}> <BsPlusCircle size={24}/> </button>
                </div>
                <Search searchInput={searchAgentInput} setSearchInput={setSearchAgentInput}/>
            </div>
            <div className='gb-listcontainer-list'>
                {(loading) ? <div>Loading agents ...</div> : (agents.length == 0) ? <div>No agents registered</div> : getFilteredAgents()}
            </div>
        </div>
    )
}
export default Agents;