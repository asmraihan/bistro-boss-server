const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
// creating a middleware
const verifyJWT = (req, res, next)=>{
  const authorization = req.headers.authorization /* checking for authorization */
  if(!authorization){
    return res.status(401).send({error: true, message: 'Unauthorized access'})
  }
  /* if token available bearer token */
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){
      return res.status(401).send({error: true, message: 'Unauthorized access/invalid token'})
    }
    req.decoded = decoded
    next()
  })

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mznotex.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const usersCollection = client.db("bistroDB").collection("users");
    const menuCollection = client.db("bistroDB").collection("menu");
    const reviewCollection = client.db("bistroDB").collection("reviews");
    const cartCollection = client.db("bistroDB").collection("carts");

    // jwt
    app.post('/jwt', (req,res)=>{
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res.send({token})
    }) 
 

    // user collection apis
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result);
    })


    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query)
    
      if(existingUser){
        return res.send({message: 'User already exists'})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
         role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // menu apis
    app.get('/menu', async (req, res) => {
        const result = await menuCollection.find().toArray();
        res.send(result);
    })
    // review apis
    app.get('/reviews', async (req, res) => {
        const result = await reviewCollection.find().toArray();
        res.send(result);
    })

    // cart collection apis
    app.get('/carts',verifyJWT, async (req, res) => {
      const email = req.query.email;
      console.log(email)
      if(!email){
        res.send([])
      }
      //so that ram sum cant see other users cart 
      const decodedEmail = req.decoded.email
      if(email !== decodedEmail){
        return res.status(403).send({error: true, message: 'Forbidden access'})
      }

      const query = {email: email};
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Bistro boss!')
})

app.listen(port, () => {
    console.log(`Bistro Server is running on port: ${port}`);}       
)

/* naming convention */
/* 
  users => userCollection
  app.get('/users')
  app.get('/users/:id')
  app.post('/users')
  app.patch('/users/:id')
  app.put('/users/:id')
  app.delete('/users/:id')
*/