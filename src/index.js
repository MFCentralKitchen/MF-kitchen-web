// src/index.js
import React from 'react';
import ReactDOM from 'react-dom';
import { AuthProvider } from './auth-context'; // Ensure the path is correct
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
