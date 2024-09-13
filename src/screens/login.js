// src/screens/login-screen.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase-config';
import { AuthContext } from '../auth-context';
import LOGO from "../assets/MF-CPU-LOGO.png";
import {
  TextField,
  Button,
  Typography,
  Container,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from "@mui/material";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Password visibility state
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError('');
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);

    try {
      const q = query(
        collection(db, 'adminUsers'),
        where('userName', '==', username),
        where('password', '==', password)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        login({ username });
        navigate('/add-users');
      } else {
        setError('Incorrect username or password');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: '50px' }}>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
      >
        {/* Logo and Header */}
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          mb={4}
        >
          <img src={LOGO} alt="Logo" style={{ width: '300px' }} />
          {/* <Typography variant="h4" color="red">
            Madras Flavours
          </Typography>
          <Typography variant="h6" color="black">
            Central Processing Unit
          </Typography> */}
        </Box>

        {/* Login Form */}
        <TextField
          label="Username"
          variant="outlined"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
        />
        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          variant="outlined"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(prev => !prev)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />

        {error && (
          <Alert severity="error" style={{ marginTop: '10px' }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <CircularProgress style={{ marginTop: '20px' }} />
        ) : (
          <Button
            variant="contained"
            color="primary"
            fullWidth
            style={{ marginTop: '20px' }}
            onClick={handleLogin}
          >
            Login
          </Button>
        )}
      </Box>
    </Container>
  );
};

export default LoginScreen;
