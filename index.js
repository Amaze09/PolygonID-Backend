const express = require('express');
const {auth, resolver, loaders} = require('@iden3/js-iden3-auth')
const getRawBody = require('raw-body')
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const SEND_INTERVAL = 1000;
const app = express();
app.use(express.json());
app.use(cors()); 
const port = 8080;
let counter = 1;

const writeEvent = (res) => {
    res.write('Status : Done');
  };
  
  const sendEvent = (res) => {
    res.writeHead(200, {
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    });
  
    setInterval(() => {
      writeEvent(res);
    }, SEND_INTERVAL);
  
    writeEvent(res);
  };

app.get("api/event", (req, res) => {
    if (req.headers.accept === 'text/event-stream') {
        sendEvent(res);
    } else {
        res.json({ message: 'Ok' });
    }
});

app.get("/api/sign-in", (req, res) => {
    console.log('get Auth Request');
    GetAuthRequest(req,res);
});

app.post("/api/callback", (req, res) => {
    console.log('callback');
    Callback(req,res);
});

app.listen(port, () => {
    console.log('server running on port 8080');
});

// Create a map to store the auth requests and their session IDs
const requestMap = new Map();

		// GetQR returns auth request
		async function GetAuthRequest(req,res) {

			// Audience is verifier id
			const hostUrl = "https://polygonid.onrender.com";
			const sessionId = uuidv4();
			const callbackURL = "/api/callback"
			const audience = "113J1L2koQMHB2dzFqFw5Q252rykoikBnrjHFqRUQG"

			const uri = `${hostUrl}${callbackURL}?sessionId=${sessionId}`;

			// Generate request for basic authentication
			const request = auth.createAuthorizationRequestWithMessage(
				'test flow',
				'message to sign',
				audience,
				uri,
			);
			
            request.id = '29593465-c364-4522-8aa3-983756603c25';
			request.thid = '29593465-c364-4522-8aa3-983756603c25';

			// Store auth request in map associated with session ID
			requestMap.set(`${sessionId}`, request);

			return res.status(200).set('Content-Type', 'application/json').send(request);
        }

        // Callback verifies the proof after sign-in callbacks
		async function Callback(req,res) {

			// Get session ID from request
			const sessionId = req.query.sessionId;

			// get JWZ token params from the post request
			const raw = await getRawBody(req);
			const tokenStr = raw.toString().trim();

			// fetch authRequest from sessionID
			const authRequest = requestMap.get(`${sessionId}`);
				
			// Locate the directory that contains circuit's verification keys
			const verificationKeyloader = new loaders.FSKeyLoader('../keys');
			const sLoader = new loaders.UniversalSchemaLoader('ipfs.io');

			// Add Polygon Mumbai RPC node endpoint - needed to read on-chain state and identity state contract address
			const ethStateResolver = new resolver.EthStateResolver('https://polygon-mumbai.g.alchemy.com/v2/4ycxpaOEO-xfTQTgl0PV7IEqBDOt988y', '0x46Fd04eEa588a3EA7e9F055dd691C688c4148ab3');

			// EXECUTE VERIFICATION
			const verifier = new auth.Verifier(
			verificationKeyloader,
			sLoader, ethStateResolver,
		);


		try {
			authResponse = await verifier.fullVerify(tokenStr, authRequest);
		} catch (error) {
		return res.status(500).send(error);
		}
        counter++;
		return res.status(200).set('Content-Type', 'application/json').send("user with ID: " + authResponse.from + " Succesfully authenticated");
		}