import React, { useEffect, useState } from "react";
import { db } from "../firebase-config";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import Header from "../components/header";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import StoreIcon from "@mui/icons-material/Store";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import { Timestamp } from "firebase/firestore";

const Dashboard = () => {
  const [todayOrders, setTodayOrders] = useState({});
  const [totalAvailable, setTotalAvailable] = useState({});
  const [totalSold, setTotalSold] = useState({});
  const [totalCombined, setTotalCombined] = useState({});

  useEffect(() => {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0); // Set UTC hours to 00:00:00
    const todayTimestamp = Timestamp.fromDate(todayStart);

    // Log for debugging
    console.log("Today's Start UTC Timestamp:", todayTimestamp);
    console.log("Today's Start Date:", todayStart.toISOString());

    // Listen to real-time updates with onSnapshot
    const invoicesRef = collection(db, "invoices");

    const unsubscribe = onSnapshot(invoicesRef, (snapshot) => {
      const ordersCount = {};

      if (snapshot.empty) {
        console.log("No orders found for today.");
      } else {
        snapshot.forEach((doc) => {
          const invoice = doc.data();

          // Handle different date formats for createdAt
          const createdAt = invoice.createdAt;

          let invoiceDate;
          if (createdAt && createdAt.seconds) {
            // Firestore Timestamp
            invoiceDate = new Date(createdAt.seconds * 1000);
          } else if (typeof createdAt === "string") {
            // ISO String
            invoiceDate = new Date(createdAt);
          }

          // Log for debugging
          console.log("Invoice data:", invoice);
          console.log("Formatted Invoice Date:", invoiceDate);

          // Only include invoices from today (UTC)
          if (invoiceDate && invoiceDate >= todayStart) {
            if (invoice.restaurantName) {
              if (!ordersCount[invoice.restaurantName]) {
                ordersCount[invoice.restaurantName] = 0;
              }
              ordersCount[invoice.restaurantName]++;
            }
          }
        });

        setTodayOrders(ordersCount); // Update today's orders
      }
    });

    // Clean up listener on unmount

    // Fetch Total Available Metrics
    const inventoryRef = collection(db, "inventoryItems");
    const unsubscribeTotalAvailable = onSnapshot(inventoryRef, (snapshot) => {
      let totalAvailableItems = 0;
      let totalAvailableCost = 0;
      let totalAvailableQuantity = 0;

      snapshot.forEach((doc) => {
        const item = doc.data();
        totalAvailableItems += 1;
        totalAvailableCost += item.price * Number(item.availableQuantity) || 0;
        totalAvailableQuantity += Number(item.availableQuantity) || 0;
      });

      setTotalAvailable({
        items: totalAvailableItems,
        cost: totalAvailableCost.toFixed(2),
        quantity: totalAvailableQuantity,
      });
    });

    // Fetch Total Sold Metrics
    const soldInvoicesQuery = query(
      invoicesRef,
      where("createdAt", "<", todayTimestamp)
    );

    const unsubscribeTotalSold = onSnapshot(soldInvoicesQuery, (snapshot) => {
      let totalSoldItems = 0;
      let totalSoldCost = 0;
      let totalSoldQuantity = 0;

      snapshot.forEach((doc) => {
        const invoice = doc.data();
        invoice.items.forEach((item) => {
          totalSoldItems += 1;
          totalSoldCost += item.price * Number(item.quantity) || 0;
          totalSoldQuantity += Number(item.quantity) || 0;
        });
      });

      setTotalSold({
        items: totalSoldItems,
        cost: totalSoldCost.toFixed(2),
        quantity: totalSoldQuantity,
      });
    });

    // Clean up listeners on unmount
    return () => {
      unsubscribe();

      unsubscribeTotalAvailable();
      unsubscribeTotalSold();
    };
  }, []);

  // Separate effect for updating total combined when available or sold changes
  useEffect(() => {
    const combinedItems = (totalAvailable.items || 0) + (totalSold.items || 0);
    const combinedCost = (parseFloat(totalAvailable.cost) || 0) + (parseFloat(totalSold.cost) || 0);
    const combinedQuantity = (totalAvailable.quantity || 0) + (totalSold.quantity || 0);

    setTotalCombined({
      items: combinedItems,
      cost: combinedCost.toFixed(2),
      quantity: combinedQuantity,
    });
  }, [totalAvailable, totalSold]);

  const styles = {
    card: {
      backgroundColor: "#FFFAE1", // light mustard yellow
      color: "#C70039", // red
      padding: "16px",
    },
    tableHeader: {
      backgroundColor: "#C70039",
      color: "white",
    },
    icon: {
      marginRight: "8px",
    },
    title: {
      fontWeight: "bold",
      marginBottom: "16px",
    },
    cardItemContainer: {
      display: "flex",
      flexDirection: "column", // Column layout for the items
      justifyContent: "space-around", // Add space between items
      gap: "10px", // Add spacing between rows
    },
    itemRow: {
      display: "flex",
      justifyContent: "space-between", // Aligns key-value pairs horizontally
      alignItems: "center",
      marginBottom: "8px", // Adds spacing between the rows
    },
  };

  return (
    <div>
      <Header title={"Dashboard"} />
      <Grid container spacing={3} sx={{ padding: "20px" }}>
        {/* Today's Orders */}
        <Grid item xs={12} className="centeredCard" style={styles.centeredCard}>
          <Card style={{ ...styles.card, width: "100%" }}>
            <CardContent>
              <Typography variant="h6" style={styles.title}>
                <RestaurantIcon style={styles.icon} /> Today's Orders
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell style={styles.tableHeader}>
                      Restaurant Name
                    </TableCell>
                    <TableCell style={styles.tableHeader}>Orders</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.keys(todayOrders).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        No orders today
                      </TableCell>
                    </TableRow>
                  ) : (
                    Object.keys(todayOrders).map((restaurant) => (
                      <TableRow key={restaurant}>
                        <TableCell>{restaurant}</TableCell>
                        <TableCell>{todayOrders[restaurant] || 0}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Second Row: Total Available, Total Sold, Total Combined */}
        <Grid container item spacing={3} style={styles.rowContainer}>
          <Grid item xs={12} sm={6} md={4}>
            <Card style={styles.card}>
              <CardContent>
                <Typography variant="h6" style={styles.title}>
                  <StoreIcon style={styles.icon} /> Total Available
                </Typography>

                {/* Group Items in a Flexbox container */}
                <div style={styles.cardItemContainer}>
                  <div style={styles.itemRow}>
                    <Typography>Items:</Typography>
                    <Typography style={{ color: "black" }}>
                      {totalAvailable.items}
                    </Typography>
                  </div>
                  <div style={styles.itemRow}>
                    <Typography>Cost:</Typography>
                    <Typography style={{ color: "black" }}>
                      £ {totalAvailable.cost}
                    </Typography>
                  </div>
                  <div style={styles.itemRow}>
                    <Typography>Quantity:</Typography>
                    <Typography style={{ color: "black" }}>
                      {totalAvailable.quantity}
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card style={styles.card}>
              <CardContent>
                <Typography variant="h6" style={styles.title}>
                  <ShoppingCartIcon style={styles.icon} /> Total Sold
                </Typography>

                {/* Flexbox for Sold Items */}
                <div style={styles.cardItemContainer}>
                  <div style={styles.itemRow}>
                    <Typography>Items:</Typography>
                    <Typography style={{ color: "black" }}>
                      {totalSold.items}
                    </Typography>
                  </div>
                  <div style={styles.itemRow}>
                    <Typography>Cost:</Typography>
                    <Typography style={{ color: "black" }}>
                      £ {totalSold.cost}
                    </Typography>
                  </div>
                  <div style={styles.itemRow}>
                    <Typography>Quantity:</Typography>
                    <Typography style={{ color: "black" }}>
                      {totalSold.quantity}
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card style={styles.card}>
              <CardContent>
                <Typography variant="h6" style={styles.title}>
                  <MergeTypeIcon style={styles.icon} /> Total Combined
                </Typography>

                {/* Flexbox for Combined Items */}
                <div style={styles.cardItemContainer}>
                  <div style={styles.itemRow}>
                    <Typography>Items:</Typography>
                    <Typography style={{ color: "black" }}>
                      {totalCombined.items}
                    </Typography>
                  </div>
                  <div style={styles.itemRow}>
                    <Typography>Cost:</Typography>
                    <Typography style={{ color: "black" }}>
                      £ {totalCombined.cost}
                    </Typography>
                  </div>
                  <div style={styles.itemRow}>
                    <Typography>Quantity:</Typography>
                    <Typography style={{ color: "black" }}>
                      {totalCombined.quantity}
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
};

export default Dashboard;
