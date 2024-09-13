import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import LOGO from '../assets/MF-CPU-LOGO.png';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';

const Sidebar = () => {
  const location = useLocation(); // Hook to get the current location

  const isActive = (path) => location.pathname === path;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 10,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: 260, boxSizing: 'border-box' },
      }}
    >
      <div style={{ alignContent: 'center', textAlign: 'center', backgroundColor: '#f0f0f0' }}>
        <img src={LOGO} alt="My Image" style={{ width: "200px", marginLeft: 5, backgroundColor: '#f0f0f0' }} />
      </div>
      <List sx={{
        padding: '10px',
        backgroundColor: '#f0f0f0',
        height: '100%',
      }}>
        <ListItem
          button
          component={Link}
          to="/add-users"
          sx={{
            backgroundColor: isActive('/add-users') ? '#bcd2f5' : '#f0f0f0',
            '&:hover': {
              backgroundColor: isActive('/add-users') ? '#d0def5' : '#d3d3d3',
            },
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          <ListItemIcon>
            <PersonAddIcon />
          </ListItemIcon>
          <ListItemText primary="Add Users" />
        </ListItem>

        <ListItem
          button
          component={Link}
          to="/inventory"
          sx={{
            backgroundColor: isActive('/inventory') ? '#bcd2f5' : '#f0f0f0',
            '&:hover': {
              backgroundColor: isActive('/inventory') ? '#d0def5' : '#d3d3d3',
            },
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          <ListItemIcon>
            <InventoryIcon />
          </ListItemIcon>
          <ListItemText primary="Inventory" />
        </ListItem>

        <ListItem
          button
          component={Link}
          to="/invoices"
          sx={{
            backgroundColor: isActive('/invoices') ? '#bcd2f5' : '#f0f0f0',
            '&:hover': {
              backgroundColor: isActive('/invoices') ? '#d0def5' : '#d3d3d3',
            },
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          <ListItemIcon>
            <ReceiptIcon />
          </ListItemIcon>
          <ListItemText primary="Invoices" />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;
