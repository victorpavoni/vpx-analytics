require("dotenv").config()
const express = require("express")
const path = require("path")
const sqlite = require("sqlite3").verbose()
const cors = require('cors')

const app = express()   
app.use(express.static(path.join(__dirname, 'public')))

app.use(cors())

const app_id = process.env.APP_ID
const client_secret = process.env.CLIENT_SECRET
const url_ml = "https://api.mercadolibre.com/oauth/token"
const headers = {
    "accept": "application/json",
    "content-type": "application/x-www-form-urlencoded"
}

// Abrir conn com db
const db = new sqlite.Database('tokens.db', err => {
    if(err) console.log("Erro ao conectar no Banco", err.message)
    console.log("Conectado ao banco de dados com sucesso!")
})

// Rota para criar tabela
db.run(`CREATE TABLE IF NOT EXISTS tokens_ml (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    access_token TEXT,
    refresh_token TEXT)`, [], err => {
        if(err) console.error("Erro ao criar tabela", err.message);
        console.log("Tabela criada com sucesso!");
    })


// Rota Visitas
app.get("/visits/:id", async (req, res) => {
    const id = req.params.id
    console.log(id);
    
    try {

        getAccessToken()
            .then(async accessToken => {         
                const config = {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer '+accessToken,
                },
                };
                const response = await fetch(`https://api.mercadolibre.com/visits/items?ids=${id}`, config);
                const finalRes = await response.json();
                res.json(finalRes[id]);


            })
            .catch(err => {
            console.error('Erro ao buscar o access_token:', err);
            });
                
        
      } catch (err) {
        console.log('Erro ao recolher visitas:', err);
        //res.json({error:err})
      }
    
})

// Rota para gerar token
app.post("/getAccessToken", async (req, res) => {    
    const refresh_token = process.env.REFRESH_TOKEN

    const dados = `grant_type=refresh_token&client_id=${app_id}&client_secret=${client_secret}&refresh_token=${refresh_token}`

    const resposta = await fetch(url_ml, {
        method: "POST",
        headers: headers,
        body: dados
    })

    const res_json = await resposta.json()
    const access_token = res_json.access_token
    const refresh_token_db = res_json.refresh_token

    
    const addToken = (access_token, refresh_token_db) => {
        const sql = `INSERT INTO tokens_ml (access_token, refresh_token) VALUES (?, ?)`;
    
        db.run(sql, [access_token, refresh_token_db], err => {
            if (err) {
                console.error('Erro ao inserir dados:', err.message);
            } else {
                console.log(`Token gerado com sucesso!!`);
            }
        });
    };

    addToken(access_token, refresh_token_db)


    res.send("OK")
})

function getAccessToken() {
    return new Promise((resolve, reject) => {
      db.get("SELECT access_token FROM tokens_ml ORDER BY id DESC LIMIT 1", (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.access_token : null);
        }
      });
    });
}
  
  

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log('Server running on port '+PORT))