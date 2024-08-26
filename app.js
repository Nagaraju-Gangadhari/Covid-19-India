const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const app = express()
app.use(express.json())

let db = null
const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running')
    })
  } catch (e) {
    console.log(`DB Error:${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()
const convertDBtoObject = eachObj => {
  return {
    stateName: eachObj.state_name,
    population: eachObj.population,
    districtId: eachObj.district_id,
    districtName: eachObj.district_name,
    stateId: eachObj.state_id,
    cases: eachObj.cases,
    cured: eachObj.cured,
    active: eachObj.active,
    deaths: eachObj.deaths,
    active: eachObj.cured,
    deaths: eachObj.deaths,
  }
}
app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username='${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOK')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})
const authenticateToken=(request,response,next)=>{
    let jwtToken;
    const authHeader=request.header("authorization");
    if(authHeader !== undefined){
      jwtToken=authHeader.split(" ")[1];
    }
    if(jwtToken ===undefined){
      response.status(401);
      response.send("Invalid JWT Token");
    }
    else{
      jwt.verify(jwtToken,"MY_SECRET_TOK",async(error,payload)=>{
        if(error){
          response.status(401);
          response.send("Invalid JWT Token");
        }
        else{
          next();
        }
      } )
    }
}
app.get('/states/',authenticateToken, async (request, response) => {
  const getAllStatesQuery = `
  SELECT *
  FROM state
  `
  const resp = await db.all(getAllStatesQuery)
  response.send(resp.map(eachObj => convertDBtoObject(eachObj)))
})
app.get('/states/:stateId',authenticateToken, async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
  SELECT *
  FROM state
  WHERE state_id='${stateId}'`
  const resp2 = await db.get(getStateQuery)
  response.send(convertDBtoObject(resp2))
})
app.post('/districts/',authenticateToken, async (request, response) => {
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const addDistrictQuery = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
  VALUES('${districtName}',
  '${stateId}',
  '${cases}',
  '${cured}',
  '${active}',
  '${deaths}')
  `
  const resp3 = await db.run(addDistrictQuery)
  response.send('District Successfully Added')
})
app.get('/districts/:districtId/',authenticateToken, async (request, response) => {
  const {districtId} = request.params
  const getStaesQuery = `
    SELECT * FROM district WHERE district_id = ${districtId};`
  const states = await db.get(getStaesQuery)
  response.send(convertDBtoObject(states))
})
app.delete('/districts/:districtId/',authenticateToken, async (request, response) => {
  const {districtId} = request.params
  const deleteQuery = `DELETE FROM district
  WHERE district_id=${districtId}`
  await db.run(deleteQuery)
  response.send('District Removed')
})
app.put('/districts/:districtId/',authenticateToken, async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const updateQuery = `UPDATE district
  SET 
  district_name='${districtName}',
  state_id='${stateId}',
  cases='${cases}',
  cured='${cured}',
  active='${active}',
  deaths='${deaths}'
  WHERE district_id=${districtId};`
  await db.run(updateQuery)
  response.send('District Details Updated')
})
app.get('/states/:stateId/stats/',authenticateToken, async (request, response) => {
  const {stateId} = request.params
  const statsQuery = `SELECT 
  SUM(cases),
  SUM(cured),
  SUM(active),
  SUM(deaths)
  FROM district
  WHERE state_id='${stateId}';
  `
  const stats = await db.get(statsQuery)
  console.log(stats)
  response.send({
    totalCases: stats['SUM(cases)'],
    totalCured: stats['SUM(cured)'],
    totalActive: stats['SUM(active)'],
    totalDeaths: stats['SUM(deaths)'],
  })
})

app.get('/districts/:districtId/details/',authenticateToken, async (request, response) => {
  const {districtId} = request.params
  const getdistrictQ = `
  SELECT state_name as stateName
  FROM state
  NATURAL JOIN district
  WHERE district_id='${districtId}'`
  const resp6 = await db.get(getdistrictQ)
  response.send(resp6)
})

module.exports = app
