// CourtFind.js

var markers = null, icon = null;

$(document).ready(function()
{
    // Create map object
    map = new OpenLayers.Map( "map", {
        projection: new OpenLayers.Projection("EPSG:900913"),
        displayProjection: new OpenLayers.Projection("EPSG:4326")
    });
    
    // Create layers
    var layer = new OpenLayers.Layer.OSM("OSM");
    //layer = new OpenLayers.Layer.WMS( "OpenLayers WMS", "http://vmap0.tiles.osgeo.org/wms/vmap0", {layers: 'basic'} );
    
    var courts = new OpenLayers.Layer.WMS( "Court Locations", "http://localhost:8080/geoserver/topp/wms", {
        layers: "topp:MunicipalCourtLocations",
        format: "image/png",
        isBaseLayer: false,
        transparent: true
    });
    
    var boundaries = new OpenLayers.Layer.WMS( "Municipal Boundaries", "http://localhost:8080/geoserver/topp/wms", {
        layers: "topp:boundaries",
        format: "image/png",
        isBaseLayer: false,
        transparent: true
    });
    
    markers = new OpenLayers.Layer.Markers( "Markers" );
    
    var size = new OpenLayers.Size(21, 25);
    var offset = new OpenLayers.Pixel(-(size.w/2), -size.h);
    icon = new OpenLayers.Icon('http://localhost:8080/CourtFind/Resources/marker.png', size, offset);
    
    // Add layers to map
    map.addLayers([ boundaries, courts, layer, markers ]);
    
    // Transform center to OSM coords
    var proj4326 = new OpenLayers.Projection("EPSG:4326");
    var projmerc = new OpenLayers.Projection("EPSG:900913");
    
    // Specify St Louis as map center
    var lonlat = new OpenLayers.LonLat(-90.5978, 38.6272);
    lonlat.transform(proj4326, projmerc);
    
    // Set map center
    map.setCenter(lonlat, 11);

    // Hook up event handlers
    $(window).resize(function() {
        map.updateSize();
    });
    
    // Menu toggle handler
    $("#menu-toggle").click(function(e) {
        e.preventDefault();
        $("#wrapper").toggleClass("toggled");
    });
    
    // List item click and "Back" button handlers
    $(".actionItems").click(function(){
       $("#sidebarList").hide();
       $("#" + $(this).data("reveal")).show();
    });
    
    $(".cancelButtons").click(function(){
       $("#sidebarList").show();
       $("#" + $(this).data("hide")).hide();
       $(this).siblings(".searchSpans").empty();
       $(this).siblings("input").val("");
    });
    
    // List section toggle
    $("#ticketsButton").click(function(){
       $("#ticketsSubList").toggle(); 
    });
    
    $("#courtsButton").click(function(){
       $("#courtsSubList").toggle(); 
    });
    
    $("#communityButton").click(function(){
       $("#communitySubList").toggle(); 
    });
    
    // Find court handlers
    $("#payTickets > #findCourtButton").click(function(){
        queryMapquest($("#payTickets > #geoCodeInput").val(), $("#payTickets"));
    });
    
    $("#lostTicket > #findCourtButton").click(function(){
        $("#lostTicket > .searchSpans").empty();
        queryMapquest($("#lostTicket > #geoCodeInput").val(), $("#lostTicket"));
    });
    
    $("#contestTicket > #findCourtButton").click(function(){
        $("#contestTicket > .searchSpans").empty();
       queryMapquest($("#contestTicket > #geoCodeInput").val(), $("#contestTicket"));
    });
    
    $("#comServEligibility > #findCourtButton").click(function(){
        queryMapquest($("#comServEligibility > #geoCodeInput").val(), $("#comServEligibility"));
    });
    
    $("#comServCredit > #findCourtButton").click(function(){
        queryMapquest($("#comServCredit > #geoCodeInput").val(), $("#comServCredit"));
    });
    
    $("#findWarrants > #findWarrantsButton").click(function(){
       var firstName = $("#findWarrants > #firstNameInput").val();
       var lastName = $("#findWarrants > #lastNameInput").val();
       var dateOfBirth = $("#findWarrants > #dateInput").val();
       var licenseNumber = $("#findWarrants > #licenseInput").val();
       queryWarrantsServlet(firstName, lastName, dateOfBirth, licenseNumber, $("#findWarrants"));
    });
    
    $("#findCourtDates > #findCourtDatesButton").click(function(){
       var firstName = $("#findCourtDates > #firstNameInput").val();
       var lastName = $("#findCourtDates > #lastNameInput").val();
       var dateOfBirth = $("#findCourtDates > #dateInput").val();
       var licenseNumber = $("#findCourtDates > #licenseInput").val();
       queryCourtDatesServlet(firstName, lastName, dateOfBirth, licenseNumber, $("#findCourtDates"));
    });
    
    $("#findCourtLocation > #findCourtButton").click(function(){
        $("#findCourtLocation > .searchSpans").empty();
       queryMapquest($("#findCourtLocation > #geoCodeInput").val(), $("#findCourtLocation"));
    });
});

function queryMapquest(str, parentObj)
{
    // Make sure location text is valid
    if (str.length <= 0) {
        return;
    }
    
    // Set root URL of Mapquest service
    var URL = "http://open.mapquestapi.com/nominatim/v1/search.php";
    
    // Fire off the request
    $.ajax({
        url: URL,
        method: "GET",
        data: {
            format: "json",
            q: str,
            addressdetails: 1,
            limit: 5
        },
        success: function(data) {
            processMapquestResponse(data, parentObj);
        }
    });
}

function processMapquestResponse(data, parentObject)
{
    // Get the HTML element to set
    var choicesSpan = $(parentObject).children(".searchSpans");
    
    // Empty previous contents
    choicesSpan.empty();
    choicesSpan.append("<h3>LOCATIONS</h3>");
    
    // data present
    if (data.length != 0){  
        // Iterate through mapquest JSON
        for (var i = 0; i < data.length; i++)
        {
            // Create span
            var choiceSpan = $("<a class'choicesLinks' data-index='" + i + "'/>").text(data[i].display_name);
            // Hook up span click event
            choiceSpan.click(function(){
                queryGeoserverBoundaries(data[$(this).data("index")], parentObject);
                choicesSpan.hide();
            });

            // Append span to HTML element
            choicesSpan.append(choiceSpan);
            choicesSpan.append("<br /><br />");
        }
    }
    else {
        //no locations found
        var choiceSpan = $("<label />").text("No municipal data found.");
        choicesSpan.append(choiceSpan);
    }
    
    // Show/Hide elements
    $(parentObject).children(".municipalityInfo").hide();
    choicesSpan.show();
}

function queryGeoserverBoundaries(data, parentObject)
{
    // Build lon/lat string
    var coords = data.lon + "," + data.lat;
    
    // Build XML WFS request
    var str = '<wfs:GetFeature service="WFS" version="1.0.0" outputFormat="json" ' +
            'xmlns:topp="http://www.openplans.org/topp" ' +
            'xmlns:wfs="http://www.opengis.net/wfs" ' +
            'xmlns="http://www.opengis.net/ogc" ' +
            'xmlns:gml="http://www.opengis.net/gml" ' +
            'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
            'xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.0.0/WFS-basic.xsd"> ' +
            '<wfs:Query typeName="topp:boundaries"> ' +
                '<Filter>' +
                    '<Intersects>' +
                        '<PropertyName>the_geom</PropertyName>' +
                        '<gml:Point srsName="http://www.opengis.net/gml/srs/epsg.xml#4326">' +
                            //'<gml:coordinates>-90.36391306,38.82312048</gml:coordinates>' +
                            '<gml:coordinates>' + coords + '</gml:coordinates>' +
                        '</gml:Point>' +
                    '</Intersects>' +
                '</Filter>' +
            '</wfs:Query>' +
        '</wfs:GetFeature>';

    // Set geoserver URL
    var URL = "http://localhost:8080/geoserver/topp/wfs";

    // POST the request to Geoserver
    var request = new OpenLayers.Request.POST({
        url: URL,
        data: str,
        headers: {
            "Content-Type": "text/xml;charset=utf-8"
        },
        callback: function(response) {
            // Process JSON response
            processGeoserverBoundaries(response.responseText, parentObject);
        },
        failure: function (response) {
            alert("Something went wrong in the request");
        }
    });
}

function processGeoserverBoundaries(data, parentObject)
{
    // Make sure data object contains data
    if ((data == null) || (data.length <= 0)) {
        return;
    }
    
    // Convert data to JSON
    var obj = JSON.parse(data);
    
    // Create error text if JSON contains no features
    if (obj.features.length <= 0) {
        alert("Location is outside of the greater St. Louis area");
    }
    
    // Extract Municipality name from feature data
    var name = obj.features[0].properties.MUNICIPALI;
    
    // Query the database for Municipality data
    
    queryGeoserverCourts(name, parentObject);
}

function queryGeoserverCourts(name, parentObject)
{
    // Build OGC filter
    var filter = '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">' +
            '<ogc:PropertyIsEqualTo matchCase="false"><ogc:PropertyName>topp:Municipali</ogc:PropertyName>' +
            '<ogc:Literal>' + name + '</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>';
    
    // Build final URL
    var URL = "http://localhost:8080/geoserver/topp/wfs?request=GetFeature&version=1.0.0&typeName=topp:MunicipalCourtLocations&outputformat=json&filter=" + filter;
    
    // Fire off the request
    $.ajax({
        url: URL,
        method: "GET",
        success: function(data) {
            processCourtsData(data, parentObject);
        }
    });
}

function processCourtsData(data, parentObject)
{
    var feature = data.features[0];
    var props = feature.properties;
    
    // Get point coords
    var coords = feature.geometry.coordinates;

    // Transform coords
    var lonlat = new OpenLayers.LonLat(coords[0], coords[1]);
    
    var proj4326 = new OpenLayers.Projection("EPSG:4326");
    var projmerc = new OpenLayers.Projection("EPSG:900913");
    
    lonlat.transform(proj4326, projmerc);
    // Set HTML contents
    //parentObject.children("#searchResults").empty().append("<header>" + props.Municipali + " Court</header><br /><label>Want to pay in person?<br/>Here's the address:<br/><br/>" + props.Municipali + "<br/>" + props.Address + "</label><br /><label>" + props.City + ", " + props.State + " " + props.Zip_Code + "</label>");
    var tempTitle = parentObject.find(".municipalityLabel, .municipalityTitle");
    tempTitle.html(props.Municipali);
    parentObject.find(".municipalityFullAddress").html(props.Municipali + "<br/>" +props.Address + "<br/>" + props.City + ", " + props.State + " " + props.Zip_Code);
    
    // Set marker on map
    markers.addMarker(new OpenLayers.Marker(lonlat, icon));
    // Set map center
    map.setCenter(lonlat);
    
    queryMunicipalServlet(props.Municipali, parentObject);
}

function queryMunicipalServlet(name, parentObject)
{
    // Make sure municipality name is valid
    if (name.length <= 0) {
        return;
    }
    
    // Build URL of servlet
    var URL = "http://localhost:8080/CourtFind/Query?action=getcourt&muni=" + name;
    
    // Fire off servlet request
    $.ajax({
        url: URL,
        method: "GET",
        success: function(data) {
            //parentObject.children("#searchResults").append("<br /><br/><label>Want to pay online?<br/>Go here:<br/></label><br/><a href='window.open(" + data.municipalCourtWebsite + ");'>" + data.municipalCourtWebsite + "</a><label><br/><br/>And of course... don't forget a valid form of payment!</label>");
            parentObject.find(".municipalWebsite").html(data[0].municipalCourtWebsite).attr('onclick', "window.open('"+data[0].municipalCourtWebsite+"');");
            parentObject.children(".municipalityInfo").show();
        }
    });
}

function queryWarrantsServlet(firstName, lastName, dateOfBirth, licenseNumber, parentObject)
{
    // Make sure municipality name is valid
    if (firstName.length <= 0 && lastName.length <= 0 && dateOfBirth.length <= 0 && licenseNumber.length <= 0) {
        return;
    }
    
    // Build URL of servlet
    var URL = "http://localhost:8080/CourtFind/Query?action=getwarrants&first=" + firstName + "&last=" + lastName + "&birthDate=" + dateOfBirth + "&licenseNumber=" + licenseNumber;
    
    // Fire off servlet request
    $.ajax({
        url: URL,
        method: "GET",
        success: function(data) {
            $(data).each(function(index, value){
                if (typeof value.warrant_number !== typeof undefined && value.warrant_number !== false) {
                    $(parentObject).children(".searchSpans").show().children("#hasWarrant").append("Court Location: <label>" + value.court_location + "</label><br/>Court Address: <label>" + value.court_address + "</label><br/>Warrant Number: <label>" + value.warrant_number + "</label><br/>Status: <label>" + value.status + "</label><br/><br/>");
                }else{
                    $(parentObject).children(".searchSpans").show().children("#hasViolation").append("Court Location: <label>" + value.court_location + "</label><br/>Court Address: <label>" + value.court_address + "</label><br/>Status: <label>" + value.status + "</label><br/><br/>");
                }
            });
        }
    });
}

function queryCourtDatesServlet(firstName, lastName, dateOfBirth, licenseNumber, parentObject)
{
    // Make sure municipality name is valid
    if (firstName.length <= 0 && lastName.length <= 0 && dateOfBirth.length <= 0 && licenseNumber.length <= 0) {
        return;
    }
    
    // Build URL of servlet
    var URL = "http://localhost:8080/CourtFind/Query?action=getCourtDates&first=" + firstName + "&last=" + lastName + "&birthDate=" + dateOfBirth + "&licenseNumber=" + licenseNumber;
    
    // Fire off servlet request
    $.ajax({
        url: URL,
        method: "GET",
        success: function(data) {
            $(data).each(function(index, value){
                    $(parentObject).children(".searchSpans").show().append("Court Location: <label>" + value.court_location + "</label><br/>Court Address: <label>" + value.court_address + "</label><br/>Citation Number: <label>" + value.citation_number + "</label><br/>Court Date: <label>" + value.court_date + "</label><br/><br/>");
            });
        }
    });
}