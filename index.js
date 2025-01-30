// Import dependencies
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Schemas
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: {
    type: String,
    enum: ["user", "technician", "admin"],
    default: "user",
  },
});

const TechnicianSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  location: String,
  availableSlots: [String],
  serviceFee: Number,
});

const ProblemSchema = new mongoose.Schema({
  name: String,
});

const DeviceTypeSchema = new mongoose.Schema({
  name: String,
  image: String,
});

const BrandSchema = new mongoose.Schema({
  name: String,
  image: String,
});

const ModelSchema = new mongoose.Schema({
  name: String,
  brandId: mongoose.Schema.Types.ObjectId,
  image: String,
});

const BookingSchema = new mongoose.Schema({
  userId: String,
  problem: String,
  deviceType: String,
  brand: String,
  model: String,
  technicianId: String,
  timeSlot: String,
  status: { type: String, default: "Pending" },
  paymentStatus: { type: String, default: "Unpaid" },
});

const User = mongoose.model("User", UserSchema);
const Technician = mongoose.model("Technician", TechnicianSchema);
const Problem = mongoose.model("Problem", ProblemSchema);
const DeviceType = mongoose.model("DeviceType", DeviceTypeSchema);
const Brand = mongoose.model("Brand", BrandSchema);
const Model = mongoose.model("Model", ModelSchema);
const Booking = mongoose.model("Booking", BookingSchema);

// Predefined Technicians
async function seedTechnicians() {
  const technicianUsers = await User.find({ role: "technician" });
  if (technicianUsers.length > 0) {
    console.log("Technicians already exist.");
    return;
  }

  const technicians = [
    {
      email: "tech1@example.com",
      name: "Technician 1",
      password: "password",
      role: "technician",
    },
    {
      email: "tech2@example.com",
      name: "Technician 2",
      password: "password",
      role: "technician",
    },
    {
      email: "tech3@example.com",
      name: "Technician 3",
      password: "password",
      role: "technician",
    },
  ];

  for (const tech of technicians) {
    const user = new User(tech);
    await user.save();
    const technician = new Technician({
      userId: user._id,
      location: "Lahore",
      availableSlots: ["Monday 10AM", "Tuesday 2PM"],
      serviceFee: 500,
    });
    await technician.save();
  }

  console.log("Predefined technicians have been added.");
}

seedTechnicians();

// Routes
app.post("/api/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashedPassword, role });
  await user.save();
  res.status(201).json({ message: "User registered successfully" });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid)
    return res.status(401).json({ message: "Invalid password" });

  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.json({ message: "Login successful", token, user });
});

app.post("/book", async (req, res) => {
  const { userId, problem, deviceType, brand, model, timeSlot } = req.body;
  const technician = await Technician.findOne({ location: "Lahore" });
  if (!technician)
    return res.status(404).json({ message: "Technician not found" });

  const booking = new Booking({
    userId,
    problem,
    deviceType,
    brand,
    model,
    technicianId: technician._id,
    timeSlot,
    paymentStatus: "Pending",
  });
  await booking.save();
  res.status(201).json({ message: "Booking created successfully", booking });
});

// Payment Route (Mockup for Paystack Integration)
app.post("/pay", async (req, res) => {
  const { bookingId, paymentRef } = req.body;
  const booking = await Booking.findById(bookingId);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  // Assume payment is successful
  booking.paymentStatus = "Paid";
  await booking.save();
  res.json({ message: "Payment successful", booking });
});

// Start Server
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
