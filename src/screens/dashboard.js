import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Paper,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
} from "@mui/material";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  AlertCircle,
  TrendingUp,
  Package,
  CircleDollarSign,
  ShoppingBag,
  ChevronDown,
  PoundSterling,
  ClipboardX,
} from "lucide-react";
import { collection, query, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../firebase-config";
import fetchRestaurantPerformance from "./fetchRestaurantPerformance";
import TodayInvoicesGrid from "../components/TodayInvoicesGrid";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { DateTime } from "luxon";
import SalesCards from "../components/SalesCards";

const Dashboard = () => {
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [restaurantPerformance, setRestaurantPerformance] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [todayOrders, setTodayOrders] = useState({});
  const [totalAvailable, setTotalAvailable] = useState({});
  const [totalSold, setTotalSold] = useState({});
  const [totalCombined, setTotalCombined] = useState({});
  const [todayRestaurantOrders, setTodayRestaurantOrders] = useState([]);
  const [restaurantUnpaidRevenue, setRestaurantUnpaidRevenue] = useState([]);
  const [isCutoffEnabled, setIsCutoffEnabled] = useState(false);

  const getChartHeight = () => {
    return window.innerWidth <= 768 ? 200 : 300;
  };

  const checkAndUpdateCutoffStatus = async () => {
    const londonTime = DateTime.now().setZone("Europe/London");
    const hour = londonTime.hour;

    // let shouldBeEnabled = !(hour >= 18 || hour < 6); // Disable between 6PM-6AM

    try {
      const docRef = doc(db, "cutoffTime", "O5uOFJFkCskUD6roE237");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const dbValue = docSnap.data().isCutoffEnabled;

        // If the DB value differs from the calculated value, update Firestore
        // if (dbValue !== shouldBeEnabled) {
        //   await updateDoc(docRef, { isCutoffEnabled: shouldBeEnabled });
        // }

        setIsCutoffEnabled(dbValue);
      } else {
        console.log("No such document!");
      }
    } catch (error) {
      console.error("Error fetching cutoff status:", error);
    }
  };

  useEffect(() => {
    checkAndUpdateCutoffStatus();

    // Set an interval to check every minute
    // const interval = setInterval(checkAndUpdateCutoffStatus, 60000);

    // return () => clearInterval(interval);
  }, []);


   // Handle Manual Toggle Change
   const handleToggleChange = async () => {
    const newValue = !isCutoffEnabled;
    setIsCutoffEnabled(newValue);

    try {
      const docRef = doc(db, "cutoffTime", "O5uOFJFkCskUD6roE237");
      await updateDoc(docRef, {
        isCutoffEnabled: newValue
      });
      console.log("Cutoff status updated successfully!");
    } catch (error) {
      console.error("Error updating cutoff status:", error);
    }
  };
  

  const [chartHeight, setChartHeight] = useState(getChartHeight());

  useEffect(() => {
    const handleResize = () => {
      setChartHeight(getChartHeight());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getResturantPerformanceData = async () => {
    const restaurantPerformanceData = await fetchRestaurantPerformance(db);
    console.log(restaurantPerformanceData, "tettauhjdghkjchfgsh");
    setRestaurantPerformance(restaurantPerformanceData);
  };

  useEffect(() => {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const invoicesRef = collection(db, "invoices");

    // Orders Listener
    const unsubscribeOrders = onSnapshot(invoicesRef, (snapshot) => {
      const ordersCount = {};
      const salesData = [];
      const statusCount = new Map();
      const restaurantOrders = new Map();
      const restaurantUnpaid = new Map();

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

          // Today's Restaurant Orders
          if (invoiceDate && invoiceDate >= todayStart) {
            if (invoice.restaurantName) {
              restaurantOrders.set(
                invoice.restaurantName,
                (restaurantOrders.get(invoice.restaurantName) || 0) + 1
              );
            }
          }

          // Restaurant Unpaid Revenue
          if (!invoice.isBillPaid && invoice.restaurantName) {
            const invoiceTotal = invoice.items.reduce(
              (sum, item) => sum + (item.price * item.quantity || 0),
              0
            );
            restaurantUnpaid.set(
              invoice.restaurantName,
              (restaurantUnpaid.get(invoice.restaurantName) || 0) + invoiceTotal
            );
          }

          // Today's Orders
          if (invoiceDate && invoiceDate >= todayStart) {
            if (invoice.restaurantName) {
              ordersCount[invoice.restaurantName] =
                (ordersCount[invoice.restaurantName] || 0) + 1;
            }
          }

          // Order Status
          const status =
            (invoice.orderStatus || "Pending").charAt(0).toUpperCase() +
            (invoice.orderStatus || "Pending").slice(1);
          statusCount.set(status, (statusCount.get(status) || 0) + 1);

          // Restaurant Performance
          // const restaurant = restaurantPerformance.find(r => r.name === invoice.restaurantName) ||
          //   { name: invoice.restaurantName, orders: 0, revenue: 0 };
          // restaurant.orders += 1;
          // restaurant.revenue += invoice.totalPrice || 0;

          // Sales Trend (last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          if (invoiceDate && invoiceDate >= sevenDaysAgo) {
            const formattedDate = invoiceDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            });

            const existingDay = salesData.find(
              (item) => item.date === formattedDate
            );
            if (existingDay) {
              existingDay.Sales += invoice.items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              );
            } else {
              salesData.push({
                date: formattedDate,
                Sales: invoice.items.reduce(
                  (sum, item) => sum + item.price * item.quantity,
                  0
                ),
              });
            }
          }
        });

        // Sort sales data by date
        salesData.sort((a, b) => {
          const [dayA, monthA] = a.date.split(" ");
          const [dayB, monthB] = b.date.split(" ");
          const months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];

          // Adjust months for year transition
          let monthIndexA = months.indexOf(monthA);
          let monthIndexB = months.indexOf(monthB);

          // If we're comparing December with January
          if (monthA === "Dec" && monthB === "Jan") {
            return -1; // December should come before January
          } else if (monthA === "Jan" && monthB === "Dec") {
            return 1; // January should come after December
          }

          // Normal case - same year comparison
          return (
            monthIndexA * 31 +
            parseInt(dayA) -
            (monthIndexB * 31 + parseInt(dayB))
          );
        });

        setOrderStatusData(
          Array.from(statusCount, ([name, value]) => ({ name, value }))
        );
        setTodayOrders(ordersCount);
        setSalesTrend(salesData);
        // Convert Map to array format for charts
        setTodayRestaurantOrders(
          Array.from(restaurantOrders, ([name, orders]) => ({
            name,
            orders,
          }))
        );

        setRestaurantUnpaidRevenue(
          Array.from(restaurantUnpaid, ([name, unpaid]) => ({
            name,
            unpaid: parseFloat(unpaid.toFixed(2)),
          }))
        );
      }
    });

    // Total Available Metrics
    const inventoryRef = collection(db, "inventoryItems");

    const unsubscribeTotalAvailable = onSnapshot(
      inventoryRef,
      async (snapshot) => {
        let totalAvailableItems = 0;
        let totalAvailableCost = 0;
        let totalAvailableQuantity = 0;
        const lowStock = [];
        // const categories = new Map();

        snapshot.forEach((doc) => {
          const item = doc.data();

          totalAvailableItems += 1;
          totalAvailableCost +=
            parseFloat(item.price) * Number(item.availableQuantity) || 0;
          totalAvailableQuantity += Number(item.availableQuantity) || 0;

          if (Number(item.availableQuantity) <= 10) {
            lowStock.push({
              title: item.title,
              quantity: Number(item.availableQuantity),
              threshold: 10,
            });
          }
        });

        setTotalAvailable({
          items: totalAvailableItems,
          cost: totalAvailableCost.toFixed(2),
          quantity: totalAvailableQuantity,
        });
        setLowStockItems(lowStock);

        const categoryRef = collection(db, "inventoryCategory");
        const categorySnapshot = await getDocs(categoryRef);

        // Create a map of categories
        const categories = categorySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().category,
        }));

        // Fetch all items from `inventory`
        const inventoryRef = collection(db, "inventoryItems");
        const inventorySnapshot = await getDocs(inventoryRef);

        // Aggregate sales for each category
        const categoryData = categories.map((category) => {
          const Sales = inventorySnapshot.docs
            .filter((itemDoc) => itemDoc.data().categoryId === category.id)
            .reduce(
              (total, itemDoc) => total + (itemDoc.data().soldQuantity || 0),
              0
            );

          return {
            name: category.name,
            Sales,
          };
        });
        setCategoryData(categoryData);
      }
    );

    // Total Sold Metrics
    const unsubscribeTotalSold = onSnapshot(invoicesRef, (snapshot) => {
      let totalSoldItems = 0;
      let totalSoldCost = 0;
      let totalSoldQuantity = 0;
      let totalPaid = 0;
      let totalUnpaid = 0;

      snapshot.forEach((doc) => {
        const invoice = doc.data();
        let invoiceTotalCost = 0;

        // Calculate totals for items in this invoice
        invoice.items.forEach((item) => {
          totalSoldItems += 1;
          const itemCost = parseFloat(item.price) * Number(item.quantity) || 0;
          invoiceTotalCost += itemCost;
          totalSoldCost += itemCost;
          totalSoldQuantity += Number(item.quantity) || 0;
        });

        // Add to paid or unpaid total based on the invoice's orderStatus
        if (invoice.isBillPaid) {
          totalPaid += invoiceTotalCost;
        } else {
          totalUnpaid += invoiceTotalCost;
        }
        // console.log(invoiceTotalCost,"ITS TOTAL COST",totalPaid)
      });

      // Update state with all calculated totals
      setTotalSold({
        items: totalSoldItems,
        cost: totalSoldCost.toFixed(2),
        quantity: totalSoldQuantity,
        totalPaid: totalPaid.toFixed(2),
        totalUnpaid: totalUnpaid.toFixed(2),
      });
    });

    getResturantPerformanceData();

    return () => {
      unsubscribeOrders();
      unsubscribeTotalAvailable();
      unsubscribeTotalSold();
    };
  }, []);

  // Combined Metrics Effect
  useEffect(() => {
    const combinedItems = (totalAvailable.items || 0) + (totalSold.items || 0);
    const combinedCost =
      (parseFloat(totalAvailable.cost) || 0) +
      (parseFloat(totalSold.cost) || 0);
    const combinedQuantity =
      (totalAvailable.quantity || 0) + (totalSold.quantity || 0);

    setTotalCombined({
      items: combinedItems,
      cost: combinedCost.toFixed(2),
      quantity: combinedQuantity,
    });
  }, [totalAvailable, totalSold]);

  const TodayOrdersTable = ({ data }) => {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: "bold" }}>
                Restaurant Name
              </TableCell>
              <TableCell style={{ fontWeight: "bold" }} align="right">
                Orders
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.name}>
                <TableCell>{row.name}</TableCell>
                <TableCell align="right">{row.orders}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const TodayOrdersChart = ({ data }) => {
    if (!data || data.length === 0) {
      return (
        <Box
          sx={{
            height: 300,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <ClipboardX size={48} color="#FFB800" />
          <Typography variant="h6" color="text.secondary" align="center">
            No orders received today
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            New orders will appear here as they come in
          </Typography>
        </Box>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="orders" fill="#FFB800" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const COLORS = ["#C70039", "#FFB800", "#FF8042", "#00C49F"]; // Red and Mustard theme colors

  return (
    <Box sx={{ minHeight: "100vh", padding: 4, backgroundColor: "#f9f9f9" }}>
      <Paper sx={{ padding: 2, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <Typography variant="h6">Allow Mobile Orders</Typography>
        <Switch checked={isCutoffEnabled} onChange={handleToggleChange} />
      </Paper>

      {/* Top Row - KPI Cards */}
      <Grid container spacing={4} sx={{ marginBottom: 4 }}>
        {[
          {
            title: "Total Revenue",
            value: `£${totalSold.cost || 0}`,
            icon: <PoundSterling />,
            color: "#C70039",
          },
          // {
          //   title: "Today's Orders",
          //   value: Object.values(todayOrders).reduce((total, orders) => total + orders, 0),
          //   icon: <ShoppingBag />,
          //   color: "#FFB800"
          // },
          {
            title: "Paid Revenue", // Updated Name
            value: `£${totalSold.totalPaid || 0}`,
            icon: <PoundSterling />,
            color: "#FFB800",
          },
          {
            title: "Pending Revenue", // Updated Name
            value: `£${totalSold.totalUnpaid || 0}`,
            icon: <PoundSterling />,
            color: "#C70039",
          },
        ].map((stat, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card
              sx={{
                boxShadow: 2,
                "&:hover": { boxShadow: 4 },
                borderTop: `4px solid ${stat.color}`,
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Box sx={{ color: stat.color, marginRight: 1 }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="h6" fontWeight="bold">
                    {stat.title}
                  </Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold">
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <SalesCards />

      {/* Charts Grid */}
      <Grid container spacing={4}>
        {/* Sales Trend */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ padding: 3 }}>
            <Typography variant="h6" mb={2} style={{ fontWeight: "bold" }}>
              Weekly Sales Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    `£${parseFloat(value).toFixed(2)}`,
                    "Sales",
                  ]}
                  labelFormatter={(label) => (
                    <span style={{ fontWeight: "bold" }}>{label}</span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="Sales"
                  stroke="#C70039"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Order Status Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ padding: 3 }}>
            <Typography variant="h6" mb={2} style={{ fontWeight: "bold" }}>
              Order Status
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Today's Orders by Restaurant */}
        <Grid item xs={12} md={12}>
          <Paper sx={{ padding: 3 }}>
            <Typography variant="h6" mb={2} style={{ fontWeight: "bold" }}>
              Today's Orders by Restaurant
            </Typography>
            <TodayOrdersTable data={todayRestaurantOrders} />
          </Paper>
        </Grid>

        {/* Restaurant Unpaid Revenue */}
        <Grid item xs={12} md={12}>
          <Paper sx={{ padding: 3 }}>
            <Typography variant="h6" mb={2} style={{ fontWeight: "bold" }}>
              Pending Revenue by Restaurant
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={restaurantUnpaidRevenue}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [`£${value}`, "Pending Amount"]}
                />
                <Bar dataKey="unpaid" fill="#C70039" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Category Performance */}
        <Grid item xs={12} md={12}>
          <Paper sx={{ padding: 3 }}>
            <Typography variant="h6" mb={2} style={{ fontWeight: "bold" }}>
              Sales By Category
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Sales" fill="#FFB800" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Restaurant Performance */}
        <Grid item xs={12} md={12}>
          <Paper sx={{ padding: 3 }}>
            <Typography variant="h6" mb={2} fontWeight={"bold"}>
              Performance by Restaurant
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={restaurantPerformance}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    `£${parseFloat(value).toFixed(2)}`,
                    "Revenue",
                  ]}
                  labelFormatter={(label) => (
                    <span style={{ fontWeight: "bold" }}>{label}</span>
                  )}
                />
                <Bar dataKey="revenue" fill="#C70039" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <TodayInvoicesGrid />

        {/* Low Stock Alerts Accordion */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ChevronDown />}
              sx={{ backgroundColor: "#fff3f3" }}
            >
              <Typography color="error" variant="h6">
                Low Stock Items ({lowStockItems.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {lowStockItems.map((item, index) => (
                  <Grid item xs={12} key={index}>
                    <Alert
                      severity="warning"
                      sx={{ backgroundColor: "#fff3f3" }}
                    >
                      <AlertTitle>{item.title}</AlertTitle>
                      Only {item.quantity} units remaining
                    </Alert>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
