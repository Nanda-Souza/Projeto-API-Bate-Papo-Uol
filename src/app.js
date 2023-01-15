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

//Participants Methods
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
    
    //If theres any error a 422 error is early returned
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

//Messages Methods
server.post('/messages', async (req, res) => {
    const { to, text, type } = req.body;
    //Get the user value from the header and save in a from variable
    const from = req.headers.user
    
    //JOI validation schema so {to, text, type} variables can be checked
    const messageSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid("message", "private_message").required()
    })

    //Execute the JOI validation, if it fails will return an error on validateMessage
    const validateMessage = messageSchema.validate({to, text, type}, { abortEarly: true })
    
    //Check if the user exists in the participants colllection
    const validateFrom = await db.collection('participants').findOne({name: from})
    
    
    //If theres any error or the user does not exist on the participants collection a 422 error is early returned
    if (validateMessage.error || !validateFrom) {
        return res.sendStatus(422)
    }

    try {
        //Await for the above validations to be concluded so it can insert the new user under messages collection
        await db.collection("messages").insertOne({
            from,
            to,
            text,
            type,
            time: dayjs().format("HH:mm:ss")
        });
        res.sendStatus(201);
        } catch (error) {
            console.error(error);
            res.sendStatus(500);
        }

  });

  server.get("/messages", (req, res) => {
    const user = req.headers.user
    //query string in express "?limit=1"
    const limit = req.query.limit
  
    if (limit && (isNaN(parseInt(limit)) || limit < 1) )
        return res.status(422).send("Informe uma página válida!")
    
    db.collection("messages").find({
        $or: [
            { from: user },
            { $or: [ { to: user }, { to:"Todos" }]}
        ]
    }).toArray().then(filteredMessages => {
      return res.status(200).send(filteredMessages?.slice(-parseInt(limit)).reverse())
    }).catch(() => {
      res.status(500).send("Failed to get messages!")
    })

  })

  //Status Method

  server.post('/status', async (req, res) => {
    const user = req.headers.user

    //Try catch block 
      try {
    //Check if the user exists in the database
        const loggedParticipant = await db.collection('participants').findOne({ name:user })
        //If the username is NOT found on the database return a 404 error
        if (!loggedParticipant)
            return res.status(404).send("User not found!")
        
        //Await for the above validations to be concluded so it can update the participant lastStatus
        await db.collection('participants').updateOne( 
            { name: user}, 
            { $set: {lastStatus: Date.now() } } 
        )
        
        res.sendStatus(200);
      } catch (error) {
        console.error(error);
        res.sendStatus(500);
      }
  });

async function removeInactive() {
    //10 seconds prior now
    const time = Date.now() - 10000;
    
    try {
        const disconnect = await db.collection('participants').find({ 
            lastStatus: { 
                $lt: time 
            } 
        }).toArray()
            
        disconnect.map(async (p) => {
            
            await db.collection("messages").insertOne({
                from: p.name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: dayjs().format("HH:mm:ss")
            });
        })
        await db.collection("participants").deleteMany({ 
            lastStatus: { 
                $lt: time 
            } 
        });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }

}

setInterval(removeInactive, 15000)
  
const PORT = 5000

server.listen(PORT, () => console.log(`Server is up on port ${PORT}!!!`))