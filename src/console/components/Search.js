import React from 'react';
import { FaTimesCircle } from 'react-icons/fa';
import { BsSearch } from 'react-icons/bs';
import '../stylesheets/Search.css';

const Search = ( { searchInput, setSearchInput }) => {
    return (
        <div className='gb-background-box search'>
            <FaTimesCircle size={15} style={(searchInput == '') ? {opacity: 0} : null} className='search-clear' onClick={() => setSearchInput('')} />
            <input className='search-input' type='text' value={searchInput} onChange={event => setSearchInput(event.target.value)}></input>
            <div className='search-label'><BsSearch size={15}/></div>
        </div>
    )
}
export default Search;