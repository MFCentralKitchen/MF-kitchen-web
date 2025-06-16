import React, { useEffect, useState } from 'react';
import { Modal, Box, TextField, Button, CircularProgress } from '@mui/material';
import { collection, query, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, storage } from '../firebase-config';
import Collections from '../collections';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const AddCategoryModal = ({ open, onClose }) => {
  const [category, setCategory] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [updateClicked, setUpdateClicked] = useState(false);
  
  const fetchCategories = async () => {
    const categoryQuery = query(collection(db, Collections.INVENTORY_CATEGORY));
    const querySnapshot = await getDocs(categoryQuery);
    const categoriesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCategories(categoriesList);
  };

  useEffect(() => {
    fetchCategories();
  }, []);
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);

    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!category) {
      setError('Please provide a category name');
      return;
    }

    if (!isEditing && !image) {
      setError('Please select an image for the category');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        // EDIT EXISTING CATEGORY
        const categoryToUpdate = categories.find(cat => cat.id === editingCategoryId);
        
        if (!categoryToUpdate) {
          throw new Error('Category to update not found in local state');
        }

        const categoryData = {
          ...categoryToUpdate, // Keep all existing properties
          category, // Update the name
          updatedAt: new Date().toISOString() // Add update timestamp
        };

        if (image) {
          // Delete old image if it exists
          if (categoryToUpdate.image) {
            const oldImageRef = ref(storage, `categories/${editingCategoryId}.jpg`);
            await deleteObject(oldImageRef).catch(console.error);
          }
          
          // Upload new image
          const newImageRef = ref(storage, `categories/${editingCategoryId}.jpg`);
          await uploadBytes(newImageRef, image);
          categoryData.image = await getDownloadURL(newImageRef);
        }

        await setDoc(doc(db, Collections.INVENTORY_CATEGORY, editingCategoryId), categoryData);
      } else {
        // ADD NEW CATEGORY
        const newDocRef = doc(collection(db, Collections.INVENTORY_CATEGORY));
        const imageRef = ref(storage, `categories/${newDocRef.id}.jpg`);
        await uploadBytes(imageRef, image);
        const downloadURL = await getDownloadURL(imageRef);

        const categoryData = {
          id: newDocRef.id,
          category,
          image: downloadURL,
          createdAt: new Date().toISOString(),
          updatedAt: null
        };

        await setDoc(newDocRef, categoryData);
      }

      // Reset form fields
      setCategory('');
      setImage(null);
      setImagePreview(null);
      setError('');
      onClose();
      fetchCategories();
    } catch (err) {
      console.error("Error adding/updating category: ", err);
      setError(err.message.includes('not found') 
        ? 'Category not found - please refresh and try again' 
        : 'Failed to add/update category');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (category) => {
    setCategory(category.category);
    setImagePreview(category.image);
    setEditingCategoryId(category.id);
    setIsEditing(true);
    setUpdateClicked(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(!isEditing);
    setCategory('');
    setImage(null);
    setImagePreview(null);
    setEditingCategoryId(null);
    setUpdateClicked(false);
  };

  const renderCategoryList = () => (
    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
      {categories.map(cat => (
        <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span>{cat.category}</span>
          <Button onClick={() => handleEditClick(cat)} variant="outlined">Edit</Button>
        </div>
      ))}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <h2>{isEditing ? 'Edit Category' : 'Add Category'}</h2>
        {(!isEditing || updateClicked) ? (
          <form onSubmit={handleSubmit}>
            <TextField
              label="Category Name"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              fullWidth
              margin="normal"
            />
            <input type="file" onChange={handleImageChange} style={{ marginTop: '20px' }} />
            {imagePreview && (
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <img src={imagePreview} alt="Category Preview" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} />
              </div>
            )}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Button type="submit" variant="contained" color="primary" disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'Save Changes'}
              </Button>
              <Button 
                onClick={() => {
                  onClose();
                  setCategory('');
                  setImage(null);
                  setImagePreview(null);
                  setEditingCategoryId(null);
                  setUpdateClicked(false);
                }} 
                variant="outlined" 
                color="secondary" 
                style={{ marginLeft: '10px' }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div>
            {renderCategoryList()}
            <Button onClick={handleCancelEdit} variant="outlined" color="secondary" style={{ marginTop: '20px' }}>
              Cancel Edit
            </Button>
          </div>
        )}
        <Button 
          onClick={() => {
            if (updateClicked) {
              setIsEditing(true);
            } else {
              setIsEditing(!isEditing);
            }
            setUpdateClicked(false);
          }} 
          variant="outlined" 
          style={{ position: 'absolute', top: 16, right: 16 }}
        >
          {isEditing ? 'Add Category' : 'Edit Categories'}
        </Button>
      </Box>
    </Modal>
  );
};

// Modal style to keep it centered
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: '500px',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 3,
  borderRadius: '8px',
  maxHeight: '90vh',
  overflowY: 'auto',
};

export default AddCategoryModal;