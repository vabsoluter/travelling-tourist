var R = require('ramda'),
    moment = require('moment'),
    Mustache = require('mustache'),
    MyFormatter = require('./formatter.js'),
    schedule = require('./scheduler.js'),
    startIcon = L.icon({
        iconUrl: '/public/images/marker-icon-start.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [0, -39]
    }),
    finishIcon = L.icon({
        iconUrl: '/public/images/marker-icon-end.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [0, -39]
    }),
    defaultVisitTime = moment.duration(2, 'hours'),
    validObjects = {
        place_of_worship: moment.duration(2, 'hours'),
        museum: moment.duration(3, 'hours'),
        hospital: moment.duration(1, 'hours'),
        cinema: moment.duration(2, 'hours'),
        theatre: moment.duration(3, 'hours'),
        supermarket: moment.duration(2, 'hours'),
        university: moment.duration(3, 'hours'),
        library: moment.duration(5, 'hours'),
        park: moment.duration(4, 'hours')
    };

function printWaypoints(plan){
    var waypoints = plan.getWaypoints();
    console.log(R.map(function(waypoint){
        return (waypoint.latLng.lat).toFixed(3) + '/' + (waypoint.latLng.lng).toFixed(3);
    }, waypoints).join('--'));
}

function findIndex(latlng, plan){
    return R.findIndex(function(waypoint){
        return waypoint.latLng === latlng;
    }, plan.getWaypoints());
}

function removeWaypoint(marker, plan){
    var latlng = marker.getLatLng(),
        index = findIndex(latlng, plan);
    do{
        plan.spliceWaypoints(index, 1);
        index = findIndex(latlng, plan);
    }while(index > 0);
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
        if(index === 0){
            marker.setIcon(startIcon);
        }else if(index === totalNumber - 1){
            marker.setIcon(finishIcon);
        }
        return marker;
    };
}

function findIndexByCoordinates(visitInfos, lat, lng){
    return R.findIndex(function(visitInfo){
        return visitInfo.waypoint.latLng.lat === lat && visitInfo.waypoint.latLng.lng === lng;
    }, visitInfos);
}

function itemClickHandlerBuilder(map){
    return function(event){
        var item = $(event.target).parents('.item'),
            lat = item.data('lat'),
            lng = item.data('lng');
        map.setView(L.latLng(lat, lng));
    };
}

function printSchedule(visitInfos, startTime, routes, touristType, node){
    var mainRoute = routes[0],
        items = schedule(visitInfos, startTime, mainRoute, touristType);
    node.html(R.map(function(item){
        return Mustache.render($('#visit-sequence-item').html(), item);
    }, items).join(''));
}

module.exports = function(id){
    function getPlan(){
        return plan;
    }

    var map = L.map(id, {
            center: [61.78648678275323, 34.352024495601654],
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
        startTime = null,
        visitInfos = null,
        touristType = 'individual',
        touristTypeCheckboxes = $('.ui.radio.checkbox');

    map.addLayer(plan);
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    map.on('click', function(event){
        addWaypoint(plan, event.latlng);
        console.log(event.latlng);
    });

    searchResults.on('click', '> .item', itemClickHandlerBuilder(map));

    routeItems.on('click', '> .event', function(event){
        var lat = $(this).data('lat'),
            lng = $(this).data('lng');
        if(!R.isNil(startTime) && $(event.target).hasClass('icon')){
            var index = findIndexByCoordinates(visitInfos, lat, lng),
                oldVisitTime = visitInfos[index].visitTime,
                hours = oldVisitTime.hours(),
                minutes = oldVisitTime.minutes();
            $('.visit-time-edit').remove();
            console.log(visitInfos[index]);
            $(this).find('.extra.text').append(Mustache.render($('#visit-time').html(), {
                hours: hours > 0 ? hours : '0',
                minutes: minutes > 0 ? minutes : '00'
            }));
        }else{
            map.setView(L.latLng(lat,lng));
        }
    }).on('click', '.change-visit-time', function(){
        var hoursVal = $(this).parent().find('.hours').find('input').val(),
            minutesVal = $(this).parent().find('.minutes').find('input').val(),
            hours = parseInt(hoursVal, 10) || 0,
            minutes = parseInt(minutesVal, 10) || 0,
            lat = $(this).parents('.event').data('lat'),
            lng = $(this).parents('.event').data('lng'),
            visitInfo = visitInfos[findIndexByCoordinates(visitInfos, lat, lng)];
        visitInfo.visitTime = moment.duration({
            hours: hours,
            minutes: minutes
        });
        control.getRouter().route(plan.getWaypoints(), function(err, routes){
            if(err){
                console.error('can not build route');
                return;
            }
            printSchedule(visitInfos, startTime, routes, touristType, routeItems);
        });
    });

    touristTypeCheckboxes.checkbox({
        onChange: function(){
            var name = $(this).attr('name');
            if($(this).parent().checkbox('is checked')){
                touristType = (name === 'individual-tourist') ? 'individual' : 'grouped';
                var uiRadio = $(this).parent()[0],
                    counterpart = R.compose(
                        R.head,
                        R.reject(function(input){
                            return input === uiRadio;
                        })
                    )(touristTypeCheckboxes.toArray());
                $(counterpart).checkbox('uncheck');
            }
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
                            var geocodeResults = Array.prototype.slice.apply(arguments);
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
                                printSchedule(visitInfos, startTime, routes, touristType, routeItems);
                            }else{
                                routeItems.html(R.map(function(visitInfo){
                                    return Mustache.render($('#visit-sequence-item').html(), {
                                        name: visitInfo.name,
                                        lat: visitInfo.waypoint.latLng.lat,
                                        lng: visitInfo.waypoint.latLng.lng,
                                        timeOfArrival: '-',
                                        editable: false
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