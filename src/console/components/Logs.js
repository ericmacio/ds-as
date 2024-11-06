import React from 'react';
import { FaScroll, FaFileAlt } from 'react-icons/fa';
import Box from './Box';
import '../stylesheets/Settings.css';

const logs = [
    {name: 'Live logs', Icon: FaScroll, link: '/logs/live'},
    {name: 'Saved log files', Icon: FaFileAlt, link: '/logs/saved'}
];

const Logs = () => {
    return(
        <div className='gb-listcontainer'>
            <div className='gb-listcontainer-list settings'>
                {logs.map((log, id) => <Box key={id} {...log} />)}
            </div>
        </div>
    )
}
export default Logs;