let a = {
  "_id": "4fcf652a-dd85-4e79-8b33-c1d5b55ba1ee",
  "create_at": "2023-11-08T20:17:26.275Z",
  "done": false,
  "due": null,
  "location": {
    "latitude": 10.7922955,
    "longitude": 106.7816659,
    "name": "Search: Đại học bách khoa"
  },
  "reminder": null,
  "repeat": { "hour": "2023-11-05T02:00:00.000Z", "type": "Monthly" },
  "title": "Mi"
}
delete a._id;
delete a.create_at;

console.log(JSON.stringify(a));