function setMarker(popup, map){
    return function(event){
        var type = $(event.target).data('type'),
            waypoint = {
                latlng: {
                    lat: popup.getLatLng().lat,
                    lng: popup.getLatLng().lng
                },
                start: false,
                finish: false
            };
        waypoints.push(waypoint);
        switch(type){
            case 'start':
                waypoints = R.map(function(item){
                    if(item === waypoint){
                        return R.assoc('start', true, item);
                    }else{
                        return R.assoc('start', false, item);
                    }
                }, waypoints);
                break;
            case 'finish':
                waypoints = R.map(function(item){
                    if(item === waypoint){
                        return R.assoc('finish', true, item);
                    }else{
                        return R.assoc('finish', false, item);
                    }
                }, waypoints);
                break;
        }
        L.marker(popup.getLatLng())
            .addTo(map)
            .on('click', function(event){
                var marker = this;
                marker
                    .bindPopup(Mustache.render($('#popup-controls').html()))
                    .openPopup();
            })
            .on('popupopen', function(event){
                var popup = event.popup,
                    handleButtonClick = function(event){
                        var type = $(event.target).data('type');
                    };
                $('.popup-controls').on('click', '> .ui.button', handleButtonClick);
            })
            .on('popupclose', function(event){
                $('.popup-controls').off('click', '**');
            });
        map.closePopup(popup);
    };
}

var Mustache = require('mustache'),
    R = require('ramda'),
    waypoints = [];

module.exports = function(id){
    var map = L.map(id, {
            center: [20.52577476373983, -100.81329345703125],
            zoom: 13
        }),
        buttonsTemplate = Mustache.render($('#buttons-template').html()),
        control = L.Routing.control({
            router: new L.Routing.OSRM({
                serviceUrl: 'http://localhost:5000/viaroute'
            })
        });
    control.addTo(map);

    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);

    map.on('click', function(event){
        var latlng = event.latlng,
            popup = L.popup()
            .setLatLng(latlng)
            .setContent(buttonsTemplate)
            .openOn(map);
        $('.buttons-container').on('click', '.ui.button', setMarker(popup, map));
    });
    $('#control').on('click', '> .ui.button', function(){
        $.ajax({
            url: 'solve',
            data: JSON.stringify({
                waypoints: waypoints
            }),
            type: 'POST',
            processData: false,
            contentType: "application/json"
        }).done(function(sequence){
            var route = R.reduce(function(carry, index){
                var lat = waypoints[index]['latlng']['lat'],
                    lng = waypoints[index]['latlng']['lng'];
                carry.push(L.latLng(lat,lng));
                return carry;
            }, [], sequence);
            control.setWaypoints(route).route();
            console.log('something');
        });
    });
    return map;
};