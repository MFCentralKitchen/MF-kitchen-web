// src/App.js
import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './screens/sidebar';
import AddUsers from './screens/add-users';
import Inventory from './screens/inventory';
import Invoices from './screens/invoices';
import LoginScreen from './screens/login';
import { AuthContext } from './auth-context'; // Ensure the path is correct
import Dashboard from './screens/dashboard';

const App = () => {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <Router>
      <Routes>
        {isAuthenticated ? (
          <Route
            path="*"
            element={
              <div style={{ display: 'flex' }}>
                <Sidebar />
                <main style={{ marginLeft: 250, width: '100%' }}>
                  <Routes>
                    <Route path="/add-users" element={<AddUsers />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    {/* Add more routes as needed */}
                  </Routes>
                </main>
              </div>
            }
          />
        ) : (
          <Route path="/" element={<LoginScreen />} />
        )}
      </Routes>
    </Router>
  );
};

export default App;
