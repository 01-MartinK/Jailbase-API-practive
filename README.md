# Jailbase-API-practice

The API for getting and setting data related to the criminal database.

# Installation
Git clone this repo to your desired location https://github.com/TheDeadGamer101/Jailbase-API-practive. You will need `node` and `npm` installed on your machine.

Open terminal at the server directory. Use the command `npm install` to get all the neccesary packages.

# HTTPS SSL certificate generation

## Creating an SSL Certificate

To configure an SSL certificate, you can either use a public, trusted certificate or a self-signed certificate.

If you’re running the application in a production environment, always be sure to acquire and install a trusted certificate, not a self-signed certificate!

## Creating self-signed certificate (for testing)

First, generate a key file used for self-signed certificate generation with the command below. The command will create a private key as a file called key.pem.
```
openssl genrsa -out key.pem
```

2. Next, generate a certificate service request (CSR) with the command below. You’ll need a CSR to provide all of the input necessary to create the actual certificate.
```
openssl req -new -key key.pem -out csr.pem
```

3. Finally, generate your certificate by providing the private key created to sign it with the public key created in step two with an expiry date of 9,999 days. This command below will create a certificate called cert.pem.
```
openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
```

4. Visit [https://localhost:6661](https://localhost:6661) and make your web browser trust your self-signed certificate by clicking advanced and then clicking the link to continue to the website.

# Running
After the installation of the packages run `node index.js` at the server directory.

API-is running after that.

Now just open the index.html file at the client directory.
