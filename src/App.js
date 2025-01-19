// src/App.js
import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./screens/sidebar";
import AddUsers from "./screens/add-users";
import Inventory from "./screens/inventory";
import Invoices from "./screens/invoices";
import LoginScreen from "./screens/login";
import { AuthContext } from "./auth-context"; // Ensure the path is correct
import Dashboard from "./screens/dashboard";
import ManageUsers from "./screens/manage-users";
import ConsolidatedInvoiceScreen from "./screens/ConsolidatedInvoiceScreen";
import "@fontsource/roboto";
import { createTheme, ThemeProvider, useMediaQuery } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";

const theme = createTheme({
  typography: {
    fontFamily: "'Roboto', sans-serif", // Set your global font
  },
});

const App = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const isMobile = useMediaQuery("(max-width:768px)");

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {isAuthenticated ? (
            <Route
              path="*"
              element={
                <div style={{ display: "flex" }}>
                  <Sidebar />
                  <main style={{ width:isMobile ? '80%' : '82%' }}>
                    <Routes>
                      <Route path="/add-users" element={<AddUsers />} />
                      <Route path="/inventory" element={<Inventory />} />
                      <Route path="/invoices" element={<Invoices />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/manage-users" element={<ManageUsers />} />
                      <Route
                        path="/ConsolidatedInvoiceScreen"
                        element={<ConsolidatedInvoiceScreen />}
                      />
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
    </ThemeProvider>
  );
};

export default App;
