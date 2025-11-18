// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Layout from './Layout';
import Home from './pages/Home';
import Market from './pages/Market';
import CoinDetail from './pages/CoinDetail';
import Trade from './pages/Trade';
import Wallet from './pages/Wallet';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <Home />
            </Layout>
          }
        />
        <Route
          path="/market"
          element={
            <Layout>
              <Market />
            </Layout>
          }
        />
        <Route
          path="/coin/:id"
          element={
            <Layout>
              <CoinDetail />
            </Layout>
          }
        />
        <Route
          path="/trade"
          element={
            <Layout>
              <Trade />
            </Layout>
          }
        />
        <Route
          path="/wallet"
          element={
            <Layout>
              <Wallet />
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
