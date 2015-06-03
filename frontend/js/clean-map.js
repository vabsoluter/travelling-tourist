var R = require('ramda'),
    Mustache = require('mustache'),
    MyFormatter = require('./formatter.js'),
    schedule = require('./scheduler.js'),
    defaultVisitTime = 2,
    validObjects = {
        place_of_worship: 2,
        mseum: 3,
        hospital: 1,
        cinema: 2,
        theatre: 3,
        supermarket: 2,
        university: 3,
        library: 5,
        park: 4
    };

function printWaypoints(plan){
    var waypoints = plan.getWaypoints();
    console.log(R.map(function(waypoint){
        return (waypoint.latLng.lat).toFixed(3) + '/' + (waypoint.latLng.lng).toFixed(3);
    }, waypoints).join('--'));
}

function makeSquare(latlng, side){
    var lat = latlng.lat,
        lng = latlng.lng,
        l_lat = lat - side / 2,
        l_lng = lng - side / 2,
        h_lat = lat + side / 2,
        h_lng = lng + side / 2;
    return [l_lat,l_lng,h_lat,h_lng];
}

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
        printWaypoints(plan);
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

function itemClickHandlerBuilder(map){
    return function(event){
        var item = $(event.target).parents('.item'),
            lat = item.data('lat'),
            lng = item.data('lng');
        map.setView(L.latLng(lat, lng));
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
        geocoderControl = new L.Control.Geocoder(),
        searchResults = $('#search-results'),
        routeItems = $('#route'),
        startTime = null;

    map.addLayer(plan);
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    map.on('click', function(event){
        addWaypoint(plan, event.latlng);
    });

    searchResults.on('click', '> .item', itemClickHandlerBuilder(map));
    routeItems.on('click', '> .event', function(event){
        if(!R.isNil(startTime) && $(event.target).hasClass('icon')){
            console.log('edit');
        }else{
            var lat = $(this).data('lat'),
                lng = $(this).data('lng');
            map.setView(L.latLng(lat,lng));
        }
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
            searchResults.html(htmls.join(''));
        });
    });

    $('#datetimepicker').datetimepicker({
        lang: 'ru',
        onChangeDateTime: function(dp, input){
            startTime = dp;
        }
    });

    $('#left-menu').on('click', '> .ui.button', function(){
        if(!R.isNil(control)){
            map.removeControl(control);
        }
        if(plan.isReady()){
            var waypoints = R.map(function(waypoint){
                    return {
                        lat: waypoint.latLng.lat,
                        lng: waypoint.latLng.lng
                    };
                }, plan.getWaypoints()),
                sequencePromise = (plan.getWaypoints().length <= 3) ?
                    R.range(0,plan.getWaypoints().length) :
                    $.ajax({
                        url: 'solve',
                        data: JSON.stringify({
                            waypoints: waypoints
                        }),
                        type: 'POST',
                        processData: false,
                        contentType: "application/json"
                    });
            $.when(sequencePromise).done(function(sequence){
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
                        var promises = R.map(function(waypoint){
                                return $.ajax({
                                    url: 'http://nominatim.openstreetmap.org/reverse/',
                                    data: {
                                        lat: waypoint.latLng.lat,
                                        lon: waypoint.latLng.lng,
                                        format: 'json',
                                        zoom: 18,
                                        addressdetails: 1,
                                        'accept-language': 'ru'
                                    }
                                }).pipe(R.identity);
                            }, plan.getWaypoints());
                        $.when.apply($, promises).done(function(){
                            var geocodeResults = Array.prototype.slice.apply(arguments),
                                mainRoute = routes[0],
                                visitInfos = R.mapIndexed(function(geocodeEntry, index){
                                    var address = R.assoc('latlng', {
                                            lat: geocodeEntry.lat,
                                            lng: geocodeEntry.lon
                                        }, geocodeEntry.address),
                                        type = R.head(R.intersection(R.keys(address), R.keys(validObjects)));
                                    return {
                                        name: geocodeEntry['display_name'],
                                        type: R.defaultTo('default')(type),
                                        waypoint: plan.getWaypoints()[index],
                                        visitTime: R.defaultTo(defaultVisitTime)(validObjects[type])
                                    };
                                }, geocodeResults);
                            if(!R.isNil(startTime)){
                                var items = schedule(visitInfos, startTime, mainRoute);
                                $('#route').html(R.map(function(item){
                                    return Mustache.render($('#visit-sequence-item').html(), item);
                                }, items).join(''));
                            }else{
                                routeItems.html(R.map(function(visitInfo){
                                    return Mustache.render($('#visit-sequence-item').html(), {
                                        name: visitInfo.name,
                                        lat: visitInfo.waypoint.latLng.lat,
                                        lng: visitInfo.waypoint.latLng.lng,
                                        timeOfArrival: '-'
                                    });
                                }, visitInfos).join(''));
                            }
                        });
                    }
                });
                control.addTo(map);
                control.route();
            });
        }
    });
    return map;
};