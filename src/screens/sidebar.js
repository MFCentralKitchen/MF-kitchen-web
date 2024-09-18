import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import LOGO from '../assets/MF-CPU-LOGO.png';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DashboardIcon from '@mui/icons-material/Dashboard';

const Sidebar = () => {
  const location = useLocation(); // Hook to get the current location

  const isActive = (path) => location.pathname === path;

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open
      sx={{
        // width: 260,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: 260, boxSizing: 'border-box' },
        '@media (max-width: 600px)': {
          // width: 200,
          '& .MuiDrawer-paper': { },
        },
      }}
    >
      <div style={{ alignContent: 'center', textAlign: 'center', backgroundColor: '#f8f4e1' }}>
        <img src={LOGO} alt="My Image" style={{ width: "160px", margin: "20px auto", backgroundColor: '#f8f4e1' }} />
      </div>
      <List sx={{
        padding: '10px',
        backgroundColor: '#f8f4e1',
        height: '100%',
      }}>
         <ListItem
          button
          component={Link}
          to="/dashboard" // Add new route for Dashboard
          sx={{
            backgroundColor: isActive('/dashboard') ? '#f5b300' : '#f8f4e1',
            '&:hover': {
              backgroundColor: isActive('/dashboard') ? '#f5b300' : '#e0e0e0',
            },
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          <ListItemIcon>
            <DashboardIcon sx={{ color: isActive('/dashboard') ? '#fff' : '#000' }} />
          </ListItemIcon>
          <ListItemText primary="Dashboard" sx={{ color: isActive('/dashboard') ? '#fff' : '#000' }} />
        </ListItem>
        <ListItem
          button
          component={Link}
          to="/add-users"
          sx={{
            backgroundColor: isActive('/add-users') ? '#f5b300' : '#f8f4e1',
            '&:hover': {
              backgroundColor: isActive('/add-users') ? '#f5b300' : '#e0e0e0',
            },
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          <ListItemIcon>
            <PersonAddIcon sx={{ color: isActive('/add-users') ? '#fff' : '#000' }} />
          </ListItemIcon>
          <ListItemText primary="Add Users" sx={{ color: isActive('/add-users') ? '#fff' : '#000' }} />
        </ListItem>

        <ListItem
          button
          component={Link}
          to="/inventory"
          sx={{
            backgroundColor: isActive('/inventory') ? '#f5b300' : '#f8f4e1',
            '&:hover': {
              backgroundColor: isActive('/inventory') ? '#f5b300' : '#e0e0e0',
            },
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          <ListItemIcon>
            <InventoryIcon sx={{ color: isActive('/inventory') ? '#fff' : '#000' }} />
          </ListItemIcon>
          <ListItemText primary="Inventory" sx={{ color: isActive('/inventory') ? '#fff' : '#000' }} />
        </ListItem>

        <ListItem
          button
          component={Link}
          to="/invoices"
          sx={{
            backgroundColor: isActive('/invoices') ? '#f5b300' : '#f8f4e1',
            '&:hover': {
              backgroundColor: isActive('/invoices') ? '#f5b300' : '#e0e0e0',
            },
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          <ListItemIcon>
            <ReceiptIcon sx={{ color: isActive('/invoices') ? '#fff' : '#000' }} />
          </ListItemIcon>
          <ListItemText primary="Invoices" sx={{ color: isActive('/invoices') ? '#fff' : '#000' }} />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;
