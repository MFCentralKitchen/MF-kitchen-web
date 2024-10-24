import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Grid,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  useMediaQuery,
  TableContainer,
  Paper,
} from "@mui/material";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase-config";
import Collections from "../collections";
import Header from "../components/header";
import { Edit, Save, Cancel } from "@mui/icons-material";

const ManageUsers = () => {
  const [users, setUsers] = useState([]); // State to hold users
  const [editMode, setEditMode] = useState(null); // Track which row is in edit mode
  const [editedUser, setEditedUser] = useState(null); // Hold the edited user data
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "" });
  const isMobile = useMediaQuery("(max-width:600px)");

  // Fetch all users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersSnapshot = await getDocs(collection(db, Collections.USERS));
        const usersList = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersList);
        console.log(usersList,"lkkl,","90909009")
      } catch (error) {
        console.error("Error fetching users: ", error);
        setToast({
          open: true,
          message: "Error fetching users",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Handle editing logic
  const handleEdit = (user) => {
    setEditMode(user.id);
    setEditedUser({ ...user }); // Make a copy of the user data to edit
  };

  const handleSave = async (id) => {
    try {
      const userDocRef = doc(db, Collections.USERS, id);
      await updateDoc(userDocRef, editedUser); // Update the Firestore document with edited data
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === id ? { ...user, ...editedUser } : user
        )
      );
      setToast({
        open: true,
        message: "User updated successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error updating user: ", error);
      setToast({
        open: true,
        message: "Error updating user",
        severity: "error",
      });
    } finally {
      setEditMode(null); // Exit edit mode
    }
  };

  const handleCancel = () => {
    setEditMode(null);
    setEditedUser(null);
  };

  const handleChange = (e) => {
    setEditedUser({
      ...editedUser,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Box sx={{ color: "#C70A0A" }}>
      <Header title="Manage Users" />
      <Box sx={{ maxWidth: "100%", margin: "0 auto", paddingTop: isMobile ? '10px' : '20px', height: "auto" }}>
        {loading ? (
          <CircularProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#C70A0A", color: "white" }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>Name</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>Password</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>Email</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>Phone</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>Restaurant Name</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>Address</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} sx={{ backgroundColor: "#FFFAE1" }}>
                    {editMode === user.id ? (
                      <>
                        <TableCell>
                          <TextField
                            name="name"
                            value={editedUser.name}
                            onChange={handleChange}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            name="password"
                            value={editedUser.password}
                            onChange={handleChange}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            name="email"
                            value={editedUser.email}
                            onChange={handleChange}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            name="phone"
                            value={editedUser.phone}
                            onChange={handleChange}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            name="restaurantName"
                            value={editedUser.restaurantName}
                            onChange={handleChange}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            name="address"
                            value={editedUser.address}
                            onChange={handleChange}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={() => handleSave(user.id)} color="success">
                            <Save />
                          </IconButton>
                          <IconButton onClick={handleCancel} color="error">
                            <Cancel />
                          </IconButton>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.password}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell>{user.restaurantName}</TableCell>
                        <TableCell>{user.address}</TableCell>
                        <TableCell>
                          <IconButton onClick={() => handleEdit(user)} color="primary">
                            <Edit />
                          </IconButton>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

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
      </Box>
    </Box>
  );
};

export default ManageUsers;
