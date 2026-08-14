<?php
/**
 * Database configuratie
 *
 * Verbindt met de ID477272_ftpwm database. Dit is de enige database waar deze
 * gebruiker rechten op heeft: 'concertdb' geeft "Access denied" (zie FIX_DATABASE.md).
 * Krijg je later wel toegang tot concertdb, dan volstaat het om $db_name aan te passen.
 */
class Database
{
    private $host = "ID477272_ftpwm.db.webhosting.be";
    private $db_name = "ID477272_ftpwm";
    private $username = "ID477272_ftpwm";
    private $password = "Hotel13!";
    public $conn;

   public function getConnection()
    {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4",
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
        } catch (PDOException $exception) {
            throw new PDOException("Connection error: " . $exception->getMessage());
        }

        return $this->conn;
    }
}
