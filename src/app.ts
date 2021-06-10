import Realtime from 'realtime';
import express from 'express';
import { config } from 'dotenv';
import bodyParser from "body-parser";
import _ from 'lodash';

const env = config();
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
   extended: true,
}));

let adminUser = 'realtime_admin';

app.locals.realtimeUsers = {

};

async function publishSampleMessage() {
   console.log(
       "Since we're publishing on subscribe connectEvent, we're sure we'll receive the following publish."
   );
   const result = await app.locals.realtimeUsers[adminUser].sendMessage({
      channel: "realtime-test-app-2",
      message: {
         title: "greeting",
         description: "hello world!",
      },
   });
   console.log(result);
}

app.locals.realtimeUsers[adminUser] = Realtime({
   uuid: adminUser,
   provider: 'pubnub',
   subscribeKey: env.parsed.SUBSCRIBE_KEY,
   publishKey: env.parsed.PUBLISH_KEY,
});

app.locals.realtimeUsers[adminUser].on('status', async (e) => {
   console.log(`admin = statusEvent: ${JSON.stringify(e)}`);
   if(e.category === "PNConnectedCategory"){
      console.log(`admin = category: ${e.category}`);
      await publishSampleMessage();
   }
});

app.locals.realtimeUsers[adminUser].on('join', (presence) => {
   console.log(`admin = join presenceEvent: ${JSON.stringify(presence)}`);
});

app.locals.realtimeUsers[adminUser].on('timeout', (presence) => {
   console.log(`admin = timeout presenceEvent: ${JSON.stringify(presence)}`);
});

app.locals.realtimeUsers[adminUser].on('leave', (presence) => {
   console.log(`admin = leave presenceEvent: ${JSON.stringify(presence)}`);
});

app.locals.realtimeUsers[adminUser].on('message', (message) => {
   console.log(`admin = messageEvent: ${JSON.stringify(message)}`);
});

console.log("Subscribing..");
app.locals.realtimeUsers[adminUser].join({
   channel: "realtime-test-app-2",
   withPresence: true,
});

console.log(`realtimeUsers: ${JSON.stringify(_.keys(app.locals.realtimeUsers))}`);



app.post('/message', async (req, res, next) => {
   let result;
   if(req.body.user){
      // check realtimeUser
      if(app.locals.realtimeUsers[req.body.user]){
         result = await app.locals.realtimeUsers[req.body.user].sendMessage({ message: req.body.message, channel:req.body.channel });
         console.log(`sent message: ${JSON.stringify(req.body.message)} to ${req.body.channel}, result: ${JSON.stringify(result)}`);
      } else {
         console.log(`user: ${req.body.user}`);
         console.log(`realtimeUsers: ${JSON.stringify(_.keys(app.locals.realtimeUsers))}`);
         result = 'user does not exist'
      }
   }
   res.send(result);
});

app.post('/join', async (req, res, next) => {
   let realtimeUser;
   let status;
   let message;
   let code;
   if(req.body.user) {
      // check realtimeUser
      if (!app.locals.realtimeUsers[req.body.user]) {
         // create new user
         realtimeUser = Realtime({
            uuid: req.body.user,
            provider: 'pubnub',
            subscribeKey: env.parsed.SUBSCRIBE_KEY,
            publishKey: env.parsed.PUBLISH_KEY,
         });
         app.locals.realtimeUsers[req.body.user] = realtimeUser;

         app.locals.realtimeUsers[req.body.user].on('status', (p) => {
            console.log(`statusEvent: ${JSON.stringify(p)}`);
         });

         app.locals.realtimeUsers[req.body.user].on('join', (p) => {
            console.log(`join presenceEvent: ${JSON.stringify(p)}`);
         });

         app.locals.realtimeUsers[req.body.user].on('timeout', (p) => {
            console.log(`timeout presenceEvent: ${JSON.stringify(p)}`);
         });

         app.locals.realtimeUsers[req.body.user].on('message', (m) => {
            console.log(`messageEvent: ${JSON.stringify(m)}`);
         });
      }
      // wait for the status of ready
      await app.locals.realtimeUsers[req.body.user].join({
         channels: [req.body.channel],
         withPresence: true
      });

      message = `${req.body.user} has joined ${req.body.channel}`;
      code = 200;
   } else {
      message = 'user and channel are required';
      code = 400;
   }

   res.send(message).status(code);
});

app.post('/leave', async (req, res, next) => {
   let message = `${req.body.user} has left all channels`;
   let code = 200;
   if(req.body.user && app.locals.realtimeUsers[req.body.user]){
      await app.locals.realtimeUsers[req.body.user].leave();
   } else {
      message = `${req.body.user} not found aborting leave`;
      code = 400;
   }
   res.send(message).status(code);
});

app.post('/here', async (req, res, next) => {
   let message;
   let code = 200;
   if(req.body.user && app.locals.realtimeUsers[req.body.user]){
      message = await app.locals.realtimeUsers[req.body.user].here(req.body.channel);
   } else {
      message = `${req.body.user} not found aborting leave`;
      code = 400;
   }
   res.send(message).status(code);
});

app.listen(PORT, () => {
   console.log(`server running on port: ${PORT}`);
});
