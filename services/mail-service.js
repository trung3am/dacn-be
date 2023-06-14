const mailer = require('nodemailer');

const SendMail = async (email, secret) => {
  smtpProtocol = mailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.MAIL,
        pass: process.env.APPPW
    }
});
let url = process.env.URL +'/newpassword?key=' + secret;
let mailoption = {
    from: process.env.MAIL,
    to: email,
    subject: "TimeTable reset your password",
    html: 'follow current link to reset your password: ' + url
}

smtpProtocol.sendMail(mailoption, function(err, response){
    if(err) {
        console.log(err);
    } 
    console.log('Message Sent' + response);
    smtpProtocol.close();
});
}

module.exports =  {SendMail}