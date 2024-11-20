import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config(); // Load environment variables from .env file

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the "uploads" folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure the "uploads" directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Save files in "uploads" directory
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Unique file name
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Define the Employee schema
const employeeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: { type: String, required: false }, // Store the file path as a string
  name: { type: String, required: true },
  designation: { type: String, required: true },
  dob: { type: Date, required: true },
  address: { type: String, required: true },
});

// Create the Employee model
const Employee = mongoose.model("Employee", employeeSchema);

// CRUD Operations

// Create an employee
app.post("/api/employees", upload.single("image"), async (req, res) => {
  try {
    const { title, name, designation, dob, address } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null; // Handle the file path

    const newEmployee = new Employee({
      title,
      image,
      name,
      designation,
      dob,
      address,
    });

    const savedEmployee = await newEmployee.save();
    res.status(201).json(savedEmployee);
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({ message: "Error creating employee", error });
  }
});

// Get all employees with pagination
app.get("/api/employees", async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  try {
    const employees = await Employee.find()
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .exec();
    const totalEmployees = await Employee.countDocuments();

    res.status(200).json({
      totalEmployees,
      totalPages: Math.ceil(totalEmployees / limit),
      currentPage: parseInt(page),
      employees,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Error fetching employees", error });
  }
});

// Get a single employee by ID
app.get("/api/employees/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ message: "Error fetching employee", error });
  }
});

// Update an employee by ID
app.put("/api/employees/:id", upload.single("image"), async (req, res) => {
  try {
    const { title, name, designation, dob, address } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updatedData = {
      title,
      name,
      designation,
      dob,
      address,
      ...(image && { image }), // Update image only if provided
    };

    const updatedEmployee = await Employee.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json(updatedEmployee);
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ message: "Error updating employee", error });
  }
});

// Delete an employee by ID
app.delete("/api/employees/:id", async (req, res) => {
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);
    if (!deletedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Error deleting employee", error });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
