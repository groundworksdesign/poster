import React from 'react';
import './App.css';
import DeckBuilder from './presentation/Deck/DeckBuilder';
import HomePage from './presentation/HomePage';
import Presentation from './presentation/Present/Present';

import { Routes, Route, Outlet, Link } from 'react-router-dom';

export default function App() {
  return (
    <div className="App">
      <div className="content">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="deck" element={<DeckBuilder />} />
          </Route>
          <Route path="presentation" element={<Presentation />} />
        </Routes>
      </div>
    </div>
  );
}

function Layout() {
  return (
    <div className="nav">
      {/* A "layout route" is a good place to put markup you want to
          share across all the pages on your site, like navigation. */}
      <nav>
        <ul>
          <li>
            <Link to="/deck">Deck</Link>
          </li>
          <li>
            <Link to="/presentation" target="_new">
              Presentation
            </Link>
          </li>
        </ul>
      </nav>

      <hr />

      {/* An <Outlet> renders whatever child route is currently active,
          so you can think about this <Outlet> as a placeholder for
          the child routes we defined above. */}
      <Outlet />
    </div>
  );
}
