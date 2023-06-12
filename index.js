const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.DB_PAYMENT_KEY)

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
    const cartCollection = client.db('Language').collection('cartCollection');
    const paymentCollection = client.db('Language').collection('paymentCollection');

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
            instructorName: { $push: { instructor: '$instructorName' } },
            instructorImage: { $push: { image: '$instructorImage' } }
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

    // Payment Releted Apis
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      console.log(payment);
      if (result.insertedId) {
        const cartId = payment.couresId;
        const deleteResult = await cartCollection.deleteOne({ cartId: cartId })

        if (deleteResult.deletedCount === 1) {
          console.log('Item removed from cartCollection');
          const couresId = payment.couresId;
          const updateResult = await couresCollection.updateOne(
            { _id: new ObjectId(couresId) },
            {
              $inc: {
                enrolled: 1,
                availableSeats: -1
              }
            }
          );

          if (updateResult.modifiedCount === 1) {
            console.log('Enrolled count increased in couresCollection');
          } else {
            console.log('Failed to increase enrolled count in couresCollection');
          }
        } else {
          console.log('Item not found in cartCollection');
        }
      }

      res.send(result)

    })

    // Enrolled Classes
    app.get('/enrolled-classes', async (req, res) => {
      const email = req.query.email;
      console.log(email)
      const query = { email: email };

      try {
        const enrolledClasses = await paymentCollection.find(query).toArray();
        console.log(enrolledClasses);

        const enrolledClassIds = enrolledClasses.map(item=> new ObjectId(item.couresId));

        const enrolledClassDetails = await couresCollection.find({_id:{
          $in: enrolledClassIds
        }}).toArray();
        console.log(enrolledClassDetails);
        res.send(enrolledClassDetails)
      }
      catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });


    // All Class
    app.get('/allclasses', async (req, res) => {
      const apporvedCoures = await couresCollection.find({ status: "approved" });
      const result = await apporvedCoures.toArray();
      res.send(result);
    })

    app.post('/newclass', async (req, res) => {
      const item = req.body;
      console.log(item)
      const result = await couresCollection.insertOne(item);
      res.send(result)
    })
    // My Added Classes
    app.get('/my-classes', async(req,res)=>{
      const email = req.query.email;
      console.log(email);
      const query = {instructorEmail:email}
      const result = await couresCollection.find(query).toArray();
      res.send(result)
    })

    // WARNING! IAM CHANGED USERS API>>>>
    // users Apis
    app.get('/user', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      // console.log(query);
      const result = await usersCollection.findOne(query);
      res.send(result)
    })

    // Received Data.
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user)
      const query = { email: user.email };
      const exitingUser = await usersCollection.findOne(query);
      if (exitingUser) {
        return res.send({ messgae: 'User Alredy exiting on Database' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    // All Users 
    app.get('/all-users', async (req,res)=>{
      const result = await usersCollection.find().toArray();
      res.send(result)
    })
    
      // Make admin Role
    app.put('/make-admin/:id', async(req,res)=>{
      const id = req.params.id;
      const _id = new ObjectId(id)
      console.log(_id);
      const result = await usersCollection.findOneAndUpdate(
        { _id: _id},
        { $set: {role: 'admin'} }
        )
      res.send(result)
    })
    

    // Carts apis
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      if (!email) {
        return res.send([])
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    })
    app.post('/carts', async (req, res) => {
      const item = req.body;
      const cartId = { cartId: item.cartId }
      const extingCart = await cartCollection.findOne(cartId);
      if (extingCart) {
        return res.send([])
      }
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })
    // Single Cart Remove
    app.delete('/carts', async (req,res)=>{
      const couresId = req.body;
      const query = couresId;
      const result = await cartCollection.deleteOne(query);
      res.send(result)
    }) 
    


    // Payment Intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // Payment Histroy
    app.get('/payment-history', async(req,res)=>{
      const email = req.query.email;
      // console.log(email);
      const query = {email:email};
      const paymentHistory = await paymentCollection.find(query).sort({date:-1}).toArray();
      res.send(paymentHistory)
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