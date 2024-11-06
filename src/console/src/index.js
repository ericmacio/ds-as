import React from 'react'
import { render } from 'react-dom'
import { Main } from '../pages/Main'
import { Router } from 'react-router-dom';
import history from '../utils/history';

render(
    <Router history={history}>
        <Main />
    </Router>,
    document.getElementById('react-container')
)