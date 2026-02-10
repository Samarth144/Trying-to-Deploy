import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  Container, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemText,
  ListItemButton,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
  ListItemIcon
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HashLink } from 'react-router-hash-link';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout, isAdmin, isDoctor } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/');
  };

  // Handle Scroll Effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const isCurrentPath = (path) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { title: 'Home', path: '/' },
    { title: 'About', path: '/about' },
  ];

  if (user) {
    navLinks.push({ title: 'Dashboard', path: isAdmin ? '/admin' : '/dashboard' });
  }

  return (
    <>
      <AppBar 
        position="fixed" 
        elevation={0}
        className={`app-bar-root ${scrolled ? 'app-bar-scrolled' : ''}`}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            
            {/* --- LOGO SECTION --- */}
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Logo size={45} />
            </Link>

            {/* --- DESKTOP MENU --- */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 4, alignItems: 'center' }}>
              {navLinks.map((link) => (
                <Button
                  key={link.title}
                  component={Link}
                  to={link.path}
                  className={`nav-link-btn ${isCurrentPath(link.path) ? 'active' : ''}`}
                >
                  {link.title}
                </Button>
              ))}
            </Box>

            {/* --- ACTION BUTTONS --- */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center' }}>
              {!user ? (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    component={Link}
                    to="/login"
                    variant="text" 
                    className="nav-secondary-btn"
                  >
                    Login
                  </Button>
                </motion.div>
              ) : (
                <>
                  {isDoctor && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        component={Link}
                        to="/patients"
                        variant="outlined" 
                        startIcon={<AddCircleOutlineIcon />}
                        className="nav-action-btn"
                      >
                        Initialize Case
                      </Button>
                    </motion.div>
                  )}
                  
                  <Tooltip title="Account settings">
                    <IconButton onClick={handleMenu} sx={{ ml: 1, p: 0.5, border: '1px solid rgba(0, 240, 255, 0.3)' }}>
                      <Avatar 
                        sx={{ 
                          width: 32, 
                          height: 32, 
                          bgcolor: '#059789',
                          fontSize: '0.9rem',
                          fontFamily: 'Rajdhani',
                          fontWeight: 700
                        }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </IconButton>
                  </Tooltip>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                    PaperProps={{
                      sx: {
                        bgcolor: '#0B1221',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#F8FAFC',
                        minWidth: 180,
                        mt: 1.5,
                        '& .MuiMenuItem-root': {
                          fontFamily: 'Space Grotesk',
                          fontSize: '0.9rem',
                          py: 1.5,
                          '&:hover': { bgcolor: 'rgba(0, 240, 255, 0.05)' }
                        }
                      }
                    }}
                  >
                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{user.name}</Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'uppercase' }}>{user.role}</Typography>
                    </Box>
                    <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
                    <MenuItem component={Link} to="/dashboard" onClick={handleClose}>
                      <ListItemIcon><DashboardIcon sx={{ color: '#00F0FF', fontSize: 20 }} /></ListItemIcon>
                      Dashboard
                    </MenuItem>
                    {isAdmin && (
                      <MenuItem component={Link} to="/admin" onClick={handleClose}>
                        <ListItemIcon><AdminPanelSettingsIcon sx={{ color: '#F59E0B', fontSize: 20 }} /></ListItemIcon>
                        Admin Panel
                      </MenuItem>
                    )}
                    <MenuItem onClick={handleLogout}>
                      <ListItemIcon><LogoutIcon sx={{ color: '#EF4444', fontSize: 20 }} /></ListItemIcon>
                      Logout
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Box>

            {/* --- MOBILE BURGER MENU --- */}
            <IconButton
              color="inherit"
              onClick={handleDrawerToggle}
              sx={{ display: { md: 'none' }, color: '#059789' }}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      {/* --- MOBILE DRAWER --- */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        classes={{ paper: 'mobile-drawer-paper' }}
      >
        <List sx={{ mt: 5, px: 2 }}>
          {navLinks.map((link) => (
            <ListItem key={link.title} disablePadding>
              <ListItemButton 
                component={Link}
                to={link.path}
                onClick={handleDrawerToggle}
                className="mobile-nav-item-btn"
              >
                <ListItemText 
                  primary={link.title} 
                  primaryTypographyProps={{ 
                    style: { color: isCurrentPath(link.path) ? '#00F0FF' : '#F8FAFC' } 
                  }} 
                />
              </ListItemButton>
            </ListItem>
          ))}
          
          <Divider sx={{ my: 2, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
          
          {!user ? (
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/login" onClick={handleDrawerToggle}>
                <ListItemText primary="Login" />
              </ListItemButton>
            </ListItem>
          ) : (
            <>
              {isDoctor && (
                <Box sx={{ mt: 2 }}>
                  <Button 
                    fullWidth
                    component={Link}
                    to="/patients"
                    onClick={handleDrawerToggle}
                    variant="contained" 
                    className="mobile-action-btn"
                    startIcon={<AddCircleOutlineIcon />}
                  >
                    Initialize Case
                  </Button>
                </Box>
              )}
              <ListItem disablePadding sx={{ mt: 2 }}>
                <ListItemButton onClick={handleLogout}>
                  <ListItemIcon><LogoutIcon sx={{ color: '#EF4444' }} /></ListItemIcon>
                  <ListItemText primary="Logout" />
                </ListItemButton>
              </ListItem>
            </>
          )}
        </List>
      </Drawer>
    </>
  );
};

export default Navbar;
