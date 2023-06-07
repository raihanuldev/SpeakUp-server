const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;


app.get('/',(req,res)=>{
    res.send('Assalamualikom.Server Is Running')
})

app.listen(port,()=>{
    console.log('Hey Dev! No pain no gain');
})