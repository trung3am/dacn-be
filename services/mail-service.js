const mailer = require('nodemailer');

const SendMail = async (email, subject, msg, url) => {
  smtpProtocol = mailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.MAIL,
        pass: process.env.APPPW
    }
});

let mailoption = {
    from: process.env.MAIL,
    to: email,
    subject: subject ,
    html:  msg + url
}

console.log(mailoption);
smtpProtocol.sendMail(mailoption, function(err, response){
    if(err) {
        console.log(err);
    } 
    console.log('Message Sent' + response);
    smtpProtocol.close();
});
}

module.exports =  {SendMail}