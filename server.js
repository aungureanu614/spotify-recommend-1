
// change all api calls to use getFromApi
// how do we better handle errors?

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

var getTracks = function(artist, cb) {
    unirest.get('https://api.spotify.com/v1/artists/' + artist.id + '/top-tracks?country=US')
        .end(function(response) {
           if (!response.error) {
               artist.tracks = response.body.tracks;
               //console.log(response.body);
               cb();
           } else {
               cb(response.error);
           }
        });
};

app.get('/search/:name', function(req, res) {

    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    searchReq.on('end', function(item) {
        var artist = item.artists.items[0];
        var relatedEP = 'artists/' + artist.id + '/related-artists';
        var relatedReq = getFromApi(relatedEP);

        relatedReq.on('end', function(item) {
            artist.related = item.artists;

            // now get top tracks for all artists
            var totalArtists = artist.related.length;
            var completed = 0;

            // this will check to see if we are done
            // and return the entire artist object
            var checkComplete = function() {
                if (completed === totalArtists) {
                    res.json(artist);
                }
            };

            // For each related artist, get top tracks
            artist.related.forEach(function(relatedArtist) {
                var trackEP = 'artists/' + relatedArtist.id + '/top-tracks';
                var trackReq = getFromApi(trackEP, {country: 'US'});

                trackReq.on('end', function(item) {
                    relatedArtist.tracks = item.tracks;
                    completed += 1;
                    checkComplete();
                });

                trackReq.on('error', function() {
                    res.sendStatus(404);
                });

            });

        });

        relatedReq.on('error', function() {
            res.sendStatus(404);
        });
    });

    searchReq.on('error', function() {
        res.sendStatus(404);
    });


});

app.listen(8080);

/*

 unirest.get('https://api.spotify.com/v1/artists/' + artist.id + '/related-artists')
 .end(function(response) {
 if (!response.error) {
 artist.related = response.body.artists;

 // now get top tracks for all artists
 var totalArtists = artist.related.length;
 var completed = 0;

 //console.log(totalArtists);
 //console.log(completed);

 var checkComplete = function() {
 if (completed === totalArtists) {
 res.json(artist);
 }
 };

 artist.related.forEach(function(artist) {
 getTracks(artist, function(err) {
 if (err) {
 // This doesn't work.  Work on error handling.
 res.sendStatus(404);
 }

 completed += 1;
 checkComplete();

 });
 });

 } else {
 res.sendStatus(404);
 }

 });
 */

