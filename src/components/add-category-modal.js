import React, { useEffect, useState } from 'react';
import { Modal, Box, TextField, Button, CircularProgress } from '@mui/material';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, storage } from '../firebase-config'; // Import storage from firebase-config
import Collections from '../collections';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const AddCategoryModal = ({ open, onClose }) => {
  const [category, setCategory] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // State for the image preview
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);

    // Create a preview URL for the uploaded image
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

  

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!category || !image) {
      setError('Please provide a category name and upload an image');
      return;
    }

    setLoading(true);
    try {
      // Query to check if the category already exists
      const categoryQuery = query(
        collection(db, Collections.INVENTORY_CATEGORY),
        where('category', '==', category)
      );

      const querySnapshot = await getDocs(categoryQuery);

      if (!querySnapshot.empty) {
        setError('Category already exists. Please choose a different name.');
      } else {
        // If category doesn't exist, proceed to add it
        const newDocRef = doc(collection(db, Collections.INVENTORY_CATEGORY)); // Generate doc ref

        // Upload image to Firebase Storage
        const imageRef = ref(storage, `categories/${newDocRef.id}.jpg`); // Use appropriate naming convention
        await uploadBytes(imageRef, image); // Upload the image file

        // Get download URL
        const downloadURL = await getDownloadURL(imageRef);

        const categoryData = {
          id: newDocRef.id, // Add the generated ID to the data
          category,
          image: downloadURL, // Store the HTTP URL of the image
          createdAt: new Date().toISOString(),
        };

        await setDoc(newDocRef, categoryData); // Set the doc with custom ID and data

        // Reset form fields
        setCategory('');
        setImage(null);
        setImagePreview(null); // Clear image preview
        setError('');
        onClose(); // Close modal on success
      }
    } catch (err) {
      console.error("Error adding category: ", err);
      setError('Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <h2>Add Category</h2>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Category Name"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
            margin="normal"
          />

          {/* Image upload */}
          <input type="file" onChange={handleImageChange} style={{ marginTop: '20px' }} />
          
          {/* Show image preview after upload */}
          {imagePreview && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <img src={imagePreview} alt="Category Preview" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} />
            </div>
          )}

          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Button type="submit" variant="contained" color="primary" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Add Category'}
            </Button>
          </div>
        </form>
      </Box>
    </Modal>
  );
};

// Modal style to keep it centered
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)', // Always keep it centered
  width: '90%', // Adjust as per your need
  maxWidth: '500px',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 3,
  borderRadius: '8px',
  maxHeight: '90vh', // Prevents it from overflowing vertically
  overflowY: 'auto', // Scroll if content is too tall
};

export default AddCategoryModal;
