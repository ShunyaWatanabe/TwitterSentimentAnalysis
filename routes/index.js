var express = require('express');
var router = express.Router();
var request = require('request');
var Twitter = require('twitter');
var client = new Twitter({
  // PUT YOUR KEYS TO MAKE IT WORK
  access_token_key: "",
  access_token_secret: "",
  consumer_key: "",
  consumer_secret: ""

});



/* GET home page. */
router.get('/', function(req, res, next) {
  console.log("hi");
  res.render('index');
});


/* POST home page. */
router.post('/', function(req, res, next){
  console.log("hashtag: " + req.body.hashtag);
  console.log("user: " + req.body.user);
  console.log("count: " + req.body.count);
  var hashtag = req.body.hashtag;
  var user = req.body.user;
  var count = req.body.count;

  if (user){
    var promise = getUserTweets(user, count)
      .then(tweets => {
        if (tweets.length == 0){
          res.render('index', {
            hashtag: hashtag,
            user: user,
            count: count,
            err: "Public user account couldn't be found"
          });
        }
        return getAnalysis(tweets);
      })
      .then(analysis => {
        console.log(analysis);
        var total = analysis.reduce((a, b) => ({score: a.score + b.score}));
        var average = total.score/analysis.length;
        console.log(user);
        res.render('index', {
          analysis: analysis,
          average: average,
          hashtag: hashtag,
          user: user,
          count: count
        });
      });
    return;
  }

  // check input
  if (hashtag.charAt(0) != '#'){
    console.log("doesn't contain hashtag");
    res.render('index', {err: "Hashtag needs to include # at the beginning"});
  } else if(hashtag.length == 1){
    console.log("only # in input");
    res.render('index', {err: "Please type in a hashtag to analyse"});
  } else if (hashtag.match("#") > 1){
    console.log("contains more than 1 hashtag");
    res.render('index', {err: "You can only search 1 hashtag at a time"});
  } else if (isNaN(count)){
    console.log("not a number");
    res.render('index', {err: "Number of twitters needs to be expressed in numbers"});
  }

  // get average score
  else {
    var promise = getTweets(hashtag, count)
      .then(tweets => {
        return getAnalysis(tweets);
      })
      .then(analysis => {
        console.log(analysis);
        var total = analysis.reduce((a, b) => ({score: a.score + b.score}));
        var average = total.score/analysis.length;
        res.render('index', {
          analysis: analysis,
          average: average,
          hashtag: hashtag,
          count: count
        });
      });
  }
});


module.exports = router;


function getTweets(hashtag, count){
  return new Promise((resolve, reject) => {
    //client.get('search/tweets',
    client.get('search/tweets',
      {
        q: hashtag,
        count: count,
        lang: "en",
        mode: "extended"
      },
      function (error, tweets, response) {
        if (error) {
          console.log(error);
        } else {
          var array = [];
          for (var i = 0; i < tweets.statuses.length; i++) {
            array.push({"text": tweets.statuses[i]["text"], "id": (i+1).toString()});
          }
          resolve(array);
        }
      });
  });
}

function getUserTweets(user, count){
  return new Promise((resolve, reject) => {
    //client.get('search/tweets',
    client.get('statuses/user_timeline',
      {
        screen_name: user,
        count: count,
        lang: "en",
        mode: "extended"
      },
      function (error, tweets, response) {
        if (error) {
          console.log(error);
        } else {
          console.log(tweets);
          var array = [];
          if (tweets[0].user.screen_name.toLowerCase() != user.toLowerCase()){
            console.log(tweets[0].user.screen_name);
            console.log(user);
            resolve([]);
          }
          for (var i = 0; i < tweets.length; i++) {
            array.push({"text": tweets[i].text, "id": (i+1).toString()});
          }
          console.log(array);
          resolve(array);
        }
      });
  });
}


function getAnalysis(tweets){
  return new Promise ((resolve, reject)=> {
    request({
      url: 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment',
      "headers": {
        "Ocp-Apim-Subscription-Key": "fed577665b404728becc55d817b5e753",
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      method: 'POST',
      json: {"documents": tweets}
    },
      function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var analysis = response.body.documents;
        for (var i=0; i<analysis.length; i++){
          analysis[i]["text"] = tweets[i].text;
        }
        resolve(analysis);
      }
      else {
        console.log(error);
      }
    });
  });
}

//https://api.twitter.com/1.1/users/search.json