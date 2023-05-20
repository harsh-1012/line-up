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

mongoose.connect("mongodb+srv://admin-harsh:"+process.env.mongoPass+"@cluster0.xoqf80d.mongodb.net/todolistDB",{
    useNewUrlParser:true
});

const itemsSchema = {
    name : String
};

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
    name : "Welcome to your todoList"
});
const item2 = new Item({
    name : "Hit + button to add item"
});
const item3 = new Item({
    name : "Hit check box to cut down item"
});

const defaultItems = [item1,item2,item3];

const listSchema = {
    name : String,
    items : [itemsSchema]
};

const List = mongoose.model("List",listSchema);

app.get("/",function(req,res){
    // let day = date.getDate();
    Item.find({})
    .then(function(data){
        if(data.length == 0){
            Item.insertMany([item1,item2,item3])
                .then(function(){
                    console.log("Inserted into database");
                })
                .catch(function(err){
                    console.log(err);
                });
            res.redirect("/");
        }else{
            res.render("list", {listTitle : "Today" , newListItems : data});
        }
    });
    
});

//dynamic url handler
//acces the url using "Express Route Parameters"
app.get("/:customeListName",function(req,res){
    const customeListName = _.capitalize(req.params.customeListName);

    List.findOne({name:customeListName})
        .then(function(result){
            if(result != null){
                //already exists print the result
                res.render("list",{listTitle:result.name,newListItems:result.items});
            }else{
                //create new
                const list = new List({
                    name : customeListName,
                    items : defaultItems
                });
                list.save();
                res.redirect("/"+customeListName);
            }
        })
        .catch(function(err){
            console.log(err);
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



