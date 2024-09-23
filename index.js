import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

const app = express();
const port = 3000;
env.config();

let memberId = 1;
let error;

// Database connect
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Function to get the visited countries for a particular member
//--------------------------------------------------------------
async function getVisitedCountries(memberId) {
  const result = await db.query(
    `SELECT country_code FROM visited_countries
         WHERE member_id = $1`,
    [memberId]
  );

  let data = result.rows;
  let visitedCountries = [];
  data.forEach((entry) => {
    visitedCountries.push(entry["country_code"].trim());
  });
  console.log(JSON.stringify(visitedCountries));
  return visitedCountries;
}

// Function to get all the members
//-----------------------------------
async function getMembers() {
  const result = await db.query(`SELECT id, name, colour FROM family_members`);
  let data = result.rows;
  let members = [];
  data.forEach((entry) => {
    members.push({
      id: entry["id"],
      name: entry["name"],
      colour: entry["colour"],
    });
  });
  return JSON.stringify(members);
}

//Function to get the colour of the user
//---------------------------------------
async function getColour(memberId) {
  const result = await db.query(
    `SELECT colour FROM family_members
                                   WHERE id = $1`,
    [memberId]
  );
  let data = result.rows;
  let colour = data[0]["colour"];
  console.log(colour);
  return colour;
}

// Homepage
//-----------
app.get("/", async (req, res) => {
  const members = await getMembers();
  const visitedCountries = await getVisitedCountries(memberId);
  const colour = await getColour(memberId);
  res.render("index.ejs", {
    members: members,
    visitedCountries: visitedCountries,
    id: memberId,
    colour: colour,
    error: error,
  });
});

// Homepage of selected user
//---------------------------
app.post("/member", async (req, res) => {
  memberId = req.body["memberId"];
  console.log(`Inside member ${memberId}`);
  if (memberId == "new") {
    res.render("add-member.ejs");
  } else {
    res.redirect("/");
  }
});

//Add new member
//-----------------
app.post("/new", async (req, res) => {
  const name = req.body["name"];
  const colour = req.body["colour"];
  console.log(req.body);
  console.log(`Inside new name: ${name} colour: ${colour}`);
  const result = await db.query(
    `INSERT INTO family_members(name,colour) 
                         VALUES ($1,$2);`,
    [name, colour]
  );
  error = "";
  memberId = 1;
  res.redirect("/");
});

// Add new country
//----------------
app.post("/add", async (req, res) => {
  console.log(
    `Inside add page. memberId : ${req.query["id"]}, userData : ${req.body["countryInput"]}`
  );
  memberId = req.query["id"];
  let userData = req.body["countryInput"].trim().toLowerCase();

  try {
    // Block to handle non valid country names
    const result = await db.query(
      `SELECT country_code FROM countries 
                             WHERE lower(country_name) LIKE '%' || $1 || '%';`,
      [userData]
    );

    const newCountryCode = result.rows[0]["country_code"];
    console.log(`new country code : ${newCountryCode}`);
    try {
      // Block to handle duplicates
      const res = await db.query(
        `INSERT INTO visited_countries(country_code,member_id) 
                                VALUES( $1 , $2);`,
        [newCountryCode, Number(memberId)]
      );
    } catch (err) {
      console.log(err);
      error = "Country already visited. Try again.";
    }
  } catch (err) {
    console.log(err);
    error = "Country does not exist. Try again.";
  }
  res.redirect("/");
});

// Start the server
//--------------------
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
