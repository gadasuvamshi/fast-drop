// contains login information for mysql db that I don't want on github
// committing this for instruction purposes 
// (i.e. if someone clones, they need this file in this structure)
// but will be changing the sensitive information after commit and untracking the file.

var mysql = require('mysql');
var session = require('express-session');

module.exports = {
	db: mysql.createConnection({
		host     : 'localhost',
		user     : 'root',
		password : 'password',
		database : 'deliveryapp'
	}),
	session: session({
		secret: 'secret',
		resave: false,
		saveUninitialized: true,
		cookie: { secure: false } // change this once i get HTTPS running
	})
}
