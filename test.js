const axios = require('axios');

async function NotificationApi (expo_token, title, sub, body)  {


  var data = JSON.stringify({
    to: expo_token,
    title: title,
    subtitle: sub,
    body: body,
    badge: 1
});
    [

  ]
    var config = {  
      method: 'get',
      url: "https://source.unsplash.com/random?sig=4",
    };
    
    try {
      const res = await axios(config)
      console.log(res.request.res.responseUrl)
      return res.request.res.responseUrl;
    } catch (e) {
        console.log(e)
        return e
    }

}

let l = [0,0,0,0,0,0];

function proc () {
for (let i = 0; i < 6; i++) {
  let p = NotificationApi().then((e)=>{
    l[i]=e;
    console.log(l);
  });
  
  
}
// console.log(l);
}

proc()
