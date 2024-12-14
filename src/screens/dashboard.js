import React, { useEffect, useState } from "react";
import { db } from "../firebase-config";
import { collection, query, onSnapshot } from "firebase/firestore";
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
  Box,
  Paper,
} from "@mui/material";
import Header from "../components/header";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import StoreIcon from "@mui/icons-material/Store";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import AttachMoneyIcon from "@mui/icons-material/CurrencyPound";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [todayOrders, setTodayOrders] = useState({});
  const [totalAvailable, setTotalAvailable] = useState({});
  const [totalSold, setTotalSold] = useState({});
  const [totalCombined, setTotalCombined] = useState({});
  const [salesTrend, setSalesTrend] = useState([]);

  useEffect(() => {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const invoicesRef = collection(db, "invoices");

    // Orders Listener
    const unsubscribeOrders = onSnapshot(invoicesRef, (snapshot) => {
      const ordersCount = {};
      const salesData = [];

      if (!snapshot.empty) {
        snapshot.forEach((doc) => {
          const invoice = doc.data();
          const createdAt = invoice.createdAt;
          let invoiceDate;

          if (createdAt && createdAt.seconds) {
            invoiceDate = new Date(createdAt.seconds * 1000);
          } else if (typeof createdAt === "string") {
            invoiceDate = new Date(createdAt);
          }

          // Today's Orders
          if (invoiceDate && invoiceDate >= todayStart) {
            if (invoice.restaurantName) {
              ordersCount[invoice.restaurantName] = 
                (ordersCount[invoice.restaurantName] || 0) + 1;
            }
          }

          // Sales Trend (last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          if (invoiceDate && invoiceDate >= sevenDaysAgo) {
            const formattedDate = invoiceDate.toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: 'short' 
            });
            
            const existingDay = salesData.find(item => item.date === formattedDate);
            if (existingDay) {
              existingDay.sales += invoice.items.reduce((sum, item) => 
                sum + (item.price * item.quantity), 0);
            } else {
              salesData.push({
                date: formattedDate,
                sales: invoice.items.reduce((sum, item) => 
                  sum + (item.price * item.quantity), 0)
              });
            }
          }
        });

        // Sort sales data by date
        salesData.sort((a, b) => {
          const [dayA, monthA] = a.date.split(' ');
          const [dayB, monthB] = b.date.split(' ');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return (months.indexOf(monthA) * 31 + parseInt(dayA)) - 
                 (months.indexOf(monthB) * 31 + parseInt(dayB));
        });

        setTodayOrders(ordersCount);
        setSalesTrend(salesData);
      }
    });

    // Total Available Metrics
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

    // Total Sold Metrics
    const unsubscribeTotalSold = onSnapshot(invoicesRef, (snapshot) => {
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

    // Clean up listeners
    return () => {
      unsubscribeOrders();
      unsubscribeTotalAvailable();
      unsubscribeTotalSold();
    };
  }, []);

  // Combined Metrics Effect
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
      background: 'linear-gradient(145deg, #f0f4f8 0%, #ffffff 100%)',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      borderRadius: '12px',
      transition: 'transform 0.3s ease-in-out',
      '&:hover': {
        transform: 'scale(1.02)',
      },
    },
    icon: {
      color: '#C70039',
      marginRight: '10px',
      fontSize: '32px',
    },
    title: {
      fontWeight: 700,
      color: '#2c3e50',
      display: 'flex',
      alignItems: 'center',
      marginBottom: '15px',
    },
    metricValue: {
      fontWeight: 600,
      color: '#2c3e50',
    },
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{ 
          backgroundColor: 'white', 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '5px'
        }}>
          <p className="label">{`Date: ${label}`}</p>
          <p className="value">
            {`Sales: £${payload[0].value.toLocaleString()}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Box sx={{ 
      // backgroundColor: '#f4f6f9', 
      minHeight: '110vh', 
      // padding: '20px' 
    }}>
      <Header title="Restaurant Dashboard" />
      
      <Grid container spacing={4} padding={4} >
        {/* Sales Trend Chart */}
        <Grid item xs={12}>
          <Paper 
            elevation={3} 
            sx={{ 
              borderRadius: '12px', 
              padding: '20px',
              backgroundColor: 'white' 
            }}
          >
            <Typography variant="h6" sx={styles.title}>
              <AttachMoneyIcon sx={styles.icon} />
              Weekly Sales Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
        <LineChart data={salesTrend}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="sales" 
            stroke="#C70039" 
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Today's Orders */}
        <Grid item xs={12} md={4}>
          <Card sx={styles.card}>
            <CardContent>
              <Typography variant="h6" sx={styles.title}>
                <RestaurantIcon sx={styles.icon} /> 
                Today's Orders
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Restaurant</TableCell>
                    <TableCell align="right">Orders</TableCell>
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
                        <TableCell align="right">
                          {todayOrders[restaurant] || 0}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Available */}
        <Grid item xs={12} md={4}>
          <Card sx={styles.card}>
            <CardContent>
              <Typography variant="h6" sx={styles.title}>
                <StoreIcon sx={styles.icon} /> 
                Total Available
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Items:</Typography>
                    <Typography sx={styles.metricValue}>
                      {totalAvailable.items}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Cost:</Typography>
                    <Typography sx={styles.metricValue}>
                      £ {totalAvailable.cost}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Quantity:</Typography>
                    <Typography sx={styles.metricValue}>
                      {totalAvailable.quantity}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Sold */}
        <Grid item xs={12} md={4}>
          <Card sx={styles.card}>
            <CardContent>
              <Typography variant="h6" sx={styles.title}>
                <ShoppingCartIcon sx={styles.icon} /> 
                Total Sold
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Items:</Typography>
                    <Typography sx={styles.metricValue}>
                      {totalSold.items}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Cost:</Typography>
                    <Typography sx={styles.metricValue}>
                      £ {totalSold.cost}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Quantity:</Typography>
                    <Typography sx={styles.metricValue}>
                      {totalSold.quantity}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Combined */}
        <Grid item xs={12} md={12}>
          <Card sx={styles.card}>
            <CardContent>
              <Typography variant="h6" sx={styles.title}>
                <MergeTypeIcon sx={styles.icon} /> 
                Total Combined
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Items:</Typography>
                    <Typography sx={styles.metricValue}>
                      {totalCombined.items}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Cost:</Typography>
                    <Typography sx={styles.metricValue}>
                      £ {totalCombined.cost}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Quantity:</Typography>
                    <Typography sx={styles.metricValue}>
                      {totalCombined.quantity}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;