<?php
// Start output buffering om te voorkomen dat whitespace/errors JSON verstoren
ob_start();

// CORS headers + preflight-afhandeling (moet VOOR alle output)
require_once __DIR__ . '/../config/cors.php';

// Foutlogging voor development
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    // Gebruik ID477272_ftpwm database (niet concertdb - geen toegang!)
    // Gebruik __DIR__ voor absoluut pad om problemen met relatieve paden te voorkomen
    $configPath = __DIR__ . '/../config/database.php';
    
    if (!file_exists($configPath)) {
        throw new Exception("Database config bestand niet gevonden: " . $configPath);
    }
    
    include_once $configPath;

    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connectie mislukt");
    }

    // Haal het HTTP method op
    $method = $_SERVER['REQUEST_METHOD'];
    
    // Haal ID op uit query parameter of URL path
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;

    switch ($method) {
        case 'GET':
            if ($id) {
                // GET één concert op basis van ID
                $query = "SELECT * FROM concerts WHERE `id` = :id LIMIT 1";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
                $stmt->execute();
                
                $concert = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($concert) {
                    echo json_encode($concert);
                } else {
                    http_response_code(404);
                    echo json_encode(array(
                        "message" => "Concert niet gevonden",
                        "id" => $id
                    ));
                }
            } else {
                // GET alle concerten
                // Gebruik backticks voor 'time' omdat het een gereserveerd woord is in MySQL
                $query = "SELECT * FROM concerts ORDER BY `date` ASC, `time` ASC";
                $stmt = $db->prepare($query);
                $stmt->execute();

                $concerten = array();
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $concerten[] = $row;
                }

                // Voor backward compatibility: retourneer direct array
                echo json_encode($concerten);
            }
            break;

        case 'POST':
            // POST - Nieuw concert toevoegen
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Valideer verplichte velden
            if (!isset($data['artist']) || empty(trim($data['artist']))) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "Artist naam is verplicht"
                ));
                exit();
            }
            
            if (!isset($data['date']) || empty($data['date'])) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "Datum is verplicht"
                ));
                exit();
            }

            $query = "INSERT INTO concerts (`artist`, `date`, `time`, `venue`, `price`) 
                     VALUES (:artist, :date, :time, :venue, :price)";
            
            $stmt = $db->prepare($query);
            
            $artist = trim($data['artist']);
            $date = $data['date'];
            $time = isset($data['time']) ? $data['time'] : (isset($data['uur']) ? $data['uur'] : null);
            $venue = isset($data['venue']) ? trim($data['venue']) : (isset($data['location']) ? trim($data['location']) : null);
            $price = isset($data['price']) && $data['price'] !== '' ? floatval($data['price']) : null;

            $stmt->bindParam(':artist', $artist);
            $stmt->bindParam(':date', $date);
            $stmt->bindParam(':time', $time);
            $stmt->bindParam(':venue', $venue);
            $stmt->bindParam(':price', $price);

            if ($stmt->execute()) {
                $newId = $db->lastInsertId();
                http_response_code(201);
                echo json_encode(array(
                    "message" => "Concert succesvol toegevoegd",
                    "id" => $newId,
                    "success" => true
                ));
            } else {
                http_response_code(500);
                echo json_encode(array(
                    "message" => "Fout bij toevoegen concert"
                ));
            }
            break;

        case 'PUT':
            // PUT - Concert updaten
            if (!$id) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "ID is verplicht voor update"
                ));
                exit();
            }

            $data = json_decode(file_get_contents("php://input"), true);
            
            if (!isset($data['artist']) || empty(trim($data['artist']))) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "Artist naam is verplicht"
                ));
                exit();
            }
            
            if (!isset($data['date']) || empty($data['date'])) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "Datum is verplicht"
                ));
                exit();
            }

            // Check eerst of concert bestaat
            $checkQuery = "SELECT `id` FROM concerts WHERE `id` = :id";
            $checkStmt = $db->prepare($checkQuery);
            $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $checkStmt->execute();
            
            if (!$checkStmt->fetch()) {
                http_response_code(404);
                echo json_encode(array(
                    "message" => "Concert niet gevonden",
                    "id" => $id
                ));
                exit();
            }

            $query = "UPDATE concerts 
                     SET `artist` = :artist, 
                         `date` = :date, 
                         `time` = :time, 
                         `venue` = :venue, 
                         `price` = :price 
                     WHERE `id` = :id";
            
            $stmt = $db->prepare($query);
            
            $artist = trim($data['artist']);
            $date = $data['date'];
            $time = isset($data['time']) ? $data['time'] : (isset($data['uur']) ? $data['uur'] : null);
            $venue = isset($data['venue']) ? trim($data['venue']) : (isset($data['location']) ? trim($data['location']) : null);
            $price = isset($data['price']) && $data['price'] !== '' ? floatval($data['price']) : null;

            $stmt->bindParam(':artist', $artist);
            $stmt->bindParam(':date', $date);
            $stmt->bindParam(':time', $time);
            $stmt->bindParam(':venue', $venue);
            $stmt->bindParam(':price', $price);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);

            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(array(
                    "message" => "Concert succesvol bijgewerkt",
                    "id" => $id,
                    "success" => true
                ));
            } else {
                http_response_code(500);
                echo json_encode(array(
                    "message" => "Fout bij bijwerken concert"
                ));
            }
            break;

        case 'DELETE':
            // DELETE - Concert verwijderen
            if (!$id) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "ID is verplicht voor verwijderen"
                ));
                exit();
            }

            // Check eerst of concert bestaat
            $checkQuery = "SELECT `id` FROM concerts WHERE `id` = :id";
            $checkStmt = $db->prepare($checkQuery);
            $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $checkStmt->execute();
            
            if (!$checkStmt->fetch()) {
                http_response_code(404);
                echo json_encode(array(
                    "message" => "Concert niet gevonden",
                    "id" => $id
                ));
                exit();
            }

            $query = "DELETE FROM concerts WHERE `id` = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);

            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(array(
                    "message" => "Concert succesvol verwijderd",
                    "id" => $id,
                    "success" => true
                ));
            } else {
                http_response_code(500);
                echo json_encode(array(
                    "message" => "Fout bij verwijderen concert"
                ));
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(array(
                "message" => "Method not allowed",
                "allowed_methods" => "GET, POST, PUT, DELETE"
            ));
            break;
    }
    
} catch (PDOException $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(array(
        "message" => "Database error",
        "error" => $e->getMessage(),
        "file" => basename(__FILE__),
        "line" => $e->getLine() ?? 'unknown',
        "sql_state" => $e->getCode()
    ));
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(array(
        "message" => "Server error",
        "error" => $e->getMessage()
    ));
}
ob_end_flush();
?>