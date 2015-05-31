var R = require('ramda'),
    Mustache = require('mustache'),
    MyFormatter = require('./formatter.js'),
    schedule = require('./scheduler.js');

function findIndex(latlng, plan){
    return R.findIndex(function(waypoint){
        return waypoint.latLng === latlng;
    }, plan.getWaypoints());
}

function removeWaypoint(marker, plan){
    var latlng = marker.getLatLng(),
        index = findIndex(latlng, plan);
    plan.spliceWaypoints(index, 1);
}

function markAsStart(marker, plan){
    var latlng = marker.getLatLng(),
        index = findIndex(latlng, plan),
        waypoint = plan.getWaypoints()[index];
    if(index !== plan.getWaypoints().length - 1){
        removeWaypoint(marker, plan);
    }
    plan.spliceWaypoints(0, 0, waypoint);
}

function markAsFinish(marker, plan){
    var latlng = marker.getLatLng(),
        index = findIndex(latlng, plan),
        waypoint = plan.getWaypoints()[index];
    if(index !== 0){
        removeWaypoint(marker, plan);
    }
    plan.spliceWaypoints(plan.getWaypoints().length, 0, waypoint);
}

function handleMarkerManipulation(marker, plan){
    return function(event){
        var type = $(event.target).data('type');
        switch(type){
            case 'delete':
                removeWaypoint(marker, plan);
                break;
            case 'start':
                markAsStart(marker, plan);
                break;
            case 'finish':
                markAsFinish(marker, plan);
                break;
            default:
                return;
        }
    };
}

function addWaypoint(plan, latlng){
    var waypoints = plan.getWaypoints(),
        waypoint = new L.Routing.Waypoint(latlng);
    if(R.isNil(waypoints[0].latLng)){
        return plan.spliceWaypoints(0, 1, waypoint);
    }else if(R.isNil(waypoints[1].latLng)){
        return plan.spliceWaypoints(1, 1, waypoint);
    }
    return plan.spliceWaypoints(waypoints.length, 0, waypoint);
}

function getMarkerGenerator(getPlan){
    return function(index, waypoint, totalNumber){
        var marker = L.marker(waypoint.latLng);
        marker
            .bindPopup($('#popup-controls').html())
            .on('popupopen', function(){
                $('.popup-controls').on('click', '> .ui.button', handleMarkerManipulation(marker, getPlan()));
            })
            .on('remove', function(){
                $('.popup-controls').off('click');
            });
        return marker;
    };
}

module.exports = function(id){
    function getPlan(){
        return plan;
    }

    var map = L.map(id, {
            center: [20.52577476373983, -100.81329345703125],
            zoom: 13
        }),
        formatter = new MyFormatter(),
        plan = L.Routing.plan([],{
            draggableWaypoints: false,
            createMarker: getMarkerGenerator(getPlan)
        }),
        control = null,
        geocoderControl = new L.Control.Geocoder();

    map.addLayer(plan);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);

    map.on('click', function(event){
        addWaypoint(plan, event.latlng);
    });

    $('#reverse-geocode').click(function(){
        var destination = $(this).parent().find('input').val(),
            geocoder = geocoderControl.options.geocoder;
        geocoder.geocode(destination, function(locations){
            var htmls = R.map(function(location){
                return Mustache.render($('#search-item').html(), {
                    name: location.name,
                    lat: location.center.lat,
                    lng: location.center.lng
                });
            }, locations);
            $('#search-results').html(htmls.join('')).on('click', '> .item', function(event){
                var item = $(event.target).parents('.item'),
                    lat = item.data('lat'),
                    lng = item.data('lng');
                map.setView(L.latLng(lat, lng));
            });
        });
    });

    $('#left-menu').on('click', '> .ui.button', function(){
        if(!R.isNil(control)){
            map.removeControl(control);
        }
        if(plan.isReady()){
            if(plan.getWaypoints().length <= 3){
                control = L.Routing.control({
                    plan: plan,
                    autoRoute: false,
                    router: new L.Routing.OSRM({
                        serviceUrl: 'http://localhost:5000/viaroute'
                    }),
                    formatter: formatter
                });
                control.addTo(map);
                control.route();
            }else{
                var waypoints = R.map(function(waypoint){
                    return {
                        lat: waypoint.latLng.lat,
                        lng: waypoint.latLng.lng
                    };
                }, plan.getWaypoints());
                $.ajax({
                    url: 'solve',
                    data: JSON.stringify({
                        waypoints: waypoints
                    }),
                    type: 'POST',
                    processData: false,
                    contentType: "application/json"
                }).done(function(sequence){
                    var oldWaypoints = plan.getWaypoints(),
                        newWaypoints = R.map(function(index){
                            return oldWaypoints[index];
                        }, sequence);
                    plan.setWaypoints(newWaypoints);
                    control = L.Routing.control({
                        plan: plan,
                        autoRoute: false,
                        lineOptions: {
                            addWaypoints: false
                        },
                        router: new L.Routing.OSRM({
                            serviceUrl: 'http://localhost:5000/viaroute'
                        }),
                        formatter: formatter
                    });
                    control.getRouter().route(plan.getWaypoints(), function(err, routes){
                        if(err){
                            console.error('can not make the route');
                        }else{
                            //schedule(routes[0], new Date());
                            R.forEach(function(waypoint){
                                geocoderControl.options.geocoder.reverse(waypoint.latLng, function(){

                                });
                            }, routes[0].inputWaypoints);
                        }
                    });
                    control.addTo(map);
                    control.route();
                });
            }
        }
    });
    return map;
};