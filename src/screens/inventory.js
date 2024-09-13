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
} from "@mui/material";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
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
  const [editingItemId, setEditingItemId] = useState(null); // Track which item is being edited
  const [editingField, setEditingField] = useState(null); // Track which field (price or quantity) is being edited
  const [updatedValues, setUpdatedValues] = useState({}); // Store updated quantity/price values
  const [loadingField, setLoadingField] = useState(null); // Track loading for the specific field
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [initialLoading, setInitialLoading] = useState(false);

  const uploadSampleInvoiceData = async () => {
    const invoiceData = {
      userId: 1,
      createdAt: new Date(),
      name: "user1",
      restaurantName: "Paradise",
      email: "user1@gmail.com",
      phone: "1234567890",
      items: [
        {
          title: "Turmeric Haldi Powder",
          brand: "Brand Natco",
          price: 200,
          quantity: 2,
        },
        {
          title: "Chilli Haldi Powder",
          brand: "Brand Natco",
          price: 300,
          quantity: 4,
        },
      ],
      orderStatus: "pending", // Can be "pending", "accepted", "delivered"
      deliveryCharges: 12,
      tax: 1,
      totalPrice: 912, // Calculate based on items, delivery, and tax
      isBillPayed: false,
    };

    try {
      // Upload sample data to Firestore
      await addDoc(collection(db, "invoices"), {
        ...invoiceData, // Comment this line or remove in future if Firestore auto-generates IDs
      });
      console.log("Invoice added to the database");
    } catch (err) {
      console.error("Error uploading invoice data: ", err);
    }
  };

  useEffect(() => {
    // uploadSampleInvoiceData()
    setInitialLoading(true);

    const unsubscribe = onSnapshot(
      collection(db, Collections.INVENTORY_ITEMS),
      (snapshot) => {
        const updatedItems = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProducts(updatedItems);

        // Set initial loading to false after data is fetched
        setInitialLoading(false);
      },
      (error) => {
        console.error("Error fetching data: ", error);
        setInitialLoading(false); // Ensure loading state is cleared on error
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle sorting logic
  const handleSort = (column) => {
    const isAsc = orderBy === column && orderDirection === "asc";
    setOrderDirection(isAsc ? "desc" : "asc");
    setOrderBy(column);
  };

  // Sort products based on the selected column and direction
  const sortedProducts = [...products].sort((a, b) => {
    if (orderDirection === "asc") {
      return a[orderBy] > b[orderBy] ? 1 : -1;
    } else {
      return a[orderBy] < b[orderBy] ? 1 : -1;
    }
  });

  // Filter products based on search term
  const filteredProducts = sortedProducts.filter((product) =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle input change for quantity and price during editing
  const handleFieldChange = (itemId, field, value) => {
    setUpdatedValues((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  // Save updated quantity or price
  const handleUpdate = async (itemId, field) => {
    // Get the new value from the state
    const newValue = updatedValues[itemId]?.[field];
    if (newValue === undefined) return;

    // Find the Firestore document ID using the UUID (itemId)
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

      const docId = querySnapshot.docs[0].id; // Get the document ID

      const itemRef = doc(db, Collections.INVENTORY_ITEMS, docId);
      setLoadingField(field);

      // Perform the update operation
      await updateDoc(itemRef, { [field]: Number(newValue) });

      setSnackbarMessage(
        `${
          field === "availableQuantity" ? "Quantity" : "Price"
        } updated successfully!`
      );
      setSnackbarOpen(true);
      setEditingItemId(null); // Exit edit mode
      setEditingField(null); // Clear the specific field being edited
    } catch (err) {
      console.error("Error updating item: ", err);
    } finally {
      setLoadingField(null);
    }
  };

  return (
    <div>
      <Header title="Inventory" />
      <div style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <TextField
            label="Search Products"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setAddCategoryOpen(true)}
              style={{ marginRight: "10px" }}
            >
              Add Category
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setAddProductOpen(true)}
            >
              Add Product
            </Button>
          </div>
        </div>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "title"}
                    direction={orderBy === "title" ? orderDirection : "asc"}
                    onClick={() => handleSort("title")}
                  >
                    Title
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "brand"}
                    direction={orderBy === "brand" ? orderDirection : "asc"}
                    onClick={() => handleSort("brand")}
                  >
                    Brand
                  </TableSortLabel>
                </TableCell>

                {/* Price Column */}
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "price"}
                    direction={orderBy === "price" ? orderDirection : "asc"}
                    onClick={() => handleSort("price")}
                  >
                    Price
                  </TableSortLabel>
                </TableCell>

                {/* Vendor */}
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "vendor"}
                    direction={orderBy === "vendor" ? orderDirection : "asc"}
                    onClick={() => handleSort("vendor")}
                  >
                    Vendor
                  </TableSortLabel>
                </TableCell>

                {/* Available Quantity */}
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "availableQuantity"}
                    direction={
                      orderBy === "availableQuantity" ? orderDirection : "asc"
                    }
                    onClick={() => handleSort("availableQuantity")}
                  >
                    Available Quantity
                  </TableSortLabel>
                </TableCell>

                {/* Sold Quantity */}
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "soldQuantity"}
                    direction={
                      orderBy === "soldQuantity" ? orderDirection : "asc"
                    }
                    onClick={() => handleSort("soldQuantity")}
                  >
                    Sold Quantity
                  </TableSortLabel>
                </TableCell>
                <TableCell>Total Price</TableCell>
              </TableRow>
            </TableHead>
            {initialLoading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center", // Center vertically
                  justifyContent: "center", // Center horizontally
                  width: "100%", // Full width of the parent
                  height: "100vh",
                  marginLeft: 330, // Full viewport height
                }}
              >
                <CircularProgress size={50} />
              </div>
            ) : (
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.title}</TableCell>
                    <TableCell>{product.brand}</TableCell>

                    {/* Price Field */}
                    <TableCell>
                      {editingItemId === product.id &&
                      editingField === "price" ? (
                        <>
                          <TextField
                            value={
                              updatedValues[product.id]?.price !== undefined
                                ? updatedValues[product.id].price
                                : product.price
                            }
                            onChange={(e) =>
                              handleFieldChange(
                                product.id,
                                "price",
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value)
                              )
                            }
                            size="small"
                            type="number"
                            style={{ maxWidth: "100px" }} // Limit input field width
                          />
                          <Button
                            onClick={() => handleUpdate(product.id, "price")}
                            disabled={loadingField === "price"}
                            startIcon={
                              loadingField === "price" ? (
                                <CircularProgress size={20} />
                              ) : (
                                <Save />
                              )
                            }
                          >
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                          {product.price}
                          <IconButton
                            onClick={() => {
                              setEditingItemId(product.id);
                              setEditingField("price");
                            }}
                          >
                            <Edit />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                    <TableCell>{product.vendor}</TableCell>
                    {/* Available Quantity Field */}
                    <TableCell>
                      {editingItemId === product.id &&
                      editingField === "availableQuantity" ? (
                        <>
                          <TextField
                            value={
                              updatedValues[product.id]?.availableQuantity !==
                              undefined
                                ? updatedValues[product.id].availableQuantity
                                : product.availableQuantity
                            }
                            onChange={(e) =>
                              handleFieldChange(
                                product.id,
                                "availableQuantity",
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value)
                              )
                            }
                            size="small"
                            type="number"
                            style={{ maxWidth: "100px" }} // Limit input field width
                          />
                          <Button
                            onClick={() =>
                              handleUpdate(product.id, "availableQuantity")
                            }
                            disabled={loadingField === "availableQuantity"}
                            startIcon={
                              loadingField === "availableQuantity" ? (
                                <CircularProgress size={20} />
                              ) : (
                                <Save />
                              )
                            }
                          >
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                          {product.availableQuantity}
                          <IconButton
                            onClick={() => {
                              setEditingItemId(product.id);
                              setEditingField("availableQuantity");
                            }}
                          >
                            <Edit />
                          </IconButton>
                        </>
                      )}
                    </TableCell>

                    <TableCell>{product.soldQuantity}</TableCell>
                    <TableCell>
                      {product.availableQuantity * product.price}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </TableContainer>

        {/* Add Category Modal */}
        <AddCategoryModal
          open={addCategoryOpen}
          onClose={() => setAddCategoryOpen(false)}
        />
        {/* Add Product Modal */}
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
      </div>
    </div>
  );
};

export default Inventory;
