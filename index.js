import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import exp from "constants";
import { get } from "http";

const app = express();
const port = 3000;

let error = null; // set only when there is an exception
let visitedCountries = [];


// Database connect
const db = new pg.Client({
  user : "postgres",
  host : "localhost",
  database : "world",
  password : "@Postgres2608",
  port : 5432
});

db.connect();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

async function getVisitedCountries(name){
    let result = await db.query(
        `SELECT f.name,v.country_code FROM family_members f 
         LEFT OUTER JOIN visited_countries v 
         ON f.id = v.member_id WHERE f.name = $1;`
         ,[name]);

    let data = result.rows;
    const visitedCountries = []; // Empty the array before storing in order to avoid duplicates
    data.forEach((entry)=>{
        visitedCountries.push(entry.country_code);
    });
    res.render("index.ejs",{countries : visitedCountries, total : visitedCountries.length, error: error});
};


// Homepage
app.get("/", async (req, res) => {
    // Block to handle non valid country names
    const result = await db.query(`SELECT id, name FROM family_members`);
    let data = result.rows;
    let members = [];
    data.forEach((entry)=>{
        members.push({id : entry["id"],
                      name : entry["name"]  });
    });
    console.log(`members from backend : ${JSON.stringify(members)}`);
    res.render("index.ejs" , {members : JSON.stringify(members) , visitedCountries : null});
});

// Homepage of selected user
app.post("/", async (req, res) => {
    // Block to handle non valid country names
    const memberId = req.body["memberId"];
    const result = await db.query(`SELECT country_code FROM visited_countries
                                    WHERE member_id = $1`,[memberId]);
    let data = result.rows;
    visitedCountries = [];
    data.forEach((entry)=>{
        visitedCountries.push(entry["country_code"]);
    });
    console.log(`visited countries : ${visitedCountries} , member : ${memberId}`);
    res.render("index.ejs" , { visitedCountries : visitedCountries});
});


// Add new entry
app.post("/add",async (req,res)=>{
    let memberId = req.body["memberId"];
    let userData = req.body.country.trim().toLowerCase();
    
    try{ // Block to handle non valid country names
      const result = await db.query(
                            `SELECT country_code FROM countries 
                             WHERE lower(country_name) LIKE '%' || $1 || '%';`
                            ,[userData]);

        const newCountryCode = result.rows[0]["country_code"];
        
        try{ // Block to handle duplicates
            db.query(
                    `INSERT INTO visited_countries(country_code,member_id) 
                     VALUES( $1 , $2);` 
                    ,[newCountryCode],[memberId]);
        }catch(err){
          console.log(err);
          error = "Country already visited. Try again.";
        };
    }catch(err){
      console.log(err);
      error = "Country does not exist. Try again.";
    }
    res.redirect("/");
});





// Start the server
app.listen(port, ()=>{
    console.log(`Server running on port ${port}`);
});
