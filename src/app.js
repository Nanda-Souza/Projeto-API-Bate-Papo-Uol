import express from "express";
import cors from "cors"
import { MongoClient, ObjectId } from "mongodb";
import dotenv from 'dotenv'
import joi from 'joi'
import dayjs from "dayjs"
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

//Function to get the participant list from the database
server.get("/participants", (req, res) => {
    db.collection("participants").find().toArray().then(allParticipants => {
      return res.status(200).send(allParticipants)
    }).catch(() => {
      res.status(500).send("Failed to get participants")
    })
  })

//Asynch is needed so we can use await on the db call functions
server.post('/participants', async (req, res) => {
    const { name } = req.body;

    //JOI validation schema so {name} variable can be required and of String type
    const participantSchema = joi.object({
        name: joi.string().required()
    })

    //Execute the JOI validation, if it fails will return an error on validateParticipant
    const validateParticipant = participantSchema.validate({name}, { abortEarly: true })
    
    //If theres and error 422 error is early returned
    if (validateParticipant.error) {
        return res.sendStatus(422)
      }
    //Try catch block 
      try {
    //Check if the choosen name is already in use by searching in the database
        const loggedParticipant = await db.collection('participants').findOne({name})
        //If the username is found on the database return a 409 error
        if (loggedParticipant)
            return res.status(409).send("Name already in use!")
        
        //Await for the above validations to be concluded so it can insert the new user under participants collection
        await db.collection('participants').insertOne({ 
            name, 
            lastStatus: Date.now() 
        })
        //Await for the above validations to be concluded so it can insert the new user under messages collection
        await db.collection("messages").insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format("HH:mm:ss")
        });
        res.sendStatus(201);
      } catch (error) {
        console.error(error);
        res.sendStatus(500);
      }
  });


const PORT = 5000

server.listen(PORT, () => console.log(`Server is up on port ${PORT}!!!`))