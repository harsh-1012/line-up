//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const fileUpload = require('express-fileupload');
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
const {google} = require("calendar-link");

const app = express();
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(fileUpload({
    limits: {
        fileSize: 50000000, // Around 10MB
    },
    tempFileDir: "tmp",
    useTempFiles: true,
    abortOnLimit: true
}));

app.use(session({
    secret:""+process.env.sessionPass,
    resave:false,
    saveUninitialized:true
}));
app.use(passport.initialize());
app.use(passport.session());

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_NAME,
    api_key:process.env.API_KEY,
    api_secret:process.env.API_SECRET
});


mongoose.connect("mongodb+srv://admin-harsh:"+process.env.mongoPass,{
    useNewUrlParser:true
});

// mongoose.connect("mongodb://0.0.0.0:27017/todolistDB");

const itemsSchema = new mongoose.Schema({
    userid:String,
    name : String
});


const listSchema = new mongoose.Schema({
    userid : String,
    name : String,
    items : [itemsSchema]
});

const musicSchema = new mongoose.Schema({
    name : String,
    cloudinary_image_id:String,
    cloudinary_video_id:String
});
musicSchema.index({name:"text"});

const userSchema = new mongoose.Schema({
    username:String,
    password:String
});

userSchema.plugin(findOrCreate);
userSchema.plugin(passportLocalMongoose);

const Item = mongoose.model("Item", itemsSchema);
const List = mongoose.model("List",listSchema);
const Music = mongoose.model("Music",musicSchema);
const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user,done){
    done(null,user.id);
});
passport.deserializeUser(function(id,done){
    User.findById(id)
        .then(function(user){
            done(null,user);
        })
        .catch(function(err){
            done(err);
        });
});

app.get("/login",function(req,res){
    res.render("login");
});
app.get("/register",function(req,res){
    res.render("register");
});

app.get("/logout",function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect("/");
        }
    });
});

app.get("/calendar/:taskName",function(req,res){
    const task = req.params.taskName;
    const date = new Date();
    const event = {
        title: task,
        start: date
    }
    res.redirect(google(event));
});

app.get("/",function(req,res){
    res.render("firstpage");
});

app.get("/main",function(req,res){

    if(req.isAuthenticated()){
        Item.find({userid:String(req.user._id)})
        .then(function(data){
            List.find({userid:String(req.user._id)})
                .then(function(lists){
                    res.render("list", {listTitle : "Today" , newListItems : data,listnames:lists});
                });
        });
    }
    else{
        res.redirect("/login");
    }
});

app.get("/delete/:customeListName",function(req,res){

    if(req.isAuthenticated()){
        List.findOneAndDelete({name:req.params.customeListName})
            .then(function(data){
                console.log(data);
            });
        res.redirect("/main");
    }
    else{
        res.redirect("/login");
    }
});

//dynamic url handler
//acces the url using "Express Route Parameters"
app.get("/:customeListName",function(req,res){
    const customeListName = req.params.customeListName;

    if(req.isAuthenticated()){
        List.findOne({name:customeListName,userid:String(req.user._id)})
            .then(function(result){
                //already exists print the result
                if(result===null)
                    res.redirect("/main");
                else{
                    List.find({userid:String(req.user._id)})
                        .then(function(lists){
                            res.render("list",{listTitle:result.name,newListItems:result.items,listnames:lists});
                        });
                }
            })
            .catch(function(err){
                console.log(err);
            });
    }
    else{
        res.redirect("/login");
    }
});

app.get("/entertainment/ent",function(req,res){
    res.render("ent");
});

//music gets
app.get("/m/music",function(req,res){
    Music.find({})
        .then(function(musicList){
            res.render("home",{list:musicList});
        })
        .catch(function(err){
            console.log(err);
        });
});

app.get("/m/music/post",function(req,res){
    res.render("posts");
}); 


app.get("/m/music/delete/:musicID",function(req,res){
    Music.findOneAndDelete({_id:req.params.musicID})
        .then(function(list){
            cloudinary.uploader.destroy(list.cloudinary_image_id,function(err,result){
                if(err) console.log(err);
                else console.log(result);
            });
            cloudinary.uploader.destroy(list.cloudinary_video_id,{resource_type:"video"},function(err,result){
                if(err) console.log(err);
                else console.log(result);
            });
        });
    res.redirect("/m/music");
});

//passport login
app.post("/register",function(req,res){
    const user = new User({
        username:req.body.username
    });
    User.register(user,req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/login");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/main");
            });
        }
    });
});

app.post("/login",function(req,res){
    const user = new User({
        username : req.body.username,
        password : req.body.password
    });
    req.login(user,function(err){
        if(err){
            console.log(err);
            res.redirect("/login");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/main");
            });
        }
    });
});



app.post("/add",function(req,res){
    const coustomListName = _.capitalize(req.body.newlist);
    //two cases can be there either name can exits or not
    //if name exists
    List.findOne({name:coustomListName,userid:String(req.user._id)})
        .then(function(lists){ 
            if(lists != null){      //means already exist so dont add just redirect
                res.redirect("/"+coustomListName);
            }
            else{  //first add this list name into List model then redirect
                const list = new List({
                    userid:String(req.user._id),
                    name:coustomListName,
                    items:[]
                });
                list.save();
                res.redirect("/"+coustomListName);
            }
        });
});

app.post("/search",function(req,res){
    const customListName = _.capitalize(req.body.searchinput);

    List.find({name:customListName,userid:String(req.user._id)})
        .then(function(lists){
            console.log(lists);
            Item.find({userid:String(req.user._id)})
                .then(function(data){
                    res.render("list",{listTitle:"Today",newListItems:data,listnames:lists});
                });
        });
});

app.post("/",function(req,res){
    const itemName = req.body.newItem;
    const listName = req.body.list;

    const item = new Item({     // new document 
        userid:String(req.user._id),
        name : itemName
    });

    if(listName == "Today"){
        item.save();
        res.redirect("/main");
    }else{
        //new document insert into lists collection
        List.findOne({name:listName,userid:String(req.user._id)})
            .then(function(foundlist){
                foundlist.items.push(item);
                foundlist.save();
                res.redirect("/"+listName);
            });
    }
});

app.post("/delete",function(req,res){
    const checkItemId = req.body.checkbox;
    const listName = req.body.listName;

    if(listName == "Today"){
        Item.findByIdAndRemove(checkItemId)
        .then(function() {
            console.log("deleted");
        });
        res.redirect("/main");
    }else{
        List.findOneAndUpdate({name:listName,userid:String(req.user._id)},{$pull:{items:{_id:checkItemId}}})
            .then(function(result){
                res.redirect("/"+listName);
            });
    }
});

//music posts
app.post("/m/music/compose",function(req,res){
    const {image,video} = req.files;
    console.log(image);
    console.log(video);

    image.mv(__dirname + "/tmp/" + image.name);
    video.mv(__dirname + "/tmp/" + video.name);
    
    cloudinary.uploader.upload(__dirname+"/tmp/"+video.name,{resource_type:"video"},function(err,resultaud){

        cloudinary.uploader.upload(__dirname+"/tmp/"+image.name,function(err,resultimg){
            const music = new Music({
                name : req.body.name,
                cloudinary_image_id:resultimg.public_id,
                cloudinary_video_id:resultaud.public_id
            });
            music.save();
        });
    }); 
    res.redirect("/m/music");
});

app.post("/m/music/search",function(req,res){
    const searchInput = req.body.searchinput;

    Music.find({$text:{$search: searchInput}},{score:{ $meta: "textScore" }}).sort( { score: { $meta: "textScore" } } )
        .then(function(musicList){
                    res.render("search",{list:musicList});
        })
        .catch(function(err){
            console.log(err);
        });
});


let port = process.env.PORT;
if(port == null || port =="")
    port = 3000;

app.listen(port,function(){
    console.log("Server started on port 3000");
});



