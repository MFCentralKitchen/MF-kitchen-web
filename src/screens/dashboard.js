import React, { useEffect, useState } from "react";
import { db } from "../firebase-config";
import { collection, query, where, getDocs } from "firebase/firestore";
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
    const fetchData = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(todayStart);

      // Today's Orders
      const invoicesRef = collection(db, "invoices");
      const todayInvoicesQuery = query(
        invoicesRef,
        where("createdAt", ">=", todayTimestamp)
      );
      const todayInvoicesSnapshot = await getDocs(todayInvoicesQuery);

      const ordersCount = {};
      todayInvoicesSnapshot.forEach((doc) => {
        const invoice = doc.data();
        if (!ordersCount[invoice.restaurantName]) {
          ordersCount[invoice.restaurantName] = 0;
        }
        ordersCount[invoice.restaurantName]++;
      });

      setTodayOrders(ordersCount);

      // Total Available Metrics
      const inventoryRef = collection(db, "inventoryItems");
      const inventorySnapshot = await getDocs(inventoryRef);

      let totalAvailableItems = 0;
      let totalAvailableCost = 0;
      let totalAvailableQuantity = 0;

      inventorySnapshot.forEach((doc) => {
        const item = doc.data();
        totalAvailableItems += 1;
        totalAvailableCost += item.price * item.availableQuantity;
        totalAvailableQuantity += item.availableQuantity;
      });

      setTotalAvailable({
        items: totalAvailableItems,
        cost: totalAvailableCost.toFixed(2),
        quantity: totalAvailableQuantity,
      });

      // Total Sold Metrics
      const soldInvoicesQuery = query(
        invoicesRef,
        where("createdAt", "<", todayTimestamp)
      );
      const soldInvoicesSnapshot = await getDocs(soldInvoicesQuery);

      let totalSoldItems = 0;
      let totalSoldCost = 0;
      let totalSoldQuantity = 0;

      soldInvoicesSnapshot.forEach((doc) => {
        const invoice = doc.data();
        invoice.items.forEach((item) => {
          totalSoldItems += 1;
          totalSoldCost += item.price * item.quantity;
          totalSoldQuantity += item.quantity;
        });
      });

      setTotalSold({
        items: totalSoldItems,
        cost: totalSoldCost.toFixed(2),
        quantity: totalSoldQuantity,
      });

      // Total Combined Metrics
      setTotalCombined({
        items: totalAvailableItems + totalSoldItems,
        cost: (totalAvailableCost + totalSoldCost).toFixed(2),
        quantity: totalAvailableQuantity + totalSoldQuantity,
      });
    };

    fetchData();
  }, []);

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
                    <Typography style={{color:'black'}}>{totalSold.items}</Typography>
                  </div>
                  <div style={styles.itemRow}>
                    <Typography>Cost:</Typography>
                    <Typography style={{color:'black'}}>£ {totalSold.cost}</Typography>
                  </div>
                  <div style={styles.itemRow}>
                    <Typography>Quantity:</Typography>
                    <Typography style={{color:'black'}}>{totalSold.quantity}</Typography>
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
                    <Typography style={{color:'black'}}>{totalCombined.items}</Typography>
                  </div>
                  <div style={styles.itemRow}>
                    <Typography>Cost:</Typography>
                    <Typography style={{color:'black'}}>£ {totalCombined.cost}</Typography>
                  </div>
                  <div style={styles.itemRow}>
                    <Typography>Quantity:</Typography>
                    <Typography style={{color:'black'}}>{totalCombined.quantity}</Typography>
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
