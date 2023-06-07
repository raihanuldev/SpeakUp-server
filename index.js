const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;



console.log(process.env.DB_USER);
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

    const couresCollection = client.db('Language').collection('CouresCollection');

    // coures APis
    app.get('/coures',async(req,res)=>{
        const result = await couresCollection.find().toArray();
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




app.get('/',(req,res)=>{
    res.send('Assalamualikom.Server Is Running')
})

app.listen(port,()=>{
    console.log('Hey Dev! No pain no gain');
})