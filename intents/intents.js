const entity = require('../entities/entities')

function getIntents(phrase) {
  let chunk = phrase.toLowerCase().split(' ');
    // intent
    const SHOW_TASK = "SHOW_TASK";
    const SHOW_DETAIL = "SHOW_DETAIL";
    const SELECT_TASK = "SELECT_TASK";
    const DIRECT  = "DIRECT";
    const SET_NOTI = "SET_NOTI";
    const SET_DUE = "SET_DUE";
    const SET_REMINDER = "SET_REMINDER";
    const DETAIL_TASK = "DETAIL_TASK";
    const YES = "YES";
    const CANCEL = "CANCEL";
    const CREATE = "CREATE";
  
    function _process(token) {
      for (const k in entity) {
        if (Object.hasOwnProperty.call(entity, k)) {
          if(entity[k][token]) return k;
          
        }
      }
  
    }
  let intent = {};
  for (const i of chunk) {
    let t = _process(i);
    if(t =="NUMBER") {
      intent[t] = entity.NUMBER[i];
    } else {
      intent[t] = true;
    }
  }
      //intent curating
      let _intent ="";
      let _info = {};
      if(intent["NUMBER"] || intent["NUMBER"] == 0) {
        _info.number = intent["NUMBER"];
        intent["NUMBER"] = 1;
      }
      if(intent["AMPM"]) _info.ampm = intent["AMPM"];
      if(intent["TODAY"]) _info.day = "TODAY";
      if(intent["NEXT_DAY"]) _info.day = "NEXT_DAY";
      if(intent["EVENING"]) _info.time = "EVENING";
      if(intent["AFTERNOON"]) _info.time = "AFTERNOON";
      if(intent["MORNING"]) _info.time = "MORNING";
      if(intent["ON"]) _info.noti_status = "on";
      if(intent["OFF"]) _info.noti_status = "off";
      
      if(intent["TASK"] && intent["SHOW"]) _intent=SHOW_TASK;
      if(intent["DETAIL"] && intent["TASK"]) _intent=SHOW_DETAIL;
      if(intent["SELECT"] && intent["NUMBER"]) _intent=SELECT_TASK;
      
      if(intent["SET"]) {
        if(intent["NOTIFICATION"]) _intent=SET_NOTI;
        if(intent["DUE"]) _intent=SET_DUE;
        if(intent["REMINDER"]) _intent=SET_REMINDER;
      }
      if(intent["CREATE"]) _intent=CREATE;
      if(intent["DIRECT"]) _intent=DIRECT;
      if(intent["CANCEL"]) _intent=CANCEL;
      if(intent["YES"]) _intent=YES;
  
      // console.log(chunk);
      return {intent: _intent, result: chunk , info:_info};
}

module.exports = getIntents;

