//import express
const express = require("express")
const path = require("path")
const fs = require("fs");
const http = require("http");

const app = express();
const bodyParser = require("body-parser");
let portNum = 5000;


//setting up standard input
process.stdin.setEncoding("utf-8");

const httpURL = `http://localhost:${portNum}`;
console.log(`Web server has started and running at ${httpURL}`);
const stopPrompt = "Type Stop to shutdown the server: ";
process.stdout.write(stopPrompt);

process.stdin.on("readable", function() {
    let input = process.stdin.read();
    if (input !== null) {
        let command = input.trim();
        if(command === "Stop" || command === "stop") {
            console.log("Shutting down server");
            process.exit(0);
        } else {
            console.log("Invalid command.");
        }
        process.stdout.write(stopPrompt);
        process.stdin.resume();
    }
});


//setting up mongo
const databaseAndCollection = {db: "335FinalProjectDB", collection: "userClasses"};
const {MongoClient, ServerApiVersion} = require('mongodb');
const uri = `mongodb+srv://tanwinston217:abcde@cluster0.idenr0n.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


//directory where templates(ejs/html) resides
app.set("views", path.resolve(__dirname, "templates"));
// view/templating engine
app.set("view engine", "ejs");
const statusCode = 200;

/* Initializes request.body with post information */ 
app.use(bodyParser.urlencoded({extended:false}));

app.get("/", (request, response) => {
    response.render("index");
});

app.get("/searchCourse", (request, response) => {
    const variables = {httpURL: `http://localhost:${portNum}/searchCourse`};
    response.render("searchCourse", variables);
});

app.post("/searchCourse", async (request, response) => {
    const { courseName } = request.body;

    fetch('https://planetterp.com/api/v1/course?name=' + courseName)
    .then(response => response.json())
    .then(data => {
        // console.log(data.average_gpa); // Process the received data

        /*
            {
                "department": "MATH",
                "course_number": 140,
                "title": "Calculus I",
                "description": "Introduction to calculus, including functions, limits, continuity, derivatives and applications of the derivative, sketching of graphs of functions, definite and indefinite integrals, and calculation of area. The course is especially recommended for science, engineering and mathematics majors.",
                "credits": 3,
                "average_gpa": 3.127,
                "professors": [
                "Jon Snow",
                "Tyrion Lannister"
                ]
            }
        */

        const variables = {
            courseName: courseName,
            department: data.department,
            course_number: data.course_number,
            title: data.title,
            description: data.description,
            credits: data.credits,
            average_gpa: data.average_gpa,
            professors: data.professors,
        }
        // console.log(`${courseName} data: ${variables.credits}`);

        //insert into mongo database
        addClass(variables);
        response.render("searchResults", variables);

    })
    .catch(error => {
    console.error('Error:', error); // Handle any errors
    });

});
//Add the class to mongodb database
async function addClass(classInfo) {
    try{
        await client.connect();
        await insertInfo(client, databaseAndCollection, classInfo);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
    
}

async function insertInfo(client, databaseAndCollection, info){
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(info);
}


//change /adminGFA
app.get('/schedule', async (req, res) => {
    let arr = await gimmeAllCourses(client, databaseAndCollection); //this an array of each applicant

    //Table headers: Course | Credis | Avg GPA
	let table = "<table border=\"double\"><tr><th>Course</th><th>Credis</th><th>Avg. GPA</th></tr>";
	for(let obj of arr){
		table += "<tr>"
		table += "<td>" + obj.courseName + "</td>" + "<td>" + obj.credits + "</td>" + "<td>" + obj.average_gpa + "</td>" 
		table += "</tr>"
	}

	table += "</table>"


	res.render('mySchedule.ejs', {table})
});

async function gimmeAllCourses(client, databaseAndCollection){
    try {
        await client.connect();
        let filter = {};
        const cursor = client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
        
        const result = await cursor.toArray();
        return result
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

}



app.listen(portNum);