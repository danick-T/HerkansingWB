<?php
/**
 * Gedeelde CORS-configuratie voor alle endpoints.
 *
 * Include dit als eerste in elk endpoint:
 *     require_once __DIR__ . '/../config/cors.php';
 *
 * Dit bestand doet twee dingen:
 *  1. Het stuurt de CORS-headers zodat browser-JavaScript van een andere
 *     origin het antwoord mag uitlezen.
 *  2. Het handelt de preflight (OPTIONS) af en stopt daar meteen, zodat de
 *     endpoint zelf die request niet als een gewone call hoeft te behandelen.
 *
 * LET OP: CORS is geen beveiliging. curl, Postman en scripts negeren het
 * volledig. Het versoepelt alleen de Same-Origin Policy van de browser.
 */

// Wil je later alleen je eigen frontend toelaten, pas dan enkel deze regel aan
// (bijv. "https://jouw-frontend.be"). Dit is de enige plek waar dat hoeft.
$allowedOrigin = "*";

header("Access-Control-Allow-Origin: " . $allowedOrigin);
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Preflight: browser vraagt vooraf toestemming voor PUT/DELETE/JSON-POST.
// Antwoord met een lege 200 en stop; de headers hierboven zijn het antwoord.
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    // Endpoints starten een output buffer, de losse testbestanden niet.
    // Deze check maakt het bestand in beide gevallen bruikbaar.
    if (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code(200);
    exit();
}
