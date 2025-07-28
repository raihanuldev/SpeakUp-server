const express = require('express');
const app = express();
const { OpenAI } = require('openai');
const SSLCommerzPayment = require('sslcommerz-lts')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.DB_PAYMENT_KEY)
const openai = new OpenAI({ apiKey: process.env.openAI_key | 11111 })

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
// SSL commerce.
const store_id = process.env.ssl_store_id;
const store_passwd = process.env.ssl_store_pass;
const is_live = false;

async function run() {
  try {
    await client.connect();

    const couresCollection = client.db('Language').collection('couresCollection');
    const usersCollection = client.db('Language').collection('usersCollection');
    const cartCollection = client.db('Language').collection('cartCollection');
    const paymentCollection = client.db('Language').collection('paymentCollection');
    const contentCollection = client.db('Language').collection('content-collections');
    const clubMemberCollection = client.db('Language').collection('clubMemberCollection');
    /*
   =>=>=>=>=>Live Chat useing OpenAi Key =>=>=>=>=>=>
   */
    app.post('/chat', async (req, res) => {
      const userQuery = req.body.query;
      // console.log(req.body);
      // console.log(req.body.query);
      // use open Ai  APi to generate a model response
      const modelResponse = await openai.chat.completions.create({
        model: 'text-davinci-003',
        prompt: userQuery,
        max_tokens: 150,
      });

      console.log(modelResponse.choices[0].text.trim());
      res.send({ message: modelResponse.choices[0].text.trim() })
    })

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

    // Ssl-Commarce APi Added
    // to generate UniqueID---Transaction_id
    const tran_id = new ObjectId().toString();
    app.post('/sslPay', async (req, res) => {
      // console.log(req.body);
      const { price, email, name, cartId, _id } = req.body;
      // calculete Price On BDT
      const bdtPrice = 110 * price;
      const data = {
        total_amount: bdtPrice,
        currency: 'BDT',
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: 'abc6557ca5672c76@ssl/success',
        fail_url: 'http://localhost:5000/fail',
        cancel_url: 'http://localhost:5000/cancel',
        ipn_url: 'http://localhost:5000/ipn',
        shipping_method: 'Online Coures',
        product_name: name,
        product_category: "Online Coures",
        product_profile: 'Coures',
        cus_email: email,
        cus_phone: '1234567890',
        product_id: cartId,
        couresId: _id,
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
      };
      console.log(data);
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
      sslcz.init(data).then(apiResponse => {
        console.log(apiResponse);
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL
        res.send({ url: GatewayPageURL })
        console.log('Redirecting to: ', GatewayPageURL)
      });


    })

    // Stripe Payment  Releted Apis... plz igonore for /payments path. cz at frist i added stripe
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

    app.get('/enrolled-classes', async (req, res) => {
      const email = req.query.email;
      console.log('Request email:', email);

      try {
        // Check if email exists in clubMemberCollection
        const isClubMember = await clubMemberCollection.findOne({ email: email });

        let enrolledClassDetails;

        if (isClubMember) {
          // If club member, give access to all courses
          enrolledClassDetails = await couresCollection.find({}).toArray();
        } else {
          // If not a club member, fetch enrolled classes from paymentCollection
          const enrolledClasses = await paymentCollection.find({ email: email }).toArray();

          const enrolledClassIds = enrolledClasses.map(item => new ObjectId(item.couresId));

          enrolledClassDetails = await couresCollection.find({
            _id: { $in: enrolledClassIds }
          }).toArray();
        }

        console.log('Enrolled Classes:', enrolledClassDetails);
        res.send(enrolledClassDetails);

      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });


    // All Approved Class
    app.get('/allclasses', async (req, res) => {
      const apporvedCoures = await couresCollection.find({ status: "approved" });
      const result = await apporvedCoures.toArray();
      res.send(result);
    })
    // All Coures Collections
    app.get('/classCollection', async (req, res) => {
      const result = await couresCollection.find().toArray();
      res.send(result)
    })

    // Update Class Staus Approved
    app.put('/classCollection/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const _id = new ObjectId(id);
      const result = await couresCollection.findOneAndUpdate(
        { _id: _id },
        {
          $set: { status: 'approved' },
          $inc: {
            enrolled: 1,
            availableSeats: -1,
          },
        }

      )
      res.send(result)
    })
    // Send Feedback
    app.put('/feedback/:id', async (req, res) => {
      const _id = new ObjectId(req.params.id);
      const message = req.body;
      console.log(message);
      const result = await couresCollection.findOneAndUpdate(
        { _id: _id },
        { $set: { feedback: message } }
      )
      res.send(result)
    })

    // Update Denied Status
    app.put('/classDenied/:id', async (req, res) => {
      const _id = new ObjectId(req.params.id)
      const result = await couresCollection.findOneAndUpdate(
        { _id: _id },
        { $set: { status: 'denied' } }
      )
      res.send(result)
    })

    app.post('/newclass', async (req, res) => {
      const item = req.body;
      console.log(item)
      const result = await couresCollection.insertOne(item);
      res.send(result)
    })
    // My Added Classes
    app.get('/my-classes', async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = { instructorEmail: email }
      const result = await couresCollection.find(query).toArray();
      res.send(result)
    })
    // Add Module
    app.patch("/content-collections/:courseId", async (req, res) => {
      const courseId = req.params.courseId;
      const newModule = req.body;
      console.log(courseId, newModule);
      try {
        const result = await contentCollection.updateOne(
          { courseId: courseId },
          { $push: { content: newModule } },
          { upsert: true }
        );
        res.send({ success: true, result });
      } catch (err) {
        res.status(500).send({ success: false, message: "Database error", error: err });
      }
    });

    //get content by courseId
    app.get("/content-collections/:courseId", async (req, res) => {
      const courseId = req.params.courseId;
      try {
        const doc = await contentCollection.findOne({ courseId });
        if (!doc) return res.status(404).json({ message: "No content found" });
        res.json(doc);
      } catch (err) {
        res.status(500).json({ error: "Internal server error", err });
      }
    });

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
    app.get('/all-users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })

    // Make admin Role
    app.put('/make-admin/:id', async (req, res) => {
      const id = req.params.id;
      const _id = new ObjectId(id)
      // console.log(_id);
      const result = await usersCollection.findOneAndUpdate(
        { _id: _id },
        { $set: { role: 'admin' } }
      )
      res.send(result)
    })
    // Add a club member if not already exists
    app.post('/add-club-member', async (req, res) => {
      const { email } = req.body;

      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }

      try {
        // Check if already exists
        const existing = await clubMemberCollection.findOne({ email });
        if (existing) {
          return res.status(200).send({ message: "Already a club member" });
        }

        // Insert new member
        const result = await clubMemberCollection.insertOne({
          email,
          role: "member"
        });

        res.status(201).send({ message: "Added to club members", insertedId: result.insertedId });
      } catch (error) {
        console.error("Failed to add club member:", error);
        res.status(500).send({ message: "Server Error" });
      }
    });

    // Make Instrucotr
    app.put('/make-instructor/:id', async (req, res) => {
      const id = req.params.id;
      const _id = new ObjectId(id)
      // console.log(_id);
      const result = await usersCollection.findOneAndUpdate(
        { _id: _id },
        { $set: { role: 'instructor' } }
      )
      res.send(result)
    })


    // Carts apis
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      console.log(email);
      if (!email) {
        return res.send([])
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    })
    app.post('/carts', async (req, res) => {
      const item = req.body;
      const { cartId, email } = item.cartId
      const result = await cartCollection.insertOne(item);
      res.send(result);

      // const extingCart = await cartCollection.findOne({ cartId });
      // if (extingCart && extingCart.cartId === cartId && extingCart.email === email) {
      //   console.log('badija tomak add kora jabe nah tomi beshi jargoy korcho');
      //   return res.send([])
      // }
      // else {

      // }
    })
    // Single Cart Remove
    app.delete('/carts', async (req, res) => {
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
    app.get('/payment-history', async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      const query = { email: email };
      const paymentHistory = await paymentCollection.find(query).sort({ date: -1 }).toArray();
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

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
