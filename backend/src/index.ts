// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import cors from "cors";


const app = express();

app.use(
    cors({
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    })
)

const PORT = process.env.PORT || 3005;

app.all("/api/auth/*splat", toNodeHandler(auth))

app.use(express.json())

app.get("/health", (req, res) => {
    res.send("yes healthy!")
})

app.get("/device", async (req, res) => {
  const { user_code } = req.query; // Fixed: should be req.query, not req.params
  res.redirect(`http://localhost:3000/device?user_code=${user_code}`);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});