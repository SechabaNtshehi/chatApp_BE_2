import express from 'express'
import path from 'path'
import cors from 'cors'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { v4 } from 'uuid'
import bcrypt from 'bcrypt'

import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log(__dirname)

const saltRounds = 10

const db = await open({
    filename: 'users.db',
    driver: sqlite3.Database
})

const chatDB = await open({
    filename: 'chats',
    driver: sqlite3.Database
})

await db.exec(`
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid INTEGER UNIQUE,
        password TEXT,
        username TEXT UNIQUE
    )    
`)

await chatDB.exec(`
    CREATE TABLE IF NOT EXISTS chats(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatid INTEGER,
        uuid1 INTEGER,
        uuid2 INTEGER
        sent_at TEXT DEFAULT CURRENT_TIMESTAMP
    )    
`)

const app = express()
const PORT = 5555

app.use(cors())
app.use(express.static('public'))
app.use(express.json())

app.get('/', (req, res)=>{
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/accounts', (req, res)=>{
    res.sendFile(path.join(__dirname, 'public', 'accounts.html'))
})

app.listen(PORT, ()=>{
    console.log(`Listening at http://localhost:${PORT}`)
})

app.post('/register', async(req, res, next) =>{
    const {username, password} = req.body

    try{
        const hash = await bcrypt.hash(password, saltRounds)
        const uuid_ = v4()
        const result_ = await db.run('INSERT INTO users (uuid, password, username) VALUES (?, ?, ?)', [uuid_, hash, username])

        res.status(200).json({
            result: result_,
            uuid: uuid_,
            username: username
        })
    }
    catch(e){
        if(e.errno === 19){
            res.status(409).json({
                status: "error",
                message: "Username already exisits"
            })
        }
        else{
            next(e)
        }
    }
})

app.post('/sign-in', async (req, res, next)=>{
    const {username, password} = req.body

    try{
        const result = await db.get(`SELECT DISTINCT password,uuid,username FROM users WHERE username = ?`, [username])

        if(!result){
            console.log(result)
            res.status(401).send({
                status: "error",
                message: "Either username or password is incorrect"
            })
        }
        else{
            const passwordMatch = await bcrypt.compare(password, result.password)
            
            if(passwordMatch){
                console.log(passwordMatch)
                res.status(200).send({
                    status: "success",
                    message: "User confirmed",
                    username: result.username,
                    uuid: result.uuid
                })
            }
            else{
                console.log(passwordMatch)
                res.status(401).send({
                    status: "error",
                    message: "Either username or password is incorrect"
                })
            }
        }
    }
    catch(e){
        console.log(e)
        res.status(500).send({
            status: "error",
            message: "An internal error occcured, please try again"
        })
    }
})

app.get('/all-accounts', async (req, res)=>{
    console.log("Okay, lets goo")
    const accounts = await db.all(`SELECT DISTINCT uuid, username FROM users`)

    res.status(200).send(accounts)
})