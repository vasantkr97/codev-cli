import express from "express";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import cors from "cors";
dotenv.config();


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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});