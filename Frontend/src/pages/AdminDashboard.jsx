import React, { useState, useEffect } from 'react';
import { 
  Box, Container, Typography, Grid, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Button, Chip, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert,
  InputAdornment
} from '@mui/material';
import { motion } from 'framer-motion';
import axios from 'axios';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PeopleIcon from '@mui/icons-material/People';

const colors = {
  bg: '#0B1221',
  glass: 'rgba(22, 32, 50, 0.8)',
  teal: '#059789',
  cyan: '#00F0FF',
  amber: '#F59E0B',
  green: '#10B981',
  red: '#EF4444',
  text: '#F8FAFC',
  muted: '#64748B',
  border: 'rgba(5, 151, 137, 0.3)'
};

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState({ name: '', email: '', password: '', role: 'oncologist' });
  const [formError, setFormError] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/admin/users');
      setUsers(res.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch users. Ensure you have admin privileges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpen = (user = null) => {
    if (user) {
      setCurrentUser({ ...user, password: '' });
      setEditMode(true);
    } else {
      setCurrentUser({ name: '', email: '', password: '', role: 'oncologist' });
      setEditMode(false);
    }
    setOpen(true);
    setFormError(null);
  };

  const handleClose = () => setOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await axios.put(`/admin/users/${currentUser.id}`, currentUser);
      } else {
        await axios.post('/admin/users', currentUser);
      }
      fetchUsers();
      handleClose();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`/admin/users/${id}`);
        fetchUsers();
      } catch (err) {
        setError('Failed to delete user');
      }
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return colors.red;
      case 'oncologist': return colors.cyan;
      case 'patient': return colors.green;
      case 'researcher': return colors.amber;
      default: return colors.muted;
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, py: 6, px: { xs: 2, md: 6 } }}>
      <Container maxWidth="xl">
        
        {/* Header Section */}
        <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <AdminPanelSettingsIcon sx={{ color: colors.cyan, fontSize: 32 }} />
              <Typography variant="h3" sx={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#fff' }}>
                USER MANAGEMENT
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ color: colors.muted, fontFamily: 'Space Grotesk' }}>
              Control system access and monitor platform participants.
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<PersonAddIcon />}
            onClick={() => handleOpen()}
            sx={{ bgcolor: colors.teal, fontFamily: 'Rajdhani', fontWeight: 700, px: 4 }}
          >
            CREATE NEW USER
          </Button>
        </Box>

        {/* Quick Stats */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {[
            { label: 'Total Users', value: users.length, icon: <PeopleIcon />, color: colors.cyan },
            { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: <AdminPanelSettingsIcon />, color: colors.red },
            { label: 'Oncologists', value: users.filter(u => u.role === 'oncologist').length, icon: <PeopleIcon />, color: colors.cyan },
            { label: 'Patients', value: users.filter(u => u.role === 'patient').length, icon: <PeopleIcon />, color: colors.green },
          ].map((stat, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Paper sx={{ p: 3, bgcolor: colors.glass, border: `1px solid ${colors.border}`, borderRadius: '12px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</Typography>
                    <Typography variant="h4" sx={{ color: '#fff', fontWeight: 800, fontFamily: 'Rajdhani' }}>{stat.value}</Typography>
                  </Box>
                  <Box sx={{ color: stat.color, opacity: 0.5 }}>{stat.icon}</Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

        {/* User Table */}
        <TableContainer component={Paper} sx={{ bgcolor: colors.glass, border: `1px solid ${colors.border}`, borderRadius: '12px' }}>
          <Box sx={{ p: 3, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>SYSTEM ACCESS LOG</Typography>
            <TextField 
              placeholder="Search users..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: colors.muted }} /></InputAdornment>,
                sx: { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '4px' }
              }}
            />
          </Box>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { color: colors.muted, fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase' } }}>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Joined Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10 }}><CircularProgress color="inherit" /></TableCell></TableRow>
              ) : filteredUsers.map((user) => (
                <TableRow key={user.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, '& td': { borderColor: colors.border, color: '#fff', fontFamily: 'Space Grotesk' } }}>
                  <TableCell sx={{ fontWeight: 600 }}>{user.name}</TableCell>
                  <TableCell sx={{ color: colors.muted }}>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role.toUpperCase()} 
                      size="small" 
                      sx={{ bgcolor: `${getRoleColor(user.role)}20`, color: getRoleColor(user.role), border: `1px solid ${getRoleColor(user.role)}40`, fontWeight: 700, fontFamily: 'Rajdhani' }} 
                    />
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpen(user)} sx={{ color: colors.cyan }}><EditIcon /></IconButton>
                    <IconButton onClick={() => handleDelete(user.id)} sx={{ color: colors.red }}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit Dialog */}
        <Dialog open={open} onClose={handleClose} PaperProps={{ sx: { bgcolor: colors.bg, color: '#fff', border: `1px solid ${colors.border}`, minWidth: '400px' } }}>
          <form onSubmit={handleSubmit}>
            <DialogTitle sx={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>
              {editMode ? 'MODIFY USER PROFILE' : 'INITIALIZE NEW USER'}
            </DialogTitle>
            <DialogContent>
              {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                <TextField 
                  label="Full Name" fullWidth required
                  value={currentUser.name}
                  onChange={(e) => setCurrentUser({...currentUser, name: e.target.value})}
                  InputLabelProps={{ style: { color: colors.muted } }}
                  sx={{ '& input': { color: '#fff' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: colors.border } } }}
                />
                <TextField 
                  label="Email Address" fullWidth required type="email"
                  value={currentUser.email}
                  onChange={(e) => setCurrentUser({...currentUser, email: e.target.value})}
                  InputLabelProps={{ style: { color: colors.muted } }}
                  sx={{ '& input': { color: '#fff' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: colors.border } } }}
                />
                {!editMode && (
                  <TextField 
                    label="Initial Password" fullWidth required type="password"
                    value={currentUser.password}
                    onChange={(e) => setCurrentUser({...currentUser, password: e.target.value})}
                    InputLabelProps={{ style: { color: colors.muted } }}
                    sx={{ '& input': { color: '#fff' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: colors.border } } }}
                  />
                )}
                <FormControl fullWidth>
                  <InputLabel sx={{ color: colors.muted }}>System Role</InputLabel>
                  <Select
                    value={currentUser.role}
                    onChange={(e) => setCurrentUser({...currentUser, role: e.target.value})}
                    label="System Role"
                    sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: colors.border } }}
                  >
                    <MenuItem value="oncologist">ONCOLOGIST</MenuItem>
                    <MenuItem value="patient">PATIENT</MenuItem>
                    <MenuItem value="researcher">RESEARCHER</MenuItem>
                    <MenuItem value="admin">SYSTEM ADMIN</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={handleClose} sx={{ color: colors.muted }}>Cancel</Button>
              <Button type="submit" variant="contained" sx={{ bgcolor: colors.teal }}>
                {editMode ? 'UPDATE RECORD' : 'CREATE USER'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

      </Container>
    </Box>
  );
};

export default AdminDashboard;
