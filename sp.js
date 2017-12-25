const fs = require('fs');
const saml = require('samlify');
const morgan = require('morgan');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const PORT = 3001;

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));

// Configure your endpoint for IdP-initiated / SP-initiated SSO
const sp = saml.ServiceProvider({
  privateKey: fs.readFileSync('./keys/sp-private-key.pem'),
  privateKeyPass: '',
  requestSignatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512',
  metadata: fs.readFileSync('./metadata/metadata_sp.xml')
});
const idp = saml.IdentityProvider({
  metadata: fs.readFileSync('./metadata/samlpoc-metadata.xml')
});

// Release the metadata publicly
app.get('/saml/metadata', (req, res) => {
  res.header('Content-Type', 'text/xml').send(sp.getMetadata());
});

// If your application only supports IdP-initiated SSO, just make this route is enough
// This is the assertion service url where SAML Response is sent to
app.post('/saml/acs', (req, res) => {
  sp
    .parseLoginResponse(idp, 'post', req)
    .then(parseResult => {
      console.log('parsed', parseResult);
      
      res.send('Parsed OK');
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Error');
    });
});

app.get('/', (req, res) => {
  const url = sp.createLoginRequest(idp, 'redirect');
  console.log('url', url.context);

  res.send(`
    <h1>Hello from SP!</h1>
    <a href="${url.context}">Login with Auth0</a>
  `);
  // });
});

app.listen(PORT, () => console.log(`Service Provider listening on port ${PORT}!`));
