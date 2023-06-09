const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleWare
app.use(cors())
app.use(express.json())

// const uri = "mongodb+srv://<username>:<password>@cluster0.jvqibpv.mongodb.net/?retryWrites=true&w=majority";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jvqibpv.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const couresCollection = client.db('Language').collection('couresCollection');
    const usersCollection = client.db('Language').collection('usersCollection');

    // Public Apis
    // top 6 Coures.
    app.get('/coures', async (req, res) => {
      const result = await couresCollection.find().sort({ enrolled: -1 }).limit(6).toArray();
      res.send(result);
    })

    // top instructor
    app.get('/topinstructor', async (req, res) => {
      const topinstructors = await couresCollection.aggregate([
        {
          $group: {
            _id: '$teacherId',
            totalEnrollments: { $sum: '$enrolled' },
            instructorName: {$push: {instructor: '$instructorName'}},
            instructorImage:{$push: {image: '$instructorImage'}}
          },
        },
        { $sort: { totalEnrollments: -1 } },
        { $limit: 6 }]).toArray();
      
      res.send(topinstructors) 
    })
// all Instructors
    app.get('/instructors', async (req, res) => {
      try {
        const instructors = await couresCollection.aggregate([
          {
            $group: {
              _id: "$instructorEmail",
              instructor: { $first: "$$ROOT" }
            }
          },
          {
            $replaceRoot: { newRoot: "$instructor" }
          }
        ]).toArray();
    
        res.send(instructors);
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });
// All Class
    app.get('/allclasses',async (req,res)=>{
      const apporvedCoures = await couresCollection.find({status:"approved"});
      const result = await apporvedCoures.toArray();
      res.send(result);
    })
  /************************************/  
  
  // Received Data.
  app.post('/users',async(req,res)=>{
    const user = req.body;
    console.log(user)
    const query = {email:user.email};
    const exitingUser =await usersCollection.findOne(query);
    if(exitingUser){
      return res.send({messgae: 'User Alredy exiting on Database'})
    }
    const result= await usersCollection.insertOne(user);
    res.send(result);
  })




    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Assalamualikom.Server Is Running')
})

app.listen(port, () => {
  console.log('Hey Dev! No pain no gain');
})