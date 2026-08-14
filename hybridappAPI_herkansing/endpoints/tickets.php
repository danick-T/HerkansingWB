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
    $concert_id = isset($_GET['concert_id']) ? intval($_GET['concert_id']) : null;
    $visitor_id = isset($_GET['visitor_id']) ? intval($_GET['visitor_id']) : null;

    switch ($method) {
        case 'GET':
            if ($id) {
                // GET één ticket transactie
                $query = "SELECT cv.*, 
                                c.artist, c.date, c.time, c.venue, c.price,
                                v.first_name, v.last_name, v.email
                         FROM concert_visitors cv
                         LEFT JOIN concerts c ON cv.concert_id = c.id
                         LEFT JOIN visitors v ON cv.visitor_id = v.id
                         WHERE cv.id = :id LIMIT 1";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
                $stmt->execute();
                
                $ticket = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($ticket) {
                    echo json_encode($ticket);
                } else {
                    http_response_code(404);
                    echo json_encode(array(
                        "message" => "Ticket niet gevonden",
                        "id" => $id
                    ));
                }
            } else if ($concert_id) {
                // GET alle tickets voor een specifiek concert
                $query = "SELECT cv.*, 
                                v.first_name, v.last_name, v.email
                         FROM concert_visitors cv
                         LEFT JOIN visitors v ON cv.visitor_id = v.id
                         WHERE cv.concert_id = :concert_id
                         ORDER BY cv.purchase_date DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':concert_id', $concert_id, PDO::PARAM_INT);
                $stmt->execute();

                $tickets = array();
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $tickets[] = $row;
                }

                echo json_encode($tickets);
            } else if ($visitor_id) {
                // GET alle tickets voor een specifieke bezoeker
                $query = "SELECT cv.*, 
                                c.artist, c.date, c.time, c.venue, c.price
                         FROM concert_visitors cv
                         LEFT JOIN concerts c ON cv.concert_id = c.id
                         WHERE cv.visitor_id = :visitor_id
                         ORDER BY c.date ASC, c.time ASC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':visitor_id', $visitor_id, PDO::PARAM_INT);
                $stmt->execute();

                $tickets = array();
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $tickets[] = $row;
                }

                echo json_encode($tickets);
            } else {
                // GET alle tickets met concert en bezoeker informatie
                $query = "SELECT cv.*, 
                                c.artist, c.date, c.time, c.venue, c.price,
                                v.first_name, v.last_name, v.email
                         FROM concert_visitors cv
                         LEFT JOIN concerts c ON cv.concert_id = c.id
                         LEFT JOIN visitors v ON cv.visitor_id = v.id
                         ORDER BY cv.purchase_date DESC";
                $stmt = $db->prepare($query);
                $stmt->execute();

                $tickets = array();
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $tickets[] = $row;
                }

                echo json_encode($tickets);
            }
            break;

        case 'POST':
            // POST - Tickets kopen (nieuwe ticket transactie)
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Valideer verplichte velden
            if (!isset($data['concert_id']) || !is_numeric($data['concert_id'])) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "Concert ID is verplicht"
                ));
                exit();
            }
            
            if (!isset($data['visitor_id']) || !is_numeric($data['visitor_id'])) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "Bezoeker ID is verplicht"
                ));
                exit();
            }

            if (!isset($data['tickets_count']) || !is_numeric($data['tickets_count']) || intval($data['tickets_count']) <= 0) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "Aantal tickets moet een positief getal zijn"
                ));
                exit();
            }

            $concert_id = intval($data['concert_id']);
            $visitor_id = intval($data['visitor_id']);
            $tickets_count = intval($data['tickets_count']);

            // Check of concert bestaat
            $checkConcertQuery = "SELECT id FROM concerts WHERE id = :concert_id";
            $checkConcertStmt = $db->prepare($checkConcertQuery);
            $checkConcertStmt->bindParam(':concert_id', $concert_id, PDO::PARAM_INT);
            $checkConcertStmt->execute();
            
            if (!$checkConcertStmt->fetch()) {
                http_response_code(404);
                echo json_encode(array(
                    "message" => "Concert niet gevonden",
                    "concert_id" => $concert_id
                ));
                exit();
            }

            // Check of bezoeker bestaat
            $checkVisitorQuery = "SELECT id FROM visitors WHERE id = :visitor_id";
            $checkVisitorStmt = $db->prepare($checkVisitorQuery);
            $checkVisitorStmt->bindParam(':visitor_id', $visitor_id, PDO::PARAM_INT);
            $checkVisitorStmt->execute();
            
            if (!$checkVisitorStmt->fetch()) {
                http_response_code(404);
                echo json_encode(array(
                    "message" => "Bezoeker niet gevonden",
                    "visitor_id" => $visitor_id
                ));
                exit();
            }

            // Insert ticket transactie
            $query = "INSERT INTO concert_visitors (concert_id, visitor_id, tickets_count, purchase_date) 
                     VALUES (:concert_id, :visitor_id, :tickets_count, NOW())";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':concert_id', $concert_id, PDO::PARAM_INT);
            $stmt->bindParam(':visitor_id', $visitor_id, PDO::PARAM_INT);
            $stmt->bindParam(':tickets_count', $tickets_count, PDO::PARAM_INT);

            if ($stmt->execute()) {
                $newId = $db->lastInsertId();
                http_response_code(201);
                echo json_encode(array(
                    "message" => "Tickets succesvol gekocht",
                    "id" => $newId,
                    "success" => true
                ));
            } else {
                http_response_code(500);
                echo json_encode(array(
                    "message" => "Fout bij kopen tickets"
                ));
            }
            break;

        case 'PUT':
            // PUT - Ticket transactie updaten (bijv. aantal tickets aanpassen)
            if (!$id) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "ID is verplicht voor update"
                ));
                exit();
            }

            $data = json_decode(file_get_contents("php://input"), true);

            if (!isset($data['tickets_count']) || !is_numeric($data['tickets_count']) || intval($data['tickets_count']) <= 0) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "Aantal tickets moet een positief getal zijn"
                ));
                exit();
            }

            // Check eerst of ticket bestaat
            $checkQuery = "SELECT id FROM concert_visitors WHERE id = :id";
            $checkStmt = $db->prepare($checkQuery);
            $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $checkStmt->execute();
            
            if (!$checkStmt->fetch()) {
                http_response_code(404);
                echo json_encode(array(
                    "message" => "Ticket niet gevonden",
                    "id" => $id
                ));
                exit();
            }

            $tickets_count = intval($data['tickets_count']);

            $query = "UPDATE concert_visitors 
                     SET tickets_count = :tickets_count 
                     WHERE id = :id";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':tickets_count', $tickets_count, PDO::PARAM_INT);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);

            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(array(
                    "message" => "Ticket succesvol bijgewerkt",
                    "id" => $id,
                    "success" => true
                ));
            } else {
                http_response_code(500);
                echo json_encode(array(
                    "message" => "Fout bij bijwerken ticket"
                ));
            }
            break;

        case 'DELETE':
            // DELETE - Ticket transactie verwijderen (terugbetaling/annulering)
            if (!$id) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "ID is verplicht voor verwijderen"
                ));
                exit();
            }

            // Check eerst of ticket bestaat
            $checkQuery = "SELECT id FROM concert_visitors WHERE id = :id";
            $checkStmt = $db->prepare($checkQuery);
            $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $checkStmt->execute();
            
            if (!$checkStmt->fetch()) {
                http_response_code(404);
                echo json_encode(array(
                    "message" => "Ticket niet gevonden",
                    "id" => $id
                ));
                exit();
            }

            $query = "DELETE FROM concert_visitors WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);

            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(array(
                    "message" => "Ticket succesvol verwijderd",
                    "id" => $id,
                    "success" => true
                ));
            } else {
                http_response_code(500);
                echo json_encode(array(
                    "message" => "Fout bij verwijderen ticket"
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

