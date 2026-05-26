<?php
header("Content-Type: application/json");
http_response_code(200);
echo json_encode([
    "status" => "ok",
    "service" => "Sorvx Search",
    "version" => defined("config::VERSION") ? config::VERSION : "unknown",
    "timestamp" => time()
]);
