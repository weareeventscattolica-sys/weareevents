require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");

const app = express();

app.use(express.json());
app.use(express.static("public"));


const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const db = new sqlite3.Database("database.sqlite");

db.run(`
CREATE TABLE IF NOT EXISTS messages (
id INTEGER PRIMARY KEY AUTOINCREMENT,
phone TEXT,
message TEXT,
type TEXT
)
`);



/*
 VERIFICA META
*/

app.get("/webhook",(req,res)=>{

const mode=req.query["hub.mode"];
const token=req.query["hub.verify_token"];
const challenge=req.query["hub.challenge"];


if(mode==="subscribe" && token===VERIFY_TOKEN){
return res.status(200).send(challenge);
}

res.sendStatus(403);

});



/*
 RICEZIONE MESSAGGI
*/

app.post("/webhook",(req,res)=>{


try{

const msg=
req.body.entry?.[0]
?.changes?.[0]
?.value
?.messages?.[0];


if(msg){

const phone=msg.from;
const text=msg.text?.body || "";

db.run(
"INSERT INTO messages(phone,message,type) VALUES(?,?,?)",
[
phone,
text,
"received"
]
);

console.log("Messaggio:",phone,text);

}


}catch(e){

console.log(e);

}


res.sendStatus(200);

});





/*
 MOSTRA CHAT
*/

app.get("/messages",(req,res)=>{


db.all(
"SELECT * FROM messages ORDER BY id DESC",
[],
(err,rows)=>{

res.json(rows);

});


});





/*
 INVIA RISPOSTA
*/


app.post("/send",async(req,res)=>{


const {phone,text}=req.body;


try{


await axios.post(

`https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`,

{
messaging_product:"whatsapp",
to:phone,
type:"text",
text:{
body:text
}
},

{
headers:{
Authorization:`Bearer ${process.env.WHATSAPP_TOKEN}`,
"Content-Type":"application/json"
}
}

);


db.run(
"INSERT INTO messages(phone,message,type) VALUES(?,?,?)",
[
phone,
text,
"sent"
]
);


res.json({
success:true
});


}catch(e){

console.log(e.response?.data || e);

res.status(500).json(e.response?.data);

}


});




app.listen(process.env.PORT || 3000,()=>{
console.log("Server WhatsApp attivo");
});
