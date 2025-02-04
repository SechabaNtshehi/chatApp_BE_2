import express from 'express'
import path from 'path'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { v4 } from 'uuid'
import bcrypt from 'bcrypt'

const saltRounds = 10

const db = await open({
    filename: 'users.db',
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

const app = express()
const PORT = 5555

app.use(express.static('./public/'))
app.use(express.json())

app.get('/', (req, res)=>{
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(PORT, ()=>{
    console.log(`Listening at http://localhost:${PORT}`)
})

app.post('/register', async(req, res, next) =>{
    const {username, password} = req.body

    try{
        const hash = await bcrypt.hash(password, saltRounds)
        const uuid = v4()
        const result_ = await db.run('INSERT INTO users (uuid, password, username) VALUES (?, ?, ?)', [uuid, hash, username])

        res.status(200).json({result: result_})
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

app.post('/sign-in', async (req, send, next)=>{
    const {username, password} = req.body

    try{
        const result = await db.get(`SELECT password FROM users WHERE username = ?`, [username])

        if(!result){
            res.status(401).send({
                status: "error",
                message: "Either username or password is incorrect"
            })
        }
        else{
            const passwordMatch = await bcrypt.compare(password, result.password)
            
            if(passwordMatch){
                res.status(200).send({
                    status: "success",
                    message: "User confirmed"
                })
            }
            else{
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