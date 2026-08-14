<?php
// Start output buffering om te voorkomen dat whitespace/errors JSON verstoren
ob_start();

// CORS headers + preflight-afhandeling (moet VOOR alle output)
require_once __DIR__ . '/../config/cors.php';

ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    // Gebruik ID477272_ftpwm database (niet concertdb - geen toegang!)
    // Gebruik __DIR__ voor absoluut pad
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

    $method = $_SERVER['REQUEST_METHOD'];
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;

    switch ($method) {
        case 'GET':
            if ($id) {
                // GET één bezoeker
                $query = "SELECT * FROM visitors WHERE id = :id LIMIT 1";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
                $stmt->execute();
                
                $visitor = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($visitor) {
                    echo json_encode($visitor);
                } else {
                    http_response_code(404);
                    echo json_encode(array(
                        "message" => "Bezoeker niet gevonden",
                        "id" => $id
                    ));
                }
            } else {
                // GET alle bezoekers
                $query = "SELECT * FROM visitors ORDER BY last_name ASC, first_name ASC";
                $stmt = $db->prepare($query);
                $stmt->execute();

                $visitors = array();
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $visitors[] = $row;
                }

                echo json_encode($visitors);
            }
            break;

        case 'POST':
            // POST - Nieuwe bezoeker toevoegen
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Valideer verplichte velden
            if (!isset($data['first_name']) || empty(trim($data['first_name']))) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "Voornaam is verplicht"
                ));
                exit();
            }
            
            if (!isset($data['last_name']) || empty(trim($data['last_name']))) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "Achternaam is verplicht"
                ));
                exit();
            }

            if (!isset($data['email']) || empty(trim($data['email'])) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "Geldig e-mailadres is verplicht"
                ));
                exit();
            }

            $query = "INSERT INTO visitors (first_name, last_name, birth_date, email) 
                     VALUES (:first_name, :last_name, :birth_date, :email)";
            
            $stmt = $db->prepare($query);
            
            $first_name = trim($data['first_name']);
            $last_name = trim($data['last_name']);
            $birth_date = isset($data['birth_date']) && !empty($data['birth_date']) ? $data['birth_date'] : null;
            $email = trim(strtolower($data['email']));

            $stmt->bindParam(':first_name', $first_name);
            $stmt->bindParam(':last_name', $last_name);
            $stmt->bindParam(':birth_date', $birth_date);
            $stmt->bindParam(':email', $email);

            if ($stmt->execute()) {
                $newId = $db->lastInsertId();
                http_response_code(201);
                echo json_encode(array(
                    "message" => "Bezoeker succesvol toegevoegd",
                    "id" => $newId,
                    "success" => true
                ));
            } else {
                http_response_code(500);
                echo json_encode(array(
                    "message" => "Fout bij toevoegen bezoeker"
                ));
            }
            break;

        case 'PUT':
            // PUT - Bezoeker updaten
            if (!$id) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "ID is verplicht voor update"
                ));
                exit();
            }

            $data = json_decode(file_get_contents("php://input"), true);
            
            if (!isset($data['first_name']) || empty(trim($data['first_name']))) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "Voornaam is verplicht"
                ));
                exit();
            }
            
            if (!isset($data['last_name']) || empty(trim($data['last_name']))) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "Achternaam is verplicht"
                ));
                exit();
            }

            if (!isset($data['email']) || empty(trim($data['email'])) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "Geldig e-mailadres is verplicht"
                ));
                exit();
            }

            // Check eerst of bezoeker bestaat
            $checkQuery = "SELECT id FROM visitors WHERE id = :id";
            $checkStmt = $db->prepare($checkQuery);
            $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $checkStmt->execute();
            
            if (!$checkStmt->fetch()) {
                http_response_code(404);
                echo json_encode(array(
                    "message" => "Bezoeker niet gevonden",
                    "id" => $id
                ));
                exit();
            }

            $query = "UPDATE visitors 
                     SET first_name = :first_name, 
                         last_name = :last_name, 
                         birth_date = :birth_date, 
                         email = :email 
                     WHERE id = :id";
            
            $stmt = $db->prepare($query);
            
            $first_name = trim($data['first_name']);
            $last_name = trim($data['last_name']);
            $birth_date = isset($data['birth_date']) && !empty($data['birth_date']) ? $data['birth_date'] : null;
            $email = trim(strtolower($data['email']));

            $stmt->bindParam(':first_name', $first_name);
            $stmt->bindParam(':last_name', $last_name);
            $stmt->bindParam(':birth_date', $birth_date);
            $stmt->bindParam(':email', $email);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);

            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(array(
                    "message" => "Bezoeker succesvol bijgewerkt",
                    "id" => $id,
                    "success" => true
                ));
            } else {
                http_response_code(500);
                echo json_encode(array(
                    "message" => "Fout bij bijwerken bezoeker"
                ));
            }
            break;

        case 'DELETE':
            // DELETE - Bezoeker verwijderen
            if (!$id) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "ID is verplicht voor verwijderen"
                ));
                exit();
            }

            // Check eerst of bezoeker bestaat
            $checkQuery = "SELECT id FROM visitors WHERE id = :id";
            $checkStmt = $db->prepare($checkQuery);
            $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $checkStmt->execute();
            
            if (!$checkStmt->fetch()) {
                http_response_code(404);
                echo json_encode(array(
                    "message" => "Bezoeker niet gevonden",
                    "id" => $id
                ));
                exit();
            }

            // Verwijder eerst gerelateerde tickets
            $deleteTicketsQuery = "DELETE FROM concert_visitors WHERE visitor_id = :visitor_id";
            $deleteTicketsStmt = $db->prepare($deleteTicketsQuery);
            $deleteTicketsStmt->bindParam(':visitor_id', $id, PDO::PARAM_INT);
            $deleteTicketsStmt->execute();

            // Verwijder daarna de bezoeker
            $query = "DELETE FROM visitors WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);

            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(array(
                    "message" => "Bezoeker en gerelateerde tickets succesvol verwijderd",
                    "id" => $id,
                    "success" => true
                ));
            } else {
                http_response_code(500);
                echo json_encode(array(
                    "message" => "Fout bij verwijderen bezoeker"
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
    http_response_code(500);
    echo json_encode(array(
        "message" => "Database error",
        "error" => $e->getMessage()
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

