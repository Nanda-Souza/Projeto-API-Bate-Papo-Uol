import express from "express";
import cors from "cors"
import { MongoClient, ObjectId } from "mongodb";
import dotenv from 'dotenv'
dotenv.config();


//Setting the database connection string based on the environment variables from .env(dotenv)
const mongoClient = new MongoClient(process.env.DATABASE_URL)
let db;

try{
  await mongoClient.connect()
  db = mongoClient.db()
  console.log("Database connected successfully!") 
} catch (error) {
  console.log("Database connection error!")
}

const server = express()

server.use(cors())
server.use(express.json());

const PORT = 5000

server.listen(PORT, () => console.log(`Server is up on port ${PORT}!!!`))