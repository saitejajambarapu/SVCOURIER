const express = require("express");
const app = express();
const path = require("path");
const ejsmate = require("ejs-mate"); // For layouts
const mongoose = require("mongoose");
const CountryPrices = require("./models/pricings.js");
const passport = require("passport");
const localStrategy = require("passport-local");
const User = require("./models/user.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const Customer = require("./models/customer.js"); // Corrected model name to 'customer.js'
const Comment = require("./models/comments.js");
const flash = require("connect-flash");
const methodOverride = require('method-override');
const moment = require('moment');
const axios = require('axios');




const MONGO_URL = "mongodb://127.0.0.1:27017/Courier";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsmate);

// MongoDB session store configuration
const store = MongoStore.create({
  mongoUrl: MONGO_URL,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600, // Update the session after 24 hours if active
});

store.on("error", (err) => {
  console.log("Error in Mongo Session Store", err);
});

// Session options
const sessionOptions = {
  store,
  secret: "secret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
app.use(express.static(path.join(__dirname, "public"))); // Serve static files from the "public" folder
app.use(express.urlencoded({ extended: true }));
app.use(flash()); // Flash messages middleware
app.use(methodOverride('_method'));
app.use(express.json());
passport.serializeUser(User.serializeUser()); // Store user in session
passport.deserializeUser(User.deserializeUser()); // Retrieve user from session

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.isloggedin = req.user;
  next();
});

// MongoDB connection
async function main() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to MongoDB database");
  } catch (err) {
    console.log("Error connecting to MongoDB:", err);
  }
}

main(); // Initialize the DB connection

/////////////////////
// Routes

// Home Route
app.get("/Home", async (req, res) => {
  console.log("Home route hit");

  try {
    // Fetch all comments from the database (sorted by createdAt in descending order)
    const comments = await Comment.find().sort({ createdAt: -1 });

    // Fetch the customer data based on the trackingId (assuming trackingId exists in the Comment)
    // We will populate `from`, `to`, and `name` based on the customer data.
    const commentsWithCustomerInfo = await Promise.all(comments.map(async (comment) => {
      const customer = await Customer.findOne({ trackingId: comment.trackingId });

      return comment;
    }));

    // Log the 'from' field for each updated comment
    commentsWithCustomerInfo.forEach(c => {
      console.log(c.from); // Log the updated 'from' value
    });

    // Render the "index.ejs" page and pass the comments as a variable
    res.render("index", { comments: commentsWithCustomerInfo });

  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).send('Error fetching comments');
  }
});



// Prices Route
app.get("/Prices", async (req, res) => {
  try {
    const CountryLists = await CountryPrices.find({});
    res.render("prices.ejs", { CountryLists });
  } catch (err) {
    console.log("Error fetching prices:", err);
    res.status(500).send("Error fetching prices");
  }
});

// About Route
app.get("/About", (req, res) => {
  res.render("About.ejs");
});

// Login Route
app.get("/Login", (req, res) => {
  res.render("Login.ejs");
});

// Login POST route
app.post("/Login", passport.authenticate("local", {
  failureRedirect: "/Login",
  failureFlash: true,
}), (req, res) => {
  req.flash("success", "Welcome back!");
  res.redirect("/home");
});

// Logout Route
app.get("/Logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "Logged Out Successfully!");
    res.redirect("/home");
  });
});

// My Profile Route
app.get("/myprofile", async (req, res) => {
  try {
    // Get today's date in the same format as the `date` field (for comparison)
    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();

    // Get the total number of orders
    const totalOrders = await Customer.countDocuments();

    // Get the total income by summing up the `totalPrice` field
    const totalIncomeData = await Customer.aggregate([
      { $group: { _id: null, totalIncome: { $sum: '$totalPrice' } } }
    ]);
    const totalIncome = totalIncomeData.length > 0 ? totalIncomeData[0].totalIncome : 0;

    // Get today's orders (where `date` is today's date)
    const todaysOrders = await Customer.countDocuments({
      date: { $gte: todayStart, $lt: todayEnd }
    });

    // Get today's income by summing up the `totalPrice` of today's orders
    const todaysIncomeData = await Customer.aggregate([
      {
        $match: {
          date: { $gte: todayStart, $lt: todayEnd }
        }
      },
      { $group: { _id: null, todaysIncome: { $sum: '$totalPrice' } } }
    ]);
    const todaysIncome = todaysIncomeData.length > 0 ? todaysIncomeData[0].todaysIncome : 0;

    // Render the dashboard view with these values
    res.render("profile.ejs", {
      totalOrders,
      totalIncome,
      todaysOrders,
      todaysIncome
    });
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).send('Internal Server Error');
  }
});
// Add Customer Route
app.get("/addNewCustomerDetails", (req, res) => {
  res.render("addcustomer.ejs");
});

// Add Customer POST route
app.post("/add-customer", async (req, res) => {
  try {
    const {
      customername,
      phno,
      email,
      aadharnumber,
      packageweight,
      pricePerKg,
      address,
      country,
      date,
      expectedDeliveryDate,
      trackingId,
      iclid,
      state,
    } = req.body;

    const totalPrice = packageweight * pricePerKg; // Calculate total price

    const newCustomer = new Customer({
      customername,
      phno,
      email,
      aadharnumber,
      packageweight,
      pricePerKg,
      address,
      state,
      country,
      date,
      expectedDeliveryDate,
      trackingId,
      iclid,
      totalPrice, // Storing the calculated total price
    });

    await newCustomer.save();
    req.flash("success", "Customer added successfully!");
    res.redirect("/viewAllCustomerDetails");
  } catch (err) {
    console.log("Error adding customer:", err);
    res.status(500).send("Error adding customer");
  }
});

app.get("/viewAllCustomerDetails", async (req, res) => {
  try {
    // Set the current date
    let today = new Date();

    // Fetch all customers (no filter for future/past) 
    const customers = await Customer.find()
      .sort({ expectedDeliveryDate: 1 })  // Sort by Expected Delivery Date (ascending)
      .lean();  // Convert to plain JavaScript objects for rendering

    // Render the customers page with the fetched data
    

    res.render("viewcustomers.ejs", { customers, today });
  } catch (err) {
    console.log("Error fetching customers:", err);
    res.status(500).send("Error fetching customer details");
  }
});




//search
app.get('/search', async (req, res) => {
  try {
      // Extract the Tracking ID from query parameters
      const { trackingId } = req.query;

      // Search for the customer by Tracking ID
      const customer = await Customer.findOne({ trackingId });

      // If the customer is found, render the details
      if (customer) {
          res.render('search.ejs', { customer });
      } else {
          // If no customer is found, send a 404 or a message
          res.status(404).send('Customer not found');
      }
  } catch (error) {
      console.error('Error searching customer by tracking ID:', error);
      res.status(500).send('Server error');
  }
});
// Edit Customer Route
app.get("/edit-customer/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await Customer.findById(id);
    if (!customer) {
      req.flash("error", "Customer not found");
      return res.redirect("/viewAllCustomerDetails");
    }
    res.render("views.ejs", { customer });
  } catch (err) {
    console.log("Error fetching customer for edit:", err);
    res.status(500).send("Error fetching customer for edit");
  }
});

// Update Customer POST route
app.post("/edit-customer/:id", async (req, res) => {
  const { id } = req.params;
  const {
    customername,
    phno,
    email,
    aadharnumber,
    packageweight,
    pricePerKg,
    address,
    state,
    country,
    date,
    expectedDeliveryDate,
    trackingId,
    iclid,
    packageTrackingLocations
  } = req.body;

  // Debugging: Log the incoming data to verify it's being sent correctly
  console.log('Form data received:', req.body);

  try {
    // Recalculate total price
    const totalPrice = packageweight * pricePerKg;

    // Update the customer details in the database
    await Customer.findByIdAndUpdate(id, {
      customername,
      phno,
      email,
      aadharnumber,
      packageweight,
      pricePerKg,
      address,
      state,
      country,
      date,
      expectedDeliveryDate,
      trackingId,
      iclid,
      totalPrice,
      packageTrackingLocations: packageTrackingLocations ? packageTrackingLocations.split(',') : []
    });

    // Flash message for success
    req.flash("success", "Customer details updated successfully!");
    res.redirect("/viewAllCustomerDetails");
  } catch (err) {
    console.log("Error updating customer:", err);
    res.status(500).send("Error updating customer");
  }
});



// Delete Customer Route
app.delete('/delete-customer/:customerId', async (req, res) => {
  const { customerId } = req.params;

  try {
    // Step 1: Find the customer by ID
    const customer = await Customer.findById(customerId);
    if (!customer) {
      req.flash('error', 'Customer not found');
      return res.redirect('/viewAllCustomerDetails');
    }

    await customer.deleteOne();


    // Step 3: Redirect with a success message
    req.flash('success', 'Customer deleted successfully!');
    res.redirect('/viewAllCustomerDetails'); // Redirect to the customers listing page or wherever you want
  } catch (err) {
    console.log('Error deleting customer:', err);
    req.flash('error', 'Error deleting customer');
    res.redirect('/viewAllCustomerDetails');
  }
});

// // Customer Details Route
// app.get('/customer/:id', async (req, res) => {
//   const { id } = req.params;
//   try {
//     const customer = await Customer.findById(id);
//     if (!customer) {
//       req.flash("error", "Customer not found");
//       return res.redirect("/viewAllCustomerDetails");
//     }
//     res.render('customerDetails.ejs', { customer });
//   } catch (err) {
//     console.log("Error fetching customer details:", err);
//     res.status(500).send("Error fetching customer details");
//   }
// });

// Add Tracking Location Route
app.get('/add-tracking/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await Customer.findById(id);
    if (!customer) {
      req.flash("error", "Customer not found");
      return res.redirect("/viewAllCustomerDetails");
    }
    res.render("tracking.ejs", { customer });
  } catch (err) {
    console.log("Error fetching customer for tracking:", err);
    res.status(500).send("Error fetching customer for tracking");
  }
});

app.post('/add-tracking/:id', async (req, res) => {
  const { id } = req.params;
  const { location } = req.body;

  if (!location) {
    return res.status(400).send('Location is required');
  }

  try {
    const customer = await Customer.findById(id);
    if (!customer) {
      req.flash("error", "Customer not found");
      return res.redirect("/viewAllCustomerDetails");
    }

    customer.packageTrackingLocations.push(location);
    await customer.save();

    req.flash("success", "Tracking location added successfully!");
    res.redirect(`/viewAllCustomerDetails`);  // Redirect to the customer's detail page
  } catch (err) {
    console.log("Error adding tracking location:", err);
    res.status(500).send("Error adding tracking location");
  }
});


app.post('/edit-customer/:customerId', async (req, res) => {
  const { customerId } = req.params;
  const { customername, phno, email, aadharnumber, packageweight, address,state,country, pricePerKg, totalPrice, packageTrackingLocations } = req.body;

  try {
      // Find the customer by ID
      const customer = await Customer.findById(customerId);

      if (!customer) {
          req.flash('error', 'Customer not found');
          return res.redirect('/viewAllCustomerDetails');
      }

      // Update the customer's basic information
      customer.customername = customername;
      customer.phno = phno;
      customer.email = email;
      customer.aadharnumber = aadharnumber;
      customer.packageweight = packageweight;
      customer.address = address;
      customer.pricePerKg = pricePerKg;
      customer.totalPrice = totalPrice;
      customer.state = state;
      customer.country = country;

      // Handle updating the tracking locations (if any)
      if (packageTrackingLocations) {
          // Ensure packageTrackingLocations is an array
          customer.packageTrackingLocations = packageTrackingLocations
              .split(',')  // Split the string into an array by commas
              .map(location => location.trim());  // Trim any extra spaces around each location
      }

      // Save the updated customer
      await customer.save();

      // Set a success message and redirect to the edit page
      req.flash('success', 'Customer details updated successfully!');
      res.redirect(`/edit-customer/${customerId}`);
  } catch (err) {
      console.error('Error updating customer:', err);
      res.status(500).send('Error updating customer');
  }
});



app.get('/delete-tracking/:customerId/:trackingIndex', async (req, res) => {
  const { customerId, trackingIndex } = req.params;

  try {
    // Step 1: Find the customer by ID
    const customer = await Customer.findById(customerId);
    if (!customer) {
      req.flash('error', 'Customer not found');
      return res.redirect('/viewAllCustomerDetails');
    }

    // Step 2: Check if the trackingIndex is valid
    if (trackingIndex < 0 || trackingIndex >= customer.packageTrackingLocations.length) {
      req.flash('error', 'Invalid tracking index');
      return res.redirect(`/edit-customer/${customerId}`);
    }

    // Step 3: Remove the tracking location at the specified index
    customer.packageTrackingLocations.splice(trackingIndex, 1);

    // Step 4: Save the updated customer
    await customer.save();

    // Step 5: Send success response or redirect with a success message
    req.flash('success', 'Tracking location deleted successfully!');
    res.redirect(`/edit-customer/${customerId}`);
  } catch (err) {
    console.log('Error deleting tracking location:', err);
    req.flash('error', 'Error deleting tracking location');
    res.redirect(`/viewAllCustomerDetails`);
  }
});

app.post('/update-tracking/:customerId/:trackingIndex', async (req, res) => {
  const { customerId, trackingIndex } = req.params;
  const { location } = req.body; // Get the updated location

  if (!location) {
      return res.status(400).send('Location is required');
  }

  try {
      const customer = await Customer.findById(customerId);
      if (!customer) {
          req.flash('error', 'Customer not found');
          return res.redirect('/viewAllCustomerDetails');
      }

      // Ensure that the tracking index is within bounds
      if (trackingIndex >= customer.packageTrackingLocations.length) {
          req.flash('error', 'Invalid tracking index');
          return res.redirect(`/edit-customer/${customerId}`);
      }

      // Update the tracking location
      customer.packageTrackingLocations[trackingIndex] = location;
      await customer.save();

      req.flash('success', 'Tracking location updated successfully!');
      res.redirect(`/edit-customer/${customerId}`);
  } catch (err) {
      console.log('Error updating tracking location:', err);
      res.status(500).send('Error updating tracking location');
  }
});


app.post('/update-delivery-status/:customerId', async (req, res) => {
  const { customerId } = req.params;
  const { deliveredStatus } = req.body; // Get the delivery status from the form checkbox

  try {
      const customer = await Customer.findById(customerId);
      if (!customer) {
          req.flash('error', 'Customer not found');
          return res.redirect('/viewAllCustomerDetails');
      }

      // Update the delivery status (convert to boolean)
      customer.deliveredStatus = deliveredStatus === 'on'; // 'on' means checked (true), 'undefined' means unchecked (false)

      // Save the customer data
      await customer.save();

      req.flash('success', 'Delivery status updated successfully!');
      res.redirect('/viewAllCustomerDetails');
  } catch (err) {
      console.log('Error updating delivery status:', err);
      req.flash('error','Error updating delivery status');
      res.redirect('/viewAllCustomerDetails');
  }
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Function to fetch flag by country name
async function getCountryFlag(countryName) {
  try {
    const response = await axios.get(`https://restcountries.com/v3.1/name/${countryName}`);
    const flag = response.data[0].flags.png;
    console.log(`Flag URL: ${flag}`);
    return flag;
  } catch (error) {
    console.error('Error fetching flag:', error);
    return "https://flagcdn.com/w320/in.png";
  }
}

app.get("/addNewCountry",async (req, res) =>{
  res.render("newprice.ejs");
})
// Route to handle form submission (POST)
app.post('/addNewCountry', async (req, res) => {
  const { title, image, price, Docprice, Date, Days } = req.body;
  const flag =await getCountryFlag(image.url);
  image.url = flag;
  // Create a new instance of the CountryPrices model
  const newCountry = new CountryPrices({
      title,
      image: { url: image.url },
      price,
      Docprice,
      Date,
      Days
  });

  try {
      // Save the new country price entry to the database
      await newCountry.save();
      res.redirect('/Prices');  // Redirect to the homepage (or another page after successful submission)
  } catch (err) {
      console.error('Error saving country:', err);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/editCountry/:id', async (req, res) => {
  const countryId = req.params.id;

  try {
      // Use await to wait for the result from the database
      const country = await CountryPrices.findById(countryId);

      if (country) {
          console.log(country.title); // Logs the country title
          res.render('editprice.ejs', { country });
      } else {
          res.status(404).send("Country not found");
      }
  } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
  }
});



app.post('/updateCountry/:id', async (req, res) => {
  const countryId = req.params.id;
  const { title, price, days } = req.body;
  
  try {
      // Find the country by ID
      const country = await CountryPrices.findById(countryId);

      if (country) {
          // Update the country's details
          country.title = title;
          country.price = parseFloat(price);  // Ensure price is a float
          country.Days = parseInt(days, 10);  // Ensure days is an integer

          // Save the updated country back to the database
          await country.save();  // Save the changes to the document

          // Redirect to the list of countries (or wherever you want)
          res.redirect('/Prices');
      } else {
          res.status(404).send("Country not found");
      }
  } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
  }
});

app.post('/deleteCountry/:id', async (req, res) => {
  const countryId = req.params.id;

  try {
      // Find the country by ID and delete it from the database
      const country = await CountryPrices.findByIdAndDelete(countryId);

      if (country) {
          // If the country was found and deleted, redirect to the Prices list
          res.redirect('/Prices');
      } else {
          // If no country is found with that ID, send a 404 error
          res.status(404).send("Country not found");
      }
  } catch (err) {
      // Handle any potential errors, such as DB connection issues
      console.error(err);
      res.status(500).send("Server error");
  }
});


////////////////////////////////////////////
app.get("/calculatePrice/:id", async (req, res) => {
  try {
    // Fetch country data by ID
    const country = await CountryPrices.findById(req.params.id);

    if (!country) {
      return res.status(404).send("Country not found.");
    }

    // Render the page with country data
    res.render("calculator.ejs", { country });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// GET all comments
app.get('/comments', async (req, res) => {
  try {
      const comments = await Comment.find().sort({ createdAt: -1 }); // Fetch latest first
      res.json(comments); // Return the comments in JSON format

} catch (err) {
  console.error(err);
  req.flash('error', "Customer Not Found With The Given Tracking ID !"); // Return the saved comment
  res.send("allreviews.ejs")
}
});

// POST a new comment
app.post('/comments', async (req, res) => {
  const { trackingId, comment, rating } = req.body;

  try {
    // Fetch customer details using the trackingId
    const customer = await Customer.findOne({ trackingId });

    if (!customer) {
      req.flash('error', 'Customer not found with this tracking ID');
      return res.redirect('/Home');  // Ensure redirect if no customer found
    }

    // Prepare the new comment with customer details
    const newComment = new Comment({
      trackingId,
      comment,
      rating,
      from: 'Hyderabad',  // Default origin (can be changed based on logic)
      to: customer.state+" "+customer.country,  // Set to the customer's country
      name: customer.customername  // Set to the customer's name
    });

    // Save the new comment to the database
    const savedComment = await newComment.save();

    // Flash message after successful submission
    req.flash('success', `Comment added successfully! ${customer.customername}`);
    return res.redirect('/Home');  // Ensure redirect here

  } catch (err) {
    console.error('Error occurred during comment submission:', err);
    req.flash('error', 'An error occurred while saving the comment.');
    return res.redirect('/Home');  // Ensure redirect if an error occurs
  }
});



// PUT (Edit) an existing comment by ID
// PUT route to edit a comment
app.put('/comments/:id', async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body; // Get the new comment text

  // Check if the user is the author of the comment
  const existingComment = await Comment.findById(id);
  if (!existingComment) {
    return res.status(404).json({ message: 'Comment not found.' });
  }



  // Update the comment
  existingComment.comment = comment;
  await existingComment.save();

  req.flash('success', "Comment updated successfully!");
    return res.redirect('/Home');  // Ensure redirect here
});

// DELETE route to delete a comment
app.delete('/comments/:id', async (req, res) => {
  const { id } = req.params;

  // Find the comment by ID
  const comment = await Comment.findById(id);
  if (!comment) {
    return res.status(404).json({ message: 'Comment not found.' });
  }

  

  // Delete the comment
  await Comment.findByIdAndDelete(id);
  req.flash('success', 'Comment deleted successfully!');
  return res.redirect('/Home');  // Ensure redirect here
});


// Catch-all route for undefined routes (404)/////////////////////////////////////////////////////////////////////////////////////
app.use((req, res) => {
  res.status(404).send("Page Not Found");
});

// Start the server
app.listen(8080, () => {
  console.log("Server is running on http://localhost:8080");
});
