import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, useMediaQuery } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import LOGO from '../assets/MF-CPU-LOGO.png';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';

const Sidebar = () => {
  const location = useLocation(); // Hook to get the current location

  const isActive = (path) => location.pathname === path;
  const isMobile = useMediaQuery("(max-width:600px)");

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open
      sx={{
        // width: 260,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width:isMobile? "19%" :"17.5%", boxSizing: 'border-box' },
        '@media (max-width: 600px)': {
          // width: 200,
          '& .MuiDrawer-paper': { },
        },
      }}
    >
      <div style={{ alignContent: 'center', textAlign: 'center', backgroundColor: '#f8f4e1' }}>
        <img src={LOGO} alt="My Image" style={{ width:isMobile? "70px" : "160px", margin: "20px auto", backgroundColor: '#f8f4e1' }} />
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
        <ListItem
          button
          component={Link}
          to="/manage-users"
          sx={{
            backgroundColor: isActive('/manage-users') ? '#f5b300' : '#f8f4e1',
            '&:hover': {
              backgroundColor: isActive('/manage-users') ? '#f5b300' : '#e0e0e0',
            },
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          <ListItemIcon>
            <GroupIcon sx={{ color: isActive('/manage-users') ? '#fff' : '#000' }} />
          </ListItemIcon>
          <ListItemText primary="Manage Users" sx={{ color: isActive('/manage-users') ? '#fff' : '#000' }} />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;
