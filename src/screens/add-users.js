import React, { useState } from "react";
import {
  TextField,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
  useMediaQuery,
  Box,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  or,
} from "firebase/firestore";
import { db } from "../firebase-config";
import Collections from "../collections";
import LOGO from "../assets/MF-CPU-LOGO.png";
import Header from "../components/header";

const AddUsers = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    restaurantName: "",
    address: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false); // For loader
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Regular expression to validate UK phone number
  const isValidUKPhone = (phone) => {
    const ukPhoneRegex = /^(\+44\s?7\d{3}|\(?07\d{3}\)?|\d{5}|\d{4})\s?\d{3,4}\s?\d{3,4}$/;
    return ukPhoneRegex.test(phone);
  };
  const isMobile = useMediaQuery("(max-width:600px)");

  const validateForm = () => {
    let formErrors = {};

    if (!formData.name) formErrors.name = "Name is required";
    if (!formData.email) formErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      formErrors.email = "Email is invalid";

    if (!formData.phone) formErrors.phone = "Phone number is required";
    else if (!isValidUKPhone(formData.phone))
      formErrors.phone = "Invalid UK phone number format";

    if (!formData.password) formErrors.password = "Password is required";
    if (!formData.confirmPassword)
      formErrors.confirmPassword = "Confirm password is required";
    else if (formData.password !== formData.confirmPassword)
      formErrors.confirmPassword = "Passwords do not match";

    if (!formData.restaurantName)
      formErrors.restaurantName = "Restaurant name is required";
    if (!formData.address) formErrors.address = "Address is required";
    return formErrors;
  };

  // Check if a user with the same email or phone already exists
  const checkIfUserExists = async (email, phone) => {
    const q = query(
      collection(db, Collections.USERS),
      or(where("email", "==", email), where("phone", "==", phone))
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // returns true if user exists
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validateForm();

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
    } else {
      setErrors({});
      setLoading(true); // Show loader

      try {
        const userExists = await checkIfUserExists(
          formData.email,
          formData.phone
        );
        if (userExists) {
          setToast({
            open: true,
            message: "User with the same email or phone already exists",
            severity: "error",
          });
          setLoading(false); // Stop loader
          return;
        }

        const newUser = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          restaurantName: formData.restaurantName,
          address: formData.address,
          createdAt: new Date().toISOString(),
        };

        // Generate a reference with a random ID for the document
        const newDocRef = doc(collection(db, Collections.USERS));
        await setDoc(newDocRef, { ...newUser, id: newDocRef.id });

        // Clear form after successful submission
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          restaurantName: "",
          address: "",
        });

        // Show success message
        setToast({
          open: true,
          message: "User added successfully!",
          severity: "success",
        });
      } catch (error) {
        console.error("Error adding user: ", error);
        setToast({
          open: true,
          message: "Failed to add user",
          severity: "error",
        });
      } finally {
        setLoading(false); // Stop loader
      }
    }
  };

  return (
    <Box sx={{ backgroundColor: "#FFFAE1", color: "#C70A0A" }}>
      <Header title='Add User'/>
      <div style={{ maxWidth: "100%", margin: "0 auto", padding:!isMobile? "150px":'20px',backgroundColor:'#FFFAE1',height:isMobile ?'700px':'320Px' }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                error={!!errors.name}
                helperText={errors.name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                fullWidth
                error={!!errors.email}
                helperText={errors.email}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone (UK)"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                fullWidth
                error={!!errors.phone}
                helperText={errors.phone}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Restaurant Name"
                name="restaurantName"
                value={formData.restaurantName}
                onChange={handleChange}
                fullWidth
                error={!!errors.restaurantName}
                helperText={errors.restaurantName}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                fullWidth
                error={!!errors.password}
                helperText={errors.password}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                fullWidth
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        edge="end"
                      >
                        {showConfirmPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                fullWidth
                error={!!errors.address}
                helperText={errors.address}
              />
            </Grid>
          </Grid>

          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <Button
              variant="contained"
              color="#C70A0A"
              type="submit"
              style={{ width: "150px" }}
              sx={{ backgroundColor: "#FFB500" ,color:'white'}}
              disabled={loading} // Disable button during loading
            >
              {loading ? <CircularProgress size={24} /> : "Add User"}
            </Button>
          </div>
        </form>

        {/* Toast Notification */}
        <Snackbar
          open={toast.open}
          autoHideDuration={6000}
          onClose={() => setToast({ ...toast, open: false })}
        >
          <Alert
            onClose={() => setToast({ ...toast, open: false })}
            severity={toast.severity}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </div>
    </Box>
  );
};

export default AddUsers;
