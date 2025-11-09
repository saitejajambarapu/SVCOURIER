const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  customername: { type: String, required: true },
  phno: { type: String, required: true },
  email: { type: String, required: true },
  aadharnumber: { type: String, required: true },
  packageweight: { type: Number, required: true },
  date: { type: Date, required: true },
  expectedDeliveryDate: { type: Date, required: true },
  iclid: { type: String, required: true },
  trackingId: { type: String, required: true },
  address: { type: String, required: true },  // Address field
  state: { type: String, required: true },    // New field for state
  country: { type: String, required: true },  // Country field
  pricePerKg: { type: Number, required: true }, // Price per kg
  totalPrice: { type: Number, required: true }, // Calculated total price
  packageTrackingLocations: [String],         // Array of tracking locations
  deliveredStatus: { type: Boolean, default: false }, // Package delivery status
});

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
