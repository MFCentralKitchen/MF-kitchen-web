import React, { useState } from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, useMediaQuery } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DescriptionIcon from '@mui/icons-material/Description';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import CloseIcon from '@mui/icons-material/Close';
import LOGO from '../assets/MF-CPU-LOGO.png';

const Sidebar = () => {
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width:768px)");
  const [isOpen, setIsOpen] = useState(!isMobile);

  const isActive = (path) => location.pathname === path;

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  const drawerWidth = isMobile ? '20%' : '18%';
  
  const menuItems = [
    { path: '/dashboard', icon: DashboardIcon, text: 'Dashboard' },
    { path: '/add-users', icon: PersonAddIcon, text: 'Add Users' },
    { path: '/inventory', icon: InventoryIcon, text: 'Inventory' },
    { path: '/invoices', icon: ShoppingCartIcon, text: 'Orders' },
    { path: '/ConsolidatedInvoiceScreen', icon: DescriptionIcon, text: 'Invoices' },
    { path: '/manage-users', icon: GroupIcon, text: 'Manage Users' },
  ];

  const sidebarStyles = {
    drawerPaper: {
      width: drawerWidth,
      backgroundColor: '#FFFFFF',
      borderRight: 'none',
      transition: 'width 0.3s ease-in-out',
    },
    logo: {
      padding: '20px',
      textAlign: 'center',
      backgroundColor: '#FFE5E5',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    logoImage: {
      width: isMobile ? '100px' : '140px',
      margin: '0 auto',
    },
    menuItem: (isItemActive) => ({
      margin: '8px 0px',
      borderRadius: '8px',
      backgroundColor: isItemActive ? '#F5B300' : 'transparent',
      '&:hover': {
        backgroundColor: isItemActive ? '#F5B300' : '#FFE5E5',
      },
      transition: 'all 0.2s ease-in-out',
    }),
    icon: (isItemActive) => ({
      color: isItemActive ? '#FFFFFF' : '#FF0000',
      minWidth: '40px',
    }),
    text: (isItemActive) => ({
      color: isItemActive ? '#FFFFFF' : '#1A1A1A',
      '& .MuiTypography-root': {
        fontWeight: isItemActive ? 600 : 400,
      },
    }),
    hamburgerButton: {
      position: 'fixed',
      left: isOpen ? drawerWidth : '10px',
      top: '25px',
      zIndex: 1200,
      backgroundColor: '#F5B300',
      '&:hover': {
        backgroundColor: '#FF0000',
      },
    },
  };

  return (
    <>
      {isMobile && (
        <IconButton
          onClick={toggleDrawer}
          sx={sidebarStyles.hamburgerButton}
        >
          {isOpen ? <CloseIcon /> : <MenuIcon />}
        </IconButton>
      )}
      
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isOpen}
        onClose={toggleDrawer}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': sidebarStyles.drawerPaper,
        }}
      >
        <div style={sidebarStyles.logo}>
          <img 
            src={LOGO} 
            alt="Logo" 
            style={sidebarStyles.logoImage} 
          />
          {isMobile && (
            <IconButton onClick={toggleDrawer} sx={{ color: '#FF0000' }}>
              <CloseIcon />
            </IconButton>
          )}
        </div>

        <List sx={{ mt: 2 }}>
          {menuItems.map(({ path, icon: Icon, text }) => (
            <ListItem
              button
              component={Link}
              to={path}
              key={path}
              sx={sidebarStyles.menuItem(isActive(path))}
              onClick={isMobile ? toggleDrawer : undefined}
            >
              <ListItemIcon sx={sidebarStyles.icon(isActive(path))}>
                <Icon />
              </ListItemIcon>
              <ListItemText 
                primary={text} 
                sx={sidebarStyles.text(isActive(path))}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>
    </>
  );
};

export default Sidebar;