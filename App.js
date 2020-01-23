const express = require('express')
const corn = require('node-cron')
const fs = require('fs')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const app = express()
const bodyParser = require('body-parser')
const mysql2 = require('mysql2')
const util = require('util')
const moment = require('moment')
require('dotenv').config()

let nodemailer = require('nodemailer')

const port = process.env.Port || 4000

//there is dns server no respone problem
//becuz ipv6 is ticked as true
//have to off ipv6 tick
//nslookup google.com
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
//mail instance
let transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: false,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
    },

})
let mailOptions = {
    from: 'youremail@gmail.com',//comes from .env file
    to: 'anotheremail@gmail.com',
    subject: 'Email sending testing',
    html: '<h3>Send Greeting Mail</h3><strong>sending from someone</strong>'

}


//send mail for every one day
// corn.schedule("59 23 * * *", () => {

//     console.log("Email will be sent every 1 day...........")
//    //.sendMail method and callback
//     transporter.sendMail(mailOptions, (err, info) => {
//         if (err) {
//             return console.log(err)
//         }
//         console.log("this is info", info)
//     })

// })

const mypool = mysql2.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

app.get('/', (req, res) => {
    query = util.promisify(mypool.query).bind(mypool)
    query(`SELECT * from emailsendtable`, (err, getQueryValue) => {
        if (err) {
            console.log(err)
        }
        else {
            return getQueryValue.length === 0 ? res.json({ payload: 'no data to be displayed' }) : res.json({ payload: getQueryValue, msg: true })

        }
    })
})

app.post("/send", (req, res) => {
    const name = req.body.name;
    const space = name.trim()
    //the off comment line is the solution for value provided is not in a recognized rfc2822 or iso format error
    //for this format=>01/08/2020
    // const date = req.body.date ? moment(req.body.date,"MM-DD-YYYY").format("YYYY-MM-DD") : new Date();
    const date = req.body.date ? moment(req.body.date).format("YYYY-MM-DD HH:mm:ss") : new Date();
    const email = req.body.email;
    const phoneno = req.body.phoneno;
    const message = req.body.message;
    query = util.promisify(mypool.query).bind(mypool)
    console.log({ date })
    query(`SELECT * from emailsendtable`, (err, returnQueryValue) => {
        if (err) {
            console.log(err)
        }
        else {
            if (returnQueryValue.length == 0) {
                return res.json({ payload: null, msg: 'no data to be displayed' })
            }
            else {
                const TrueOrFalse = returnQueryValue.reduce((r, c) => {
                    console.log({ r, c: c.name.split('').join('').toUpperCase() === name.split('').join('').toUpperCase() })
                    return r ? r : c.name.split(' ').join('').toUpperCase() === name.split(' ').join('').toUpperCase() ||
                        c.email === email
                }, false)
                console.log(TrueOrFalse)
                if (TrueOrFalse || space == '') {
                    return res.json({ msg: "fail", success: false })
                }
                else {
                    query(`INSERT INTO emailsendtable(name,date,email,phoneno,message) VALUES (?,?,?,?,?)`, [name, date, email, phoneno, message], (err, data) => {
                        if (err) {
                            console.log(err)
                            return res.json({ msg: "failed", success: false })
                        }
                        else {
                            transporter.sendMail(mailOptions, (err, info) => {
                                if (err) {
                                    return console.log(err)
                                }
                                console.log("this is info", info)
                                return res.json({ payload:null, msg: "succeded", success: true })
                            })

                        }

                    })
                }
            }



        }

    })


})
app.listen(port, () => {

    console.log(`Server is running on ${port}`)
})