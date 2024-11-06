import React, { useState, useContext } from 'react';
import { AgentContext } from '../providers/AgentProvider';
import '../stylesheets/AddAgent.css';

const AddAgent = () => {
    const { agents, onAddAgent, closeEditAgent, agentToEdit } = useContext(AgentContext);
    const [hostName, setHostName] = useState(agentToEdit ? agentToEdit.hostName : '');
    const [comment, setComment] = useState('');
    const onSubmit = (event) => {
        event.preventDefault();
        const id = agentToEdit ? agentToEdit.id : null;
        if(hostName)
            onAddAgent({id: id, hostName});
        else
            alert('Missing fields ...');
        closeEditAgent();
    }
    const onChangeHostName = (event) => {
        const agentExist = agents.find(agent => agent.hostName == event.target.value);
        if(agentExist)
            setComment('Agent already exist. Please change host name value');
        else {
            setHostName(event.target.value);
            setComment('');
        }
    }
    return (
        <div className='gb-overlay'>
            <form className='gb-add-form'>
                <h1>Please fill the form below and submit it</h1>
                <label>Agent host name:
                    <input
                        value={hostName}
                        onChange={onChangeHostName}
                        type='text'
                        placeholder='Enter agent host name'
                        required
                    />
                    <div className='gb-add-form-comment'>{comment}</div>
                </label>
                <div className='gb-form-button'>
                    <button onClick={onSubmit}>Submit</button>
                    <button onClick={closeEditAgent}>Cancel</button>
                </div>
            </form>
        </div>
    )
}
export default AddAgent;