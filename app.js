import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { title } from "process";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for all routes
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const dirname = path.dirname( __filename);

// MongoDB connection
const uri = process.env.MONGODB_URI;
mongoose
  .connect(uri)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// MongoDB schema for storing employee data with image as a Buffer (BLOB)
const employeeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  image: {
    type: Buffer, // Store the image as a binary BLOB (Buffer)
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  designation: {
    type: String, // You can adjust this to a Number if needed
    required: true,
  },
  dob: {
    type: Date, // Store the date of birth as Date type
    required: true,
  },
  address: {
    type: String, // Assuming address is a string (change if needed)
    required: true,
  },
  contentType: {
    type: String, // Store the image MIME type, e.g., 'image/png'
    required: true,
  },
 
});

const Employee = mongoose.model("Employee", employeeSchema);

// Multer configuration to store images in memory (as Buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route to handle image upload and store employee data in MongoDB
app.post("/api/employees", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Image file is required." });
  }

  const { title, name, designation, dob, address } = req.body;

  if (!title || !name || !designation || !dob || !address) {
    return res.status(400).json({ message: "All fields are required." });
  }

  // Parse the dob to a Date object
  const parsedDob = new Date(dob);
  if (isNaN(parsedDob)) {
    return res.status(400).json({ message: "Invalid date format." });
  }

  // Create a new employee with image data stored as Buffer (BLOB)
  const newEmployee = new Employee({
    image: req.file.buffer, // Store the image as a Buffer (BLOB)
    title,
    name,
    designation,
    dob: parsedDob, // Store dob as Date
    address,
    contentType: req.file.mimetype || "application/octet-stream", // Default MIME type
  });

  try {
    const savedEmployee = await newEmployee.save();
    res.status(201).json(savedEmployee);
  } catch (error) {
    res.status(400).json({ message: "Error creating Employee", error });
  }
});

// Route to get all employees with image data
app.get("/api/employees", async (req, res) => {
  try {
    const limit = Number(req.query.limit);
    const employees = limit ? await Employee.find().limit(limit) : await Employee.find();
    res.status(200).json(employees);
  } catch (err) {
    res.status(500).json({ message: "Error fetching employees", err });
  }
});

// Route to get an employee by ID with image data
app.get("/api/employees/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Convert image buffer to base64 string for easy client-side rendering
    const base64Image = employee.image.toString("base64");

    res.json({
      ...employee.toObject(),
      image: `data:${employee.contentType};base64,${base64Image}`,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching employee", error });
  }
});

// Route to update an employee by ID (with image update support)
app.put("/api/employees/:id", upload.single("image"), async (req, res) => {
  try {
    const updates = req.body;
    if (req.file) {
      updates.image = req.file.buffer; // Update the image as Buffer (BLOB)
      updates.contentType = req.file.mimetype;
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    if (!updatedEmployee) {
      return res.status(404).json({ message: `Employee with ID ${req.params.id} not found` });
    }

    res.status(200).json(updatedEmployee);
  } catch (error) {
    res.status(500).json({ message: "Error updating Employee", error });
  }
});

// Route to delete an employee by ID
app.delete("/api/employees/:id", async (req, res) => {
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);

    if (!deletedEmployee) {
      return res.status(404).json({ message: `Employee with ID ${req.params.id} not found` });
    }

    res.status(200).json({ message: `Employee with ID ${req.params.id} deleted` });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Employee", error });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});




























