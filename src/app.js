import express from "express";
import cors from "cors"
import { MongoClient } from "mongodb";
import dotenv from 'dotenv'
const mongoClient = new MongoClient()
dotenv.config();

const server = express()

server.use(cors())
server.use(express.json());

const PORT = 5000

server.listen(PORT, () => console.log(`Server is up on port ${PORT}!!!`))