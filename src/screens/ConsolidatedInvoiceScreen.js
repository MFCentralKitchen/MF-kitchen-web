import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase-config";
import html2pdf from "html2pdf.js";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  LinearProgress,
  TextField,
  IconButton,
  Tooltip,
  Typography,
  Button,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Search,
  Download,
  ChevronRight,
  X,
  ArrowLeft,
  Calendar,
  Building2,
  Mail,
  Receipt,
  CreditCard,
} from "lucide-react";
import { Phone, Business } from "@mui/icons-material";
import Header from "../components/header";
import LOGO from "../assets/MF-CPU-LOGO.png";

const ConsolidatedInvoiceView = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [consolidatedInvoices, setConsolidatedInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceGroup, setSelectedInvoiceGroup] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [isPrinting, setIsPrinting] = useState(false);
  const invoiceRef = useRef(null);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Reset states when closing modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedInvoiceGroup(null);
  };

  // Reset all selection states
  const handleBackToRestaurants = () => {
    setSelectedRestaurant(null);
    setConsolidatedInvoices([]);
    setSelectedInvoiceGroup(null);
    setShowModal(false);
  };

  const fetchRestaurants = async () => {
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      const restaurantData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRestaurants(restaurantData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      setLoading(false);
    }
  };

  const fetchInvoices = (restaurantId) => {
    const invoicesRef = collection(db, "invoices");
    const q = query(
      invoicesRef,
      where("userId", "==", restaurantId),
      orderBy("createdAt", "asc")
    );

    // Listen to real-time updates
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const invoices = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const groupedInvoices = groupInvoicesByPeriod(invoices);
        setConsolidatedInvoices(groupedInvoices);
        setLoading(false); // Stop loading after data is received
      },
      (error) => {
        console.error("Error fetching invoices:", error);
        setLoading(false); // Stop loading even if there’s an error
      }
    );

    // Return the unsubscribe function for cleanup
    return unsubscribe;
  };

  const groupInvoicesByPeriod = (invoices) => {
    const grouped = {};

    invoices.forEach((invoice) => {
      const date = new Date(invoice.createdAt); // Ensure createdAt is a valid date
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      const period = day <= 15 ? "first" : "second";

      const key = `${year}-${month}-${period}`;
      if (!grouped[key]) {
        grouped[key] = {
          period: period === "first" ? "1-15" : "16-end",
          month: date.toLocaleString("default", { month: "long" }),
          year,
          invoices: [],
          totalAmount: 0,
          totalItems: 0,
          startDate:
            period === "first"
              ? new Date(year, month, 1)
              : new Date(year, month, 16),
          endDate:
            period === "first"
              ? new Date(year, month, 15)
              : new Date(year, month + 1, 0),
          isPaid: true, // Initialize as true for payment status
        };
      }

      grouped[key].invoices.push(invoice);

      // Ensure totalPrice is valid and numeric
      const invoiceTotalPrice = parseFloat(invoice.totalPrice) || 0;
      grouped[key].totalAmount += invoiceTotalPrice;

      // Count total items if items exist
      grouped[key].totalItems += invoice.items ? invoice.items.length : 0;

      // Update payment status
      if (!invoice.isBillPaid) {
        grouped[key].isPaid = false;
      }
    });

    // Convert grouped object to array and add paymentStatus
    return Object.values(grouped)
      .map((group) => ({
        ...group,
        paymentStatus: group.isPaid ? "Paid" : "Pending",
      }))
      .sort((a, b) => b.endDate - a.endDate); // Sort by endDate in descending order
  };

  const handleDownloadPDF = async () => {
    const element = invoiceRef.current;
    if (!element) {
      console.error("Element not found for PDF generation");
      return;
    }

    // Set printing mode to hide dropdown and show text
    setIsPrinting(true);

    // Wait for state update to reflect in DOM
    await new Promise((resolve) => setTimeout(resolve, 100));

    const options = {
      margin: 10,
      filename: "invoice-details.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: true,
        scrollY: -window.scrollY,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
    };

    try {
      await html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error("PDF generation error:", error);
    } finally {
      setIsPrinting(false);
    }
  };

  const filteredRestaurants = restaurants.filter((restaurant) =>
    restaurant.restaurantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const renderEachInvoices = (invoice) => {
    let count = 0;

    // Iterate through the items array and accumulate the quantity, ensuring it's treated as a number
    invoice.items.forEach((item) => {
      count += Number(item?.quantity) || 0; // Convert quantity to a number, fallback to 0 if invalid
    });

    return count;
  };

  const handlePaymentStatusChange = async (newStatus) => {
    setPaymentStatus(newStatus); // Update local state for immediate UI response

    const isPaid = newStatus === "Paid";

    try {
      // Update each invoice record in Firestore
      await Promise.all(
        selectedInvoiceGroup.invoices.map((invoice) => {
          const invoiceDocRef = doc(db, "invoices", invoice.id); // Reference to the Firestore document
          return updateDoc(invoiceDocRef, { isBillPaid: isPaid }); // Update the document
        })
      );

      // Reflect changes in the UI
      setSelectedInvoiceGroup((prev) => ({
        ...prev,
        invoices: prev.invoices.map((invoice) => ({
          ...invoice,
          isBillPaid: isPaid,
        })),
      }));
      console.log(isPaid, "jhuygaddahjbguyi");
    } catch (error) {
      console.error("Error updating payment status: ", error);
    }
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fetchInvoices(
      selectedRestaurant?.id ? selectedRestaurant?.id : ""
    );

    // Cleanup on component unmount
    return () => unsubscribe();
  }, [selectedRestaurant]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <>
          <Header title="Invoices" />
          {/* Main Header */}
          {selectedRestaurant && (
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                p: 3,
                backgroundColor: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(10px)",
                borderRadius: 2,
                border: "1px solid #F6E05E",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  justifyContent: "space-between",
                  alignItems: { sm: "center" },
                  gap: 2,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: "bold",
                      background:
                        "linear-gradient(to right, #C53030, #D97706, #D69E2E)",
                      backgroundClip: "text",
                      color: "transparent",
                    }}
                  >
                    {selectedRestaurant
                      ? "Consolidated Invoices"
                      : "Select Restaurant"}
                  </Typography>
                  {selectedRestaurant && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mt: 2,
                      }}
                    >
                      <Building2 sx={{ color: "#F97316" }} />
                      <Box>
                        <Typography variant="h6" sx={{ color: "#2D3748" }}>
                          {selectedRestaurant.restaurantName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#4A5568" }}>
                          {selectedRestaurant.address}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
                {selectedRestaurant && (
                  <IconButton
                    onClick={handleBackToRestaurants}
                    sx={{
                      backgroundColor: "#FEE2E2",
                      "&:hover": { backgroundColor: "#FECACA" },
                      p: 2,
                    }}
                  >
                    <ArrowLeft sx={{ color: "#C53030" }} />
                  </IconButton>
                )}
              </Box>
            </Paper>
          )}

          {/* Search for Restaurants */}
          {!selectedRestaurant && (
            <Paper
              elevation={0}
              sx={{
                position: "relative",
                // mb: 3,
                backgroundColor: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(10px)",
                // borderRadius: 2,
                // border: "1px solid #F6E05E",
              }}
            >
              <TextField
                fullWidth
                variant="standard"
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Search sx={{ color: "#F97316", mr: 1 }} fontSize="small" />
                  ),
                  sx: {
                    py: 1.5,
                  },
                }}
                sx={{
                  p: 2,
                }}
              />
            </Paper>
          )}
        </>

        {/* Enhanced Restaurant Cards */}
        {!selectedRestaurant && (
          <div
            style={{
              width: "96%",
              padding: "1.5rem",
              backgroundColor: "#FFFBEB",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Table Container */}
            <TableContainer
              component={Paper}
              style={{
                borderRadius: "0.5rem",
                border: "2px solid #F6E05E",
              }}
            >
              <Table>
                <TableHead>
                  <TableRow style={{ backgroundColor: "#C70A0A" }}>
                    <TableCell
                      style={{
                        fontWeight: "700",
                        color: "#ffffff",
                        textTransform: "uppercase",
                        fontSize: "0.875rem",
                      }}
                    >
                      Restaurant Name
                    </TableCell>
                    <TableCell
                      style={{
                        fontWeight: "700",
                        color: "#ffffff",
                        textTransform: "uppercase",
                        fontSize: "0.875rem",
                      }}
                    >
                      Address
                    </TableCell>
                    <TableCell
                      style={{
                        fontWeight: "700",
                        color: "#ffffff",
                        textTransform: "uppercase",
                        fontSize: "0.875rem",
                      }}
                    >
                      Phone
                    </TableCell>
                    <TableCell
                      align="center"
                      style={{
                        fontWeight: "700",
                        color: "#ffffff",
                        textTransform: "uppercase",
                        fontSize: "0.875rem",
                      }}
                    >
                      Status
                    </TableCell>
                    <TableCell
                      align="center"
                      style={{
                        fontWeight: "700",
                        color: "#ffffff",
                        textTransform: "uppercase",
                        fontSize: "0.875rem",
                      }}
                    >
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRestaurants.map((restaurant, index) => (
                    <TableRow
                      key={restaurant.id}
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? "#FFFBEB" : "#F7F7D4",
                        transition: "background-color 0.2s ease-in-out",
                      }}
                    >
                      <TableCell style={{ fontSize: "0.875rem" }}>
                        <Typography
                          variant="body1"
                          style={{ fontWeight: "600", color: "#1A202C" }}
                        >
                          {restaurant.restaurantName}
                        </Typography>
                      </TableCell>
                      <TableCell style={{ fontSize: "0.875rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.875rem",
                            color: "#4A5568",
                          }}
                        >
                          <Business
                            style={{ color: "#E53E3E", flexShrink: 0 }}
                          />
                          <Typography variant="body2">
                            {restaurant.address}
                          </Typography>
                        </div>
                      </TableCell>
                      <TableCell style={{ fontSize: "0.875rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.875rem",
                            color: "#4A5568",
                          }}
                        >
                          <Phone style={{ color: "#E53E3E", flexShrink: 0 }} />
                          <Typography variant="body2">
                            {restaurant.phone}
                          </Typography>
                        </div>
                      </TableCell>
                      <TableCell align="center">
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            fontSize: "0.75rem",
                            fontWeight: "500",
                            borderRadius: "9999px",
                            backgroundColor: "#C6F6D5",
                            color: "#38A169",
                          }}
                        >
                          Active
                        </span>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="outlined"
                          color="secondary"
                          style={{
                            padding: "0.5rem 1rem",
                            fontSize: "0.875rem",
                            fontWeight: "500",
                            color: "#E53E3E",
                          }}
                          onClick={() => {
                            setSelectedRestaurant(restaurant);
                            fetchInvoices(restaurant.id);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        )}

        {/* Enhanced Invoice Groups */}
        {selectedRestaurant && (
          <div
            style={{
              width: "96%",
              padding: "1.5rem",
              backgroundColor: "#FFFBEB",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Table Container */}
            <TableContainer
              component={Paper}
              style={{
                borderRadius: "0.5rem",
                border: "2px solid #F6E05E",
              }}
            >
              <Table>
                <TableHead>
                  <TableRow style={{ backgroundColor: "#C70A0A" }}>
                    <TableCell
                      style={{
                        fontWeight: "700",
                        color: "#ffffff",
                        textTransform: "uppercase",
                        fontSize: "0.875rem",
                      }}
                    >
                      Month & Year
                    </TableCell>
                    <TableCell
                      style={{
                        fontWeight: "700",
                        color: "#ffffff",
                        textTransform: "uppercase",
                        fontSize: "0.875rem",
                      }}
                    >
                      Period
                    </TableCell>
                    <TableCell
                      style={{
                        fontWeight: "700",
                        color: "#ffffff",
                        textTransform: "uppercase",
                        fontSize: "0.875rem",
                      }}
                    >
                      Total Invoices
                    </TableCell>
                    <TableCell
                      style={{
                        fontWeight: "700",
                        color: "#ffffff",
                        textTransform: "uppercase",
                        fontSize: "0.875rem",
                      }}
                    >
                      Total Amount
                    </TableCell>
                    <TableCell
                      style={{
                        fontWeight: "700",
                        color: "#ffffff",
                        textTransform: "uppercase",
                        fontSize: "0.875rem",
                      }}
                    >
                      Payment Status
                    </TableCell>
                    <TableCell
                      align="center"
                      style={{
                        fontWeight: "700",
                        color: "#ffffff",
                        textTransform: "uppercase",
                        fontSize: "0.875rem",
                      }}
                    >
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {consolidatedInvoices.map((group, index) => (
                    <TableRow
                      key={`${group.year}-${group.month}-${group.period}`}
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? "#FFFBEB" : "#F7F7D4",
                        transition: "background-color 0.2s ease-in-out",
                      }}
                    >
                      {/* Month & Year */}
                      <TableCell
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#1A202C",
                        }}
                      >
                        {group.month} {group.year}
                      </TableCell>

                      {/* Period */}
                      <TableCell
                        style={{ fontSize: "0.875rem", color: "#4A5568" }}
                      >
                        {group.period === "1-15" ? "1st - 15th" : "16th - End"}
                      </TableCell>

                      {/* Total Invoices */}
                      <TableCell
                        style={{ fontSize: "0.875rem", color: "#4A5568" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.875rem",
                            color: "#4A5568",
                          }}
                        >
                          {/* <Receipt style={{ color: "#E53E3E" }} /> */}
                          {group.invoices.length}
                        </div>
                      </TableCell>

                      {/* Total Amount */}
                      <TableCell
                        style={{ fontSize: "0.875rem", color: "#4A5568" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.875rem",
                            color: "#4A5568",
                          }}
                        >
                          <CreditCard style={{ color: "#38A169" }} />
                          <Typography
                            variant="body2"
                            style={{ fontWeight: "600", color: "#2F855A" }}
                          >
                            £{group.totalAmount.toFixed(2)}
                          </Typography>
                        </div>
                      </TableCell>

                      {/* Payment Status */}
                      <TableCell
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color:
                            group.paymentStatus === "Paid"
                              ? "#38A169"
                              : "#E53E3E",
                        }}
                      >
                        {group.paymentStatus}
                      </TableCell>

                      {/* Action */}
                      <TableCell align="center">
                        <Button
                          variant="text"
                          color="secondary"
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: "500",
                            color: "#E53E3E",
                          }}
                          onClick={() => {
                            setSelectedInvoiceGroup(group);
                            setShowModal(true);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        )}

        {/* Enhanced Loading State */}
        {loading && (
          <div className="mt-12">
            <LinearProgress className="rounded-full" />
          </div>
        )}

        {/* Enhanced Modal with Table View */}
        <Dialog
          open={showModal}
          onClose={handleCloseModal}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              background:
                "linear-gradient(to bottom right, #FEE2E2, #FECACA, #F9F99F)",
              borderRadius: 2,
            },
          }}
        >
          <DialogContent
            ref={invoiceRef}
            sx={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            <div
              style={{
                flexDirection: "row",
                display: "flex",
                justifyContent: "space-between",
                paddingInline: "20px",
              }}
            >
              <DialogTitle
                sx={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  //   background:
                  //     "linear-gradient(to right, #C53030, #D97706, #D69E2E)",
                  backgroundClip: "text",
                  color: "black",
                  paddingBottom: 4,
                }}
              >
                Invoice
              </DialogTitle>
              <img
                src={LOGO}
                alt="Logo"
                style={{
                  width: "140px",
                  height: "90px",
                  marginRight: "8px",
                }}
              />
            </div>

            {selectedInvoiceGroup && (
              <div style={{ marginBottom: "24px" }}>
                {/* Bill From Section */}
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    color: "#2D3748",
                    marginLeft: "10px",
                  }}
                >
                  Bill From:{" "}
                </Typography>
                <Card
                  elevation={0}
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(10px)",
                    borderRadius: 2,
                    marginTop: "5px",
                    marginBottom: "10px",
                  }}
                >
                  <CardContent sx={{ padding: 4 }}>
                    <Typography variant="h6">
                      Central Kitchen, UNIT 5, 152 High Street, Hounslow , TW3
                      1LR
                    </Typography>
                  </CardContent>
                </Card>
                {/* Restaurant Info Card */}
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    color: "#2D3748",
                    marginLeft: "10px",
                  }}
                >
                  Bill To:{" "}
                </Typography>
                <Card
                  elevation={0}
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(10px)",
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ padding: 4 }}>
                    <div
                      style={{
                        display: "grid",
                        gap: "24px",
                        gridTemplateColumns: "1fr 1fr",
                      }}
                    >
                      <div>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: "bold", color: "#2D3748" }}
                        >
                          {selectedRestaurant.restaurantName}
                        </Typography>
                        <div style={{ marginTop: "16px" }}>
                          <Typography variant="body2" sx={{ color: "#4A5568" }}>
                            <Mail sx={{ color: "#F97316" }} />{" "}
                            {selectedRestaurant.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#4A5568" }}>
                            <Phone sx={{ color: "#F97316" }} />{" "}
                            {selectedRestaurant.phone}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#4A5568" }}>
                            <Mail sx={{ color: "#F97316" }} />{" "}
                            {selectedRestaurant.address}
                          </Typography>
                        </div>
                      </div>
                      <div>
                        <Typography variant="body2" sx={{ color: "#4A5568" }}>
                          <Mail sx={{ color: "#F97316" }} />{" "}
                          {selectedRestaurant.email}
                        </Typography>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <Calendar sx={{ color: "#F97316" }} />
                          <div>
                            <Typography
                              variant="body2"
                              sx={{ color: "#A0AEC0" }}
                            >
                              Invoice Period
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ color: "#2D3748" }}
                            >
                              {formatDate(selectedInvoiceGroup.startDate)} -{" "}
                              {formatDate(selectedInvoiceGroup.endDate)}
                            </Typography>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <Receipt sx={{ color: "#F97316" }} />
                          <div>
                            <Typography
                              variant="body2"
                              sx={{ color: "#A0AEC0" }}
                            >
                              Total Invoices
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ color: "#2D3748" }}
                            >
                              {selectedInvoiceGroup.invoices.length}
                            </Typography>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedInvoiceGroup && (
                  <Box sx={{ mb: 3, mt: 2, px: 2 }}>
                    <FormControl variant="outlined" sx={{ minWidth: 200 }}>
                      <InputLabel>Payment Status</InputLabel>
                      <Select
                        value={paymentStatus}
                        onChange={(e) =>
                          handlePaymentStatusChange(e.target.value)
                        }
                        label="Payment Status"
                      >
                        <MenuItem value="Pending">Pending</MenuItem>
                        <MenuItem value="Paid">Paid</MenuItem>
                        <MenuItem value="Overdue">Overdue</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {/* Enhanced Invoice Table */}
                <TableContainer
                  component={Paper}
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(10px)",
                    borderRadius: 2,
                    marginTop: "24px",
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Invoice #</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Items</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedInvoiceGroup.invoices.map((invoice) => (
                        <TableRow key={invoice.id} hover>
                          <TableCell>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              {/* <Receipt sx={{ color: "#F97316" }} /> */}
                              {invoice.id}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                          <TableCell>
                            <div style={{ display: "flex", gap: "8px" }}>
                              {invoice.items && renderEachInvoices(invoice)}
                            </div>
                          </TableCell>
                          <TableCell align="right">
                            <span
                              style={{ fontWeight: "bold", color: "#38A169" }}
                            >
                              £{invoice.totalPrice.toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Total Section */}
                <Card
                  elevation={0}
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(10px)",
                    borderRadius: 2,
                    marginTop: "24px",
                  }}
                >
                  <CardContent sx={{ padding: 4 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: isPrinting ? "130px" : "0px",
                      }}
                    >
                      <div>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: "bold", color: "#2D3748" }}
                        >
                          Total Amount
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#4A5568" }}>
                          For period {selectedInvoiceGroup.month}{" "}
                          {selectedInvoiceGroup.year}
                        </Typography>
                      </div>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: "bold", color: "#38A169" }}
                      >
                        £{selectedInvoiceGroup.totalAmount.toFixed(2)}
                      </Typography>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Modal Actions */}
            {!isPrinting && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "16px",
                  marginTop: "24px",
                }}
              >
                <Tooltip title="Download PDF">
                  <IconButton
                    onClick={handleDownloadPDF}
                    sx={{
                      backgroundColor: "#FEE2E2",
                      "&:hover": { backgroundColor: "#FECACA" },
                      padding: 2,
                    }}
                  >
                    <Download sx={{ color: "#C53030" }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Close">
                  <IconButton
                    onClick={handleCloseModal}
                    sx={{
                      backgroundColor: "#E2E8F0",
                      "&:hover": { backgroundColor: "#CBD5E0" },
                      padding: 2,
                    }}
                  >
                    <X sx={{ color: "#4A5568" }} />
                  </IconButton>
                </Tooltip>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ConsolidatedInvoiceView;
