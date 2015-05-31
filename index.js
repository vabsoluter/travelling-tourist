var express = require('express'),
    port = process.argv[2] || 3000,
    app = express(),
    bodyParser = require('body-parser'),
    R = require('ramda'),
    http = require('http'),
    request = require('request'),
    pg = require('pg');

app.set('view engine', 'jade');
app.set('views', 'frontend/views');
app.use('/public', express.static('./frontend/public'));
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function (req, res) {
    res.render('index', {title: 'Главная'});
});

app.post('/solve', bodyParser.json(), function(req, res){
    var waypoints = req.body.waypoints,
        queryString = R.reduceIndexed(function(carry, item, index, list){
            carry += 'loc=' + item.lat + ',' + item.lng;
            if(index !== list.length - 1){
                carry += '&';
            }
            return carry;
        }, '', waypoints),
        startIndex = 0,
        finishIndex = waypoints.length - 1;
    request('http://localhost:5000/table?' + queryString, function(err, resp, body){
        if(err){
            console.error('error getting distance table: ', err);
            res.status(500).end();
            return;
        }
        var distanceTable = JSON.parse(body)['distance_table'],
            distanceString = '{' + R.map(function(subArr){
                return '{' + subArr.join(', ') + '}';
            }, distanceTable).join(',') + '}',
            connectionString = 'postgres://tourist:tourist@localhost/routing';
        pg.connect(connectionString, function(err, client, done){
            if(err) {
                console.error('error fetching client from pool', err);
                res.status(500).end();
                return;
            }
            client.query('SELECT seq, id FROM pgr_tsp($1::float8[],$2,$3);', [distanceString, startIndex, finishIndex], function(err, result) {
                done();
                if(err) {
                    console.error('error running query', err);
                    res.status(500).end();
                    return;
                }
                var sequence = R.pluck('id', result.rows);
                res.send(sequence);
            });
        });
    });
});

var server = app.listen(port, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log('Listening at http://%s:%s', host, port);

});