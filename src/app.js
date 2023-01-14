import express from "express";
import cors from "cors"
import { MongoClient, ObjectId } from "mongodb";
import dotenv from 'dotenv'
import joi from 'joi'
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



server.post('/participants', async (req, res) => {
    const { name } = req.body;

    //JOI validation schema so {name} variable can be required and of String type
    const participantSchema = joi.object({
        name: joi.string().required()
    })

    //Execute the JOI validation, if it fails will return an error on validateParticipant
    const validateParticipant = participantSchema.validate({name}, { abortEarly: true })
    console.log(validateParticipant)
    //If theres and error 422 error is early returned
    if (validateParticipant.error) {
        return res.sendStatus(422)
      }

    
    return res.status(200).send("Post Validation is working!")
    
  });


const PORT = 5000

server.listen(PORT, () => console.log(`Server is up on port ${PORT}!!!`))