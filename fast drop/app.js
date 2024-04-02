// server file 170110
// drew mcarthur
// delivery service

// requirements
var fs = require('fs');
var express = require('express');
var app = express();
var session = require('express-session');
var http = require('http').Server(app);
var mysql = require('mysql');
var bcrypt = require('bcrypt');
var bodyParser = require('body-parser');
var util = require('util');
var config = require('./config');
var db = config.db; // the database object

app.use(config.session);

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

// middleware
var authUser = function(req, res, next) {
	// anywhere they try to go, if they aren't logged in,
	if (!req.url.match(/\/[(login)(signup)(info)].*/) && !req.session.user_id) {
		logger('User not logged in, redirecting from ' + req.url + ' to /login.');
		res.locals.loggedIn = function() { return false; }
		// send them to the login page
		return res.redirect('/login');
	} else {
		res.locals.loggedIn = function() { return true; }
		return next();
	}
}
app.use(authUser);

app.set('views', __dirname + "/public");
app.set('view engine', 'pug');

//this hosts the files located in the ./public directory
app.use(express.static(__dirname + '/public'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/style', express.static(__dirname + '/node_modules/bootstrap/dist/css'));

// variables
const saltRounds = 5;

// communications for user signup
app.post('/signup', function(req, res){
	var data = req.body;
	bcrypt.hash(data.password, saltRounds, function(err, hash) {
		if (err) {
			logger("Error hashing password: " + err); 
			res.status(500).send(err);
		} else {
			data.password = hash;

			// sql query to add user with [data] to user table
			var signupquery = "INSERT INTO user(email, password, name, phone, room) VALUES (";
			for (var i in data) {
				signupquery += mysql.escape(data[i]);
				signupquery += (i == 'room' ? ");" : ", ");
			}

			logger("Adding new user to database with query: ");
			logger("	" + signupquery);
			// add user to user table with [data]
			db.query(signupquery, function(err, rows) {
				if (!err) {
					// set user_id
					req.session.user_id = rows.insertId;
					logger("Signup Success: ");
					logger(rows.insertId);
					res.end('success');
				} else {
					// if there was an error signing the user up, forward the error to the client
					logger("Signup Error: Database Error: " + err);
					res.status(500).send(err);
				}
			});
		}
	});
});

app.post('/login', function(req, res){
	var email = req.body.email;
	var pass = req.body.password;
	// get hashed password from database
	var q = "SELECT id,password FROM user WHERE email=" + mysql.escape(email) + ";";
	logger("Searching for user email with query:");
	logger("    " + q);
	db.query(q, function(err, rows){
		if (err) {
			logger("Login Error: ");
			logger("    " + err);
			res.status(500).send(err);
		} else if (rows.length == 0) {
			// no email exists
			logger("Login Error: Invalid Email");
			res.end('error');
		} else { 
			var hash = rows[0].password;
			var id = rows[0].id;
			// check if thats the right password
			bcrypt.compare(pass, hash, function(err, success){
				if (err) {
					logger("Login Error: ");
					logger("    " + err);
					res.status(500).send(err);
				} else if (success) {
					logger("User " + id + (success ? " logged in." : " failed logging in."));
					req.session.user_id = success ? id : null;
					res.redirect('/');
				} else {
					logger("Login Error: Incorrect Password");
					res.end('error');
				}
			});
		}
	});
});

app.post('/signup/findemail', function(req, res) {
	var email = req.body.email;
	var q = "SELECT id FROM user WHERE email=" + mysql.escape(email) + ";";
	logger("Searching for user email with query:");
	logger("    " + q);
	db.query(q, function(err, rows) {
		if (err) {
			logger("Database Error (:136): " + err);
			res.send(err);
		} else if (rows.length > 0){
			res.end('found');
		} else {
			res.end('notfound');
		} 
	});
});

app.get('/logout', function(req, res) {
	logger("User " + req.session.user_id + " logged out.");
	req.session.user_id = null;
	res.redirect('/');
});

app.get('/home', function(req, res) {
		res.render('index');
});
app.get('/', function(req, res) {
	res.redirect('/home');
});

app.get(/\/[(login)(info)]/, function(req, res) {
	var uri = req.url.substr(1);
	if (uri.match(/.*\//))
		uri = uri.substr(0, uri.length -1);
	res.render(uri, {title: uri});
});

//listen for requests at localhost:80
http.listen(80, function(){ 
    //callback function, completely optional.   
    logger("Server is running on port 80");      
});

// handles when i stop server by CTRL-C
process.on('SIGINT', function(){
	logger( "\nGracefully shutting down." );
	db.end();
	process.exit();
});

// functions
function logger(message){ //log to the console and a hard file
	console.log(message);
	fs.appendFile(
		__dirname + "/messages.log", 
		new Date().toUTCString() + "	" + util.inspect(message) + "\n", 
		function(err){ 
			if(err) { console.log(err); } 
		}
	);
}
