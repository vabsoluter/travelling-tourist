function handleMarkerManipulation(marker, map, markerCollection){
    return function(event){
        var type = $(event.target).data('type'),
            index = markerCollection.markers.indexOf(marker);
        marker.closePopup();
        switch(type){
            case 'delete':
                removeMarker(markerCollection, marker, map);
                break;
            case 'start':
                markerCollection.start = index;
                break;
            case 'finish':
                markerCollection.finish = index;
                break;
        }
    };
}

function addMarker(markerCollection, latlng, map){
    var markers = markerCollection.markers,
        marker = L.marker(latlng, {riseOnHover: true});
    markers.push(marker);
    marker
        .addTo(map)
        .bindPopup($('#popup-controls').html())
        .on('click', function(){
            this.openPopup();
        })
        .on('popupopen', function(){
            $('.popup-controls').on('click', '> .ui.button', handleMarkerManipulation(marker, map, markerCollection));
        })
        .on('remove', function(){
            $('.popup-controls').off('click');
        });
}

function removeMarker(markerCollection, marker, map){
    var markers = markerCollection.markers,
        index = markers.indexOf(marker);
    markers.splice(index, 1);
    if(index === markerCollection.start){
        markerCollection.start = null;
    }
    if(index === markerCollection.finish){
        markerCollection.finish = null;
    }
    marker.unbindPopup();
    map.removeLayer(marker);
}

var R = require('ramda');

module.exports = function(id){
    var map = L.map(id, {
            center: [20.52577476373983, -100.81329345703125],
            zoom: 13
        }),
        control = L.Routing.control({
            router: new L.Routing.OSRM({
                serviceUrl: 'http://localhost:5000/viaroute'
            })
        }),
        markerCollection = {
            start: null,
            finish: null,
            markers: []
        };

    control.addTo(map);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);

    map.on('click', function(event){
        addMarker(markerCollection, event.latlng, map);
    });

    $('#control').on('click', '> .ui.button', function(){
        console.log(markerCollection);
        var waypoints = R.map(function(marker){
                var latlng = marker.getLatLng();
                return {
                    lat: latlng.lat,
                    lng: latlng.lng
                };
            }, markerCollection.markers),
            start = markerCollection.start || 0,
            finish = markerCollection.finish || waypoints.length - 1;
        $.ajax({
            url: 'solve',
            data: JSON.stringify({
                waypoints: waypoints,
                start: start,
                finish: finish
            }),
            type: 'POST',
            processData: false,
            contentType: "application/json"
        }).done(function(sequence){
            var route = R.reduce(function(carry, index){
                carry.push(markerCollection.markers[index].getLatLng());
                return carry;
            }, [], sequence);
            control.setWaypoints(route).route();
            console.log(markerCollection);
            markerCollection.markers.forEach(function(marker){
                marker.openPopup();
            });
        });
    });
    return map;
};