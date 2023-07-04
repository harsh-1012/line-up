//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const app = express();
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.set('view engine', 'ejs');
// const date = require(__dirname + "/date.js");

const mongoose = require("mongoose");

require("dotenv").config();

// mongoose.connect("mongodb+srv://admin-harsh:"+process.env.mongoPass+"@cluster0.xoqf80d.mongodb.net/todolistDB",{
//     useNewUrlParser:true
// });

mongoose.connect("mongodb://0.0.0.0:27017/todolistDB");

const itemsSchema = new mongoose.Schema({
    name : String
});

const Item = mongoose.model("Item", itemsSchema);

const listSchema = new mongoose.Schema({
    name : String,
    items : [itemsSchema]
});

const List = mongoose.model("List",listSchema);

app.get("/",function(req,res){
    // let day = date.getDate();
    Item.find({})
    .then(function(data){
        List.find({})
            .then(function(lists){
                res.render("list", {listTitle : "Today" , newListItems : data,listnames:lists});
            });
    });
});

app.get("/delete/:customeListName",function(req,res){
    List.findOneAndDelete({name:req.params.customeListName})
        .then(function(data){
            console.log(data);
        });
    res.redirect("/");
});

//dynamic url handler
//acces the url using "Express Route Parameters"
app.get("/:customeListName",function(req,res){
    const customeListName = req.params.customeListName;

    List.findOne({name:customeListName})
        .then(function(result){
            //already exists print the result
            List.find({})
                .then(function(lists){
                    res.render("list",{listTitle:result.name,newListItems:result.items,listnames:lists});
                });
        })
        .catch(function(err){
            console.log(err);
        });
});

app.get("/entertainment/ent",function(req,res){
    res.render("entertainment");
});

app.post("/add",function(req,res){
    const coustomListName = _.capitalize(req.body.newlist);
    //two cases can be there either name can exits or not
    //if name exists
    List.findOne({name:coustomListName})
        .then(function(lists){ 
            if(lists != null){      //means already exist so dont add just redirect
                res.redirect("/"+coustomListName);
            }
            else{  //first add this list name into List model then redirect
                const list = new List({
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

    List.find({name:customListName})
        .then(function(lists){
            console.log(lists);
            Item.find({})
                .then(function(data){
                    res.render("list",{listTitle:"Today",newListItems:data,listnames:lists});
                });
        });
});

app.post("/",function(req,res){
    const itemName = req.body.newItem;
    const listName = req.body.list;

    const item = new Item({     // new document 
        name : itemName
    });

    if(listName == "Today"){
        item.save();
        res.redirect("/");
    }else{
        //new document insert into lists collection
        List.findOne({name:listName})
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
        res.redirect("/");
    }else{
        List.findOneAndUpdate({name:listName},{$pull:{items:{_id:checkItemId}}})
            .then(function(result){
                res.redirect("/"+listName);
            });
    }
});


app.post("/work",function(req,res){
    let item = req.body.newItem;
    workItems.push(item);

    res.redirect("/work");
});

let port = process.env.PORT;
if(port == null || port =="")
    port = 3000;

app.listen(port,function(){
    console.log("Server started on port 3000");
});



