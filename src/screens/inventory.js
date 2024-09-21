import React, { useState, useEffect } from "react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  TableSortLabel,
  IconButton,
  CircularProgress,
  Snackbar,
  Grid,
  Box,
} from "@mui/material";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore"; // Import Timestamp
import { db } from "../firebase-config";
import AddCategoryModal from "../components/add-category-modal";
import AddProductModal from "../components/add-product-modal";
import Collections from "../collections";
import { Edit, Save } from "@mui/icons-material";
import Header from "../components/header";

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [orderBy, setOrderBy] = useState("title");
  const [orderDirection, setOrderDirection] = useState("asc");
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [updatedValues, setUpdatedValues] = useState({});
  const [loadingField, setLoadingField] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [initialLoading, setInitialLoading] = useState(false);
  const [totals, setTotals] = useState({
    totalQuantity: 0,
    totalSold: 0,
    totalPrice: 0,
  });
  const [categories, setCategories] = useState([]);
  const calculateTotals = (items) => {
    let totalQuantity = 0;
    let totalSold = 0;
    let totalPrice = 0;

    items.forEach((product) => {
      totalQuantity += product.availableQuantity || 0;
      totalSold += product.soldQuantity || 0;
      totalPrice += product.availableQuantity * product.price || 0;
    });

    setTotals({ totalQuantity, totalSold, totalPrice });
  };

  useEffect(() => {
    setInitialLoading(true);

    // Fetch categories
    const fetchCategories = async () => {
      try {
        const categorySnapshot = await getDocs(
          collection(db, Collections.INVENTORY_CATEGORY)
        );
        const categoriesData = categorySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(categoriesData);
      } catch (error) {
        console.error("Error fetching categories: ", error);
      }
    };

    fetchCategories();

    const unsubscribe = onSnapshot(
      collection(db, Collections.INVENTORY_ITEMS),
      (snapshot) => {
        const updatedItems = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProducts(updatedItems);
        calculateTotals(updatedItems);
        setInitialLoading(false);
      },
      (error) => {
        console.error("Error fetching data: ", error);
        setInitialLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSort = (column) => {
    const isAsc = orderBy === column && orderDirection === "asc";
    setOrderBy(column);
    setOrderDirection(isAsc ? "desc" : "asc");

    const sortedProducts = [...filteredProducts].sort((a, b) => {
      if (a[column] < b[column]) return isAsc ? -1 : 1;
      if (a[column] > b[column]) return isAsc ? 1 : -1;
      return 0;
    });

    setProducts(sortedProducts);
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (orderDirection === "asc") {
      return a[orderBy] > b[orderBy] ? 1 : -1;
    } else {
      return a[orderBy] < b[orderBy] ? 1 : -1;
    }
  });

  const filteredProducts = sortedProducts.filter((product) =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFieldChange = (itemId, field, value) => {
    setUpdatedValues((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const handleUpdate = async (itemId, field) => {
    const newValue = updatedValues[itemId]?.[field];
    if (newValue === undefined) return;

    try {
      const inventoryQuery = query(
        collection(db, Collections.INVENTORY_ITEMS),
        where("id", "==", itemId)
      );
      const querySnapshot = await getDocs(inventoryQuery);

      if (querySnapshot.empty) {
        console.error("No document found with the provided UUID");
        return;
      }

      const docId = querySnapshot.docs[0].id;
      const itemRef = doc(db, Collections.INVENTORY_ITEMS, docId);

      setLoadingField(field);

      // Store units as text
      await updateDoc(itemRef, {
        [field]: String(newValue), // Convert to string for units
        updatedAt: new Date(),
      });

      setSnackbarMessage(
        `${
          field === "availableQuantity"
            ? "Quantity"
            : field === "price"
            ? "Price"
            : field === "units" // Handle units specifically
            ? "Units"
            : ""
        } updated successfully!`
      );
      setSnackbarOpen(true);
      setEditingItemId(null);
      setEditingField(null);
    } catch (err) {
      console.error("Error updating item: ", err);
      setSnackbarMessage("Error updating item. Please try again.");
      setSnackbarOpen(true);
    } finally {
      setLoadingField(null);
    }
  };

  const getInitialValue = (product, field) => {
    return updatedValues[product.id]?.[field] ?? product[field];
  };

  return (
    <Box sx={{ backgroundColor: "#FFFAE1", color: "#C70A0A" }}>
      <Header title="Inventory" />
      <Grid container spacing={3} alignItems="center" mb={3}>
        <Grid item xs={12} md={5} margin={2}>
          <TextField
            fullWidth
            label="Search Products"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Grid>
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: "flex",
            justifyContent: { xs: "center", md: "flex-end" },
            gap: 2,
          }}
        >
          <Button
            variant="contained"
            onClick={() => setAddCategoryOpen(true)}
            sx={{ backgroundColor: "#C70A0A" }}
          >
            Add Category
          </Button>
          <Button
            variant="contained"
            onClick={() => setAddProductOpen(true)}
            sx={{ backgroundColor: "#FFB500" }}
          >
            Add Product
          </Button>
        </Grid>
      </Grid>

      <TableContainer sx={{ maxWidth: "100%", overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={orderBy === "title"}
                  direction={orderBy === "title" ? orderDirection : "asc"}
                  onClick={() => handleSort("title")}
                >
                  Title
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={orderBy === "brand"}
                  direction={orderBy === "brand" ? orderDirection : "asc"}
                  onClick={() => handleSort("brand")}
                >
                  Brand
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={orderBy === "vendor"}
                  direction={orderBy === "vendor" ? orderDirection : "asc"}
                  onClick={() => handleSort("vendor")}
                >
                  Vendor
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={orderBy === "category"}
                  direction={orderBy === "category" ? orderDirection : "asc"}
                  onClick={() => handleSort("category")}
                >
                  Category
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={orderBy === "units"}
                  direction={orderBy === "units" ? orderDirection : "asc"}
                  onClick={() => handleSort("units")}
                >
                  Units
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={orderBy === "availableQuantity"}
                  direction={
                    orderBy === "availableQuantity" ? orderDirection : "asc"
                  }
                  onClick={() => handleSort("availableQuantity")}
                >
                  Quantity in stock
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={orderBy === "price"}
                  direction={orderBy === "price" ? orderDirection : "asc"}
                  onClick={() => handleSort("price")}
                >
                  Price per unit
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={orderBy === "soldQuantity"}
                  direction={
                    orderBy === "soldQuantity" ? orderDirection : "asc"
                  }
                  onClick={() => handleSort("soldQuantity")}
                >
                  Stock out
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ fontWeight: "bold" }}>Total Price</TableCell>
              <TableCell style={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={orderBy === "updatedAt"}
                  direction={orderBy === "updatedAt" ? orderDirection : "asc"}
                  onClick={() => handleSort("updatedAt")}
                >
                  Updated At
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>

          {initialLoading ? (
            <CircularProgress size={50} />
          ) : (
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.title}</TableCell>
                  <TableCell>{product.brand}</TableCell>
                  <TableCell>{product.vendor}</TableCell>
                  <TableCell>
                    {categories.find((cat) => cat.id === product.categoryId)
                      ?.category || "N/A"}
                  </TableCell>

                  {/* Editable Units */}
                  <TableCell>
                    {editingItemId === product.id &&
                    editingField === "units" ? (
                      <TextField
                        value={getInitialValue(product, "units")}
                        onChange={(e) =>
                          handleFieldChange(product.id, "units", e.target.value)
                        }
                        size="small"
                        variant="outlined"
                        type="text" // Change type to "text"
                        disabled={loadingField === "units"}
                      />
                    ) : (
                      product.units
                    )}
                    {editingItemId === product.id &&
                    editingField === "units" ? (
                      <IconButton
                        color="primary"
                        onClick={() => handleUpdate(product.id, "units")}
                        disabled={loadingField === "units"}
                      >
                        <Save />
                      </IconButton>
                    ) : (
                      <IconButton
                        color="primary"
                        onClick={() => {
                          setEditingItemId(product.id);
                          setEditingField("units");
                          setUpdatedValues((prev) => ({
                            ...prev,
                            [product.id]: {
                              ...prev[product.id],
                              units: product.units,
                            },
                          }));
                        }}
                      >
                        <Edit />
                      </IconButton>
                    )}
                  </TableCell>

                  {/* Editable Quantity in Stock */}
                  <TableCell>
                    {editingItemId === product.id &&
                    editingField === "availableQuantity" ? (
                      <TextField
                        value={getInitialValue(product, "availableQuantity")}
                        onChange={(e) =>
                          handleFieldChange(
                            product.id,
                            "availableQuantity",
                            e.target.value
                          )
                        }
                        size="small"
                        variant="outlined"
                        type="number"
                        disabled={loadingField === "availableQuantity"}
                      />
                    ) : (
                      product.availableQuantity
                    )}
                    {editingItemId === product.id &&
                    editingField === "availableQuantity" ? (
                      <IconButton
                        color="primary"
                        onClick={() =>
                          handleUpdate(product.id, "availableQuantity")
                        }
                        disabled={loadingField === "availableQuantity"}
                      >
                        <Save />
                      </IconButton>
                    ) : (
                      <IconButton
                        color="primary"
                        onClick={() => {
                          setEditingItemId(product.id);
                          setEditingField("availableQuantity");
                          setUpdatedValues((prev) => ({
                            ...prev,
                            [product.id]: {
                              ...prev[product.id],
                              availableQuantity: product.availableQuantity,
                            },
                          }));
                        }}
                      >
                        <Edit />
                      </IconButton>
                    )}
                  </TableCell>

                  {/* Editable Price */}
                  <TableCell>
                    {editingItemId === product.id &&
                    editingField === "price" ? (
                      <TextField
                        value={getInitialValue(product, "price")}
                        onChange={(e) =>
                          handleFieldChange(product.id, "price", e.target.value)
                        }
                        size="small"
                        variant="outlined"
                        type="number"
                        disabled={loadingField === "price"}
                      />
                    ) : (
                      `£ ${product.price}`
                    )}
                    {editingItemId === product.id &&
                    editingField === "price" ? (
                      <IconButton
                        color="primary"
                        onClick={() => handleUpdate(product.id, "price")}
                        disabled={loadingField === "price"}
                      >
                        <Save />
                      </IconButton>
                    ) : (
                      <IconButton
                        color="primary"
                        onClick={() => {
                          setEditingItemId(product.id);
                          setEditingField("price");
                          setUpdatedValues((prev) => ({
                            ...prev,
                            [product.id]: {
                              ...prev[product.id],
                              price: product.price,
                            },
                          }));
                        }}
                      >
                        <Edit />
                      </IconButton>
                    )}
                  </TableCell>

                  {/* Stock Out */}
                  <TableCell>{product.soldQuantity}</TableCell>

                  {/* Total Price */}
                  <TableCell>
                    £ {(product.price * product.availableQuantity).toFixed(1)}
                  </TableCell>

                  {/* Updated At */}
                  <TableCell>
                    {product.updatedAt
                      ? new Date(
                          product.updatedAt.seconds * 1000
                        ).toLocaleString("en-GB")
                      : product.createdAt
                      ? new Date(product.createdAt).toLocaleString("en-GB") // Assuming createdAt is in ISO string format
                      : "N/A"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ backgroundColor: "#FFB500" }}>
                <TableCell colSpan={6}></TableCell>
                <TableCell>
                  <strong>{totals.totalQuantity}</strong>
                </TableCell>
                <TableCell>
                  <strong>{totals.totalSold}</strong>
                </TableCell>
                <TableCell></TableCell>
                <TableCell>
                  <strong>£ {totals.totalPrice.toFixed(2)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
      </TableContainer>

      <AddCategoryModal
        open={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
      />
      <AddProductModal
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default Inventory;
