const fs = require('fs')
const axios = require('axios')
//const prompt = require('prompt-sync')({sigint: true})
//const WebSocket = require('ws')
const configFile = JSON.parse(fs.readFileSync("./config.json"))
const accounts = configFile.accounts
const timerDelay = configFile.delay * 60000
let failAmount = 0

async function sendReq(data,url,auth,get){
  try {
  // Use GET
  if(get) return await axios.get(
    `${url}`,
    {
      headers: {
        'Authorization': auth
      }
    }
  ).then(res => res.data)
  // Use POST
  return await axios.post(
    `${url}`,
    JSON.stringify(data),
    {
      headers: {
        'Authorization': auth
      }
    }
  ).then(res => res.data)
  } catch (err) {
    return
  }
}
async function getToken(email,password){
    var data = {"email":email,"password":password,"vars":{"client_version":"99999"}}
    try {
      let response = await axios.post(
        `https://dev-nakama.winterpixel.io/v2/account/authenticate/email?create=false&=`,
        data,
        {
          headers: {
            'Authorization': `Basic OTAyaXViZGFmOWgyZTlocXBldzBmYjlhZWIzOTo=`
          }
        }
      )
      return response.data.token
    } catch (err) {
      return
    }
}
async function wait(ms) {
  return await new Promise(resolve => setTimeout(resolve, ms))
}
async function collectBonus(email,password){
  let token = "Bearer " + await getToken(email,password)
  if(token.split("Bearer ")[1] === "undefined") {
    failAmount++
    return console.log(`Could not log into account with email ${email}.`)
  }
  await sendReq(JSON.stringify({}),"https://dev-nakama.winterpixel.io/v2/rpc/collect_timed_bonus",token).then(async(res) => {
    // Get current coins
    let accountData = await sendReq(null,"https://dev-nakama.winterpixel.io/v2/account",token,1)
    let wallet = JSON.parse(accountData.wallet)
    let user = accountData.user
    //
    if(!res) {
      failAmount++
      return console.log(`Could not collect ${user.display_name}'s time bonus.`)
    }
    console.log(`Bonus collected for ${user.display_name}. Current coins: ${wallet.coins}`) 
})
}
async function index(){
  while(true){
    failAmount = 0
    let requests = []
    accounts.forEach((account) => requests.push(collectBonus(account.email,account.password)))
    await Promise.all(requests).then(() => console.log(`Claimed coins for ${accounts.length - failAmount} accounts.`))
    await wait(timerDelay)
  }
}
index()
