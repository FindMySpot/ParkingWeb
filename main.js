mapboxgl.accessToken = 'pk.eyJ1IjoibWh1dHRpMSIsImEiOiJjam92aGF2dnkwZDM4M2tyejRsMGZ2ZnB1In0.NQeoVMY8P8v9rY_ohsUmIg';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v9',
    zoom: 7,
    center: [8.1336, 46.604]
});

var lat = 0;
var lon = 0;
var query = '';
var park_marker = null;
var park_marker_popup = null;

function getLocationCoordinates() {
    if (lat !== 0) {
        return new Promise(resolve => resolve([lat, lon]))
    }
    return new Promise(resolve => navigator.geolocation.getCurrentPosition(function(location) {
        resolve([location.coords.latitude, location.coords.longitude]);
    }));
};

function getRoute(lat, lon, query) {
    var url = "http://23.97.154.233:8080/get-possible-routes/v1/lat/"+lat+"/lon/"+lon+"/destination/"+query
    return fetch(url);
};



function addRouteToMap() {
    map.addSource('route', {
        type: 'geojson',
        data: 'http://23.97.154.233:8080/route/start/tiefenbrunnen/end/laus'
    });

    map.addLayer({
        "id": "route-line",
        "type": "line",
        "source": "route",
        "paint": {
            "line-width": 6,
            "line-color": "#23202A"
        },
        "filter": ["==", "$type", "LineString"],
    });
};

document.getElementById('searchbar').onkeydown = async function(event) {
    // 13 is for Enter
    if (event.keyCode == 13) {
        query = document.getElementById('searchbar').value;

        try {
            map.removeLayer("route-line");
            map.removeSource('route');
        }
        catch(err) {
            console.log("WARNING Can't delete inexistent resource.");
        }

        try {
            map.removeLayer("driving-route-line");
            map.removeSource('driving-route');
        }
        catch(err) {
            console.log("WARNING Can't delete inexistent resource.");
        }

        if (park_marker !== null) {
            park_marker.remove();
            park_marker_popup.remove();
        }
        
        var coordinates = await getLocationCoordinates();

        var geoData = await getRoute(coordinates[0], coordinates[1], query);
        var routes = await geoData.json();
        var park = routes[0]['car_route']['station'];

        map.setCenter([coordinates[1], coordinates[0]]);
        map.setZoom(11);

        park_marker_popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true
        });

        park_marker_popup.setLngLat(park['geometry']['coordinates'])
            .setHTML("<b>" + park["station_name"] + "</b><br /><span>Total Spaces: " + park["properties"]["Number_parking_spaces"] + "</span>")
            .addTo(map);

        park_marker = new mapboxgl.Marker({color: "red"})
            .setLngLat(park['geometry']['coordinates'])
            .addTo(map);

        var driving_route = {
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                properties: {},
                geometry: {
                    type: "LineString",
                    coordinates: [
                        park['geometry']['coordinates'],
                        [coordinates[1], coordinates[0]]
                    ]
                }
            }]
        }
    
        map.addSource('driving-route', {
            type: 'geojson',
            data: driving_route
        });
    
        map.addLayer({
            "id": "driving-route-line",
            "type": "line",
            "source": "driving-route",
            "paint": {
                "line-width": 3,
                "line-color": "#23202A",
                "line-dasharray": [0.2, 2]
            },
            "filter": ["==", "$type", "LineString"],
        });

        map.addSource('route', {
            type: 'geojson',
            data: routes[0]['train_route']['geo_dict']
        });
    
        map.addLayer({
            "id": "route-line",
            "type": "line",
            "source": "route",
            "paint": {
                "line-width": 6,
                "line-color": "#23202A"
            },
            "filter": ["==", "$type", "LineString"],
        });

        // Geographic coordinates of the LineString
        var coordinates = driving_route.features[0].geometry.coordinates;

        // Pass the first coordinates in the LineString to `lngLatBounds` &
        // wrap each coordinate pair in `extend` to include them in the bounds
        // result. A variation of this technique could be applied to zooming
        // to the bounds of multiple Points or Polygon geomteries - it just
        // requires wrapping all the coordinates with the extend method.
        var bounds = coordinates.reduce(function(bounds, coord) {
            return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        map.fitBounds(bounds, {
            padding: 40
        });
    
        map.removeLayer("station-dots");
    }
};

map.on('load', async function () {
    map.addSource('stations', {
        type: 'geojson',
        data: 'http://23.97.154.233:8080/geo/stations'
    });

    map.addLayer({
        "id": "station-dots",
        "type": "circle",
        "source": "stations",
        "paint": {
            "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "Number_parking_spaces"],
                1, "#B42222",
                10, "#EC8F4F",
                50, "#F6B243",
                100, "#9F9437"
            ],
            "circle-radius": 6
        },
        "filter": ["==", "$type", "Point"],
    });

    // Create a popup, but don't add it to the map yet.
    var popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    map.on('mouseenter', 'station-dots', function (e) {
        // Change the cursor style as a UI indicator.
        map.getCanvas().style.cursor = 'pointer';

        var coordinates = e.features[0].geometry.coordinates.slice();
        var description = e.features[0].properties.Name;
        var totalSpaces = e.features[0].properties.Number_parking_spaces;
        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        // Populate the popup and set its coordinates
        // based on the feature found.
        popup.setLngLat(coordinates)
            .setHTML("<b>" + description + "</b><br /><span>Total Spaces: " + totalSpaces + "</span>")
            .addTo(map);
    });

    map.on('mouseleave', 'station-dots', function () {
        map.getCanvas().style.cursor = '';
        popup.remove();
    });

    var coordinates = await getLocationCoordinates();
    lat = coordinates[0];
    lon = coordinates[1];

    map.setCenter([coordinates[1], coordinates[0]]);
    map.setZoom(11);

    new mapboxgl.Marker()
    .setLngLat([coordinates[1], coordinates[0]])
    .addTo(map);

});