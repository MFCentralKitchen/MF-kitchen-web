// components/OrderTimeSettings.js
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  TextField,
  Box,
  Alert,
  Card,
  CardContent,
  Button,
  Snackbar,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { DateTime } from 'luxon';

const OrderTimeSettings = () => {
  const [settings, setSettings] = useState({
    startTime: '09:00',
    endTime: '23:00',
  });
  const [currentTime, setCurrentTime] = useState('');
  const [isOrderWindowActive, setIsOrderWindowActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
    updateCurrentTime();
    
    const interval = setInterval(updateCurrentTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    checkOrderWindow();
  }, [settings, currentTime]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const docRef = doc(db, "orderSettings", "timeSettings");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Document exists, load the data
        const data = docSnap.data();
        setSettings({
          startTime: data.startTime || '09:00',
          endTime: data.endTime || '23:00',
        });
      } else {
        // Document doesn't exist, create it with default values
        const defaultSettings = {
          startTime: '09:00',
          endTime: '23:00',
          createdAt: new Date().toISOString(),
        };
        
        await setDoc(docRef, defaultSettings);
        setSettings(defaultSettings);
        console.log("Default settings created in Firestore");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrentTime = () => {
    // Get current time in UK timezone
    const londonTime = DateTime.now().setZone('Europe/London');
    setCurrentTime(londonTime.toFormat('HH:mm'));
  };

  const checkOrderWindow = () => {
    const current = DateTime.fromFormat(currentTime, 'HH:mm');
    const start = DateTime.fromFormat(settings.startTime, 'HH:mm');
    const end = DateTime.fromFormat(settings.endTime, 'HH:mm');

    let isActive = false;
    
    if (start <= end) {
      // Normal case: same day window (e.g., 09:00-23:00)
      isActive = current >= start && current <= end;
    } else {
      // Overnight window (e.g., 22:00-06:00)
      isActive = current >= start || current <= end;
    }

    setIsOrderWindowActive(isActive);
  };

  const handleTimeChange = (field, newValue) => {
    const timeString = newValue.toFormat('HH:mm');
    setSettings(prev => ({
      ...prev,
      [field]: timeString
    }));
  };

  const saveSettings = async () => {
    try {
      const docRef = doc(db, "orderSettings", "timeSettings");
      
      // Use setDoc with merge: true to create or update the document
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      console.log("Settings saved successfully!");
      setSaveSuccess(true);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const handleManualSave = () => {
    saveSettings();
  };

  const handleCloseSnackbar = () => {
    setSaveSuccess(false);
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography>Loading order settings...</Typography>
      </Paper>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Order Time Settings
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          Current UK Time: {currentTime} | Order Window: {isOrderWindowActive ? 'ACTIVE' : 'INACTIVE'}
        </Alert>

        <Box sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TimePicker
                label="Start Time"
                value={DateTime.fromFormat(settings.startTime, 'HH:mm')}
                onChange={(newValue) => handleTimeChange('startTime', newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TimePicker
                label="End Time"
                value={DateTime.fromFormat(settings.endTime, 'HH:mm')}
                onChange={(newValue) => handleTimeChange('endTime', newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              onClick={handleManualSave}
              sx={{ mt: 1 }}
            >
              Save Settings
            </Button>
          </Box>

          <Card sx={{ mt: 2, bgcolor: isOrderWindowActive ? 'success.light' : 'error.light' }}>
            <CardContent>
              <Typography variant="body1" fontWeight="bold">
                Order Window: {settings.startTime} - {settings.endTime}
              </Typography>
              <Typography variant="body2">
                Status: {isOrderWindowActive ? 
                  '✅ Orders can be placed' : 
                  '❌ Orders cannot be placed'}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Current UK Time: {currentTime}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Snackbar
          open={saveSuccess}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
          message="Settings saved successfully!"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Paper>
    </LocalizationProvider>
  );
};

export default OrderTimeSettings;