// const axios = require("axios");

// axios({
//   method: 'get',
//   url: 'https://www.googleapis.com/calendar/v3/calendars/flashbang555%40gmail.com/tasks',
//   headers: {
//     Authorization: "Bearer ya29.a0AfB_byBYEyP0YCKTd7fgcb8qdlVwQZtjApdQPQcdipM9Q15F-yJdRVABM-JEfluajeVks6rTBoEHlOuzXovpEDCQC8aNzCW9ngxHvbvUkTXJy9lwk_Jo5_MGft938xPnssJDLM0K05tiWcukVZZy0GIIA2OVwmnpejwjaCgYKAdoSARMSFQGOcNnCV4p7CBuC4Ou1S-vQje7FMw0171"
//   }
// }).then((res)=> {
//   console.log(res.data.items[res.data.items.length-1]);
// });
const fs = require('fs');

fs.writeFileSync('./audio.txt',"audio");
