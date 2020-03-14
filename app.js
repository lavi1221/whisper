//jshint esversion:6
require('dotenv').config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose=require("mongoose");
const session =require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy=require('passport-google-oauth20').Strategy;
const findOrCreate=require('mongoose-findorcreate');
const date =require("date-and-time");

const app=express();

 var scrt=[]
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
  secret:"dark secret.",
  resave:false,
  saveUninitialized:false
}));
console.log("Starting....");
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://whisper-n.herokuapp.com/auth/google/whisper",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

mongoose.connect("mongodb+srv://admin-lav123:test123@cluster0-bovfd.mongodb.net/userDB",{useUnifiedTopology: true,useNewUrlParser: true});
mongoose.set("useCreateIndex",true);
const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  whisper:[{
    heading:String,
    content:String,
    date: String
  }]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User= new mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

app.get("/",function(req,res){
  res.render("home");
});

app.get("/auth/google",passport.authenticate("google",{ scope: ['profile']})
);

app.get('/auth/google/whisper',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/whisper');
  });

app.get("/login",function(req,res){
  res.render("login");
});
app.get("/whisper",function(req,res){
  if(req.isAuthenticated()){
    res.render("whisper",{
      whispers: scrt,
     });
  }else{
    res.redirect("/login");
  }
});

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});

app.post("/submit",function(req,res){
  var head=req.body.heading;
  const submittedText=req.body.whisper;
  const now = new Date();
  const today=date.format(now, ' hh:mm A ddd, MMM DD');

  var obj={
    heading:head,
    content:submittedText,
    date:today
  };
  scrt = [obj].concat(scrt);
  User.findById(req.user.id,function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.whisper.push(obj);
        foundUser.save(function(){
          res.redirect("/whisper");
        });
      }
    }
  });
});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});
app.get("/register",function(req,res){
  res.render("register");
});

app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/whisper");
      });
    }
  });

});

app.post("/login",function(req,res){
  const user=new User({
    username:req.body.username,
    password:req.body.password
  });
 
  req.login(user,function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/whisper");
      });
    }
  });
});
let port=process.env.PORT;
if( port == null || port=="" ){
  port=3000;
}
app.listen(port,function(){
  console.log("SERVER has Started");
})
