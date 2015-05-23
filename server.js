
var unirest = require('unirest');
var express = require('express');
var events = require('events');

var app = express();
app.use(express.static('public'));

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
        .qs(args)
        .end(function(response) {
            emitter.emit('end', response.body);
        });
    return emitter;
};

app.get('/search/:name', function(req, res) {
  var searchReq = getFromApi('search', {
    q: req.params.name,
      limit: 1,
      type: 'artist'
  });

  searchReq.on('end', function(item) {
      var artist = item.artists.items[0];
      unirest.get('https://api.spotify.com/v1/artists/' + artist.id + '/related-artists')
          .end(function(response) {
              if (!response.error) {
                  artist.related = response.body.artists;
                  res.json(artist);
              } else {
                  res.sendStatus(404);
              }

          });
      
  });

  searchReq.on('error', function() {
      res.sendStatus(404);
  });

});

app.listen(8080);

