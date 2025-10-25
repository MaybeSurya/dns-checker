<?php
// query.php — Secure DNS proxy for advanced use (optional)

// Strict input validation
$domain = isset($_GET['name']) ? preg_replace('/[^a-zA-Z0-9\\-\\.]/', '', $_GET['name']) : '';
$type   = isset($_GET['type']) ? strtoupper($_GET['type']) : 'A';

if (!$domain || !in_array($type, ['A','AAAA','CNAME','MX','NS','SOA','TXT','PTR'])) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid parameters"]);
    exit;
}

header("Content-Type: application/json");

$cmd = sprintf("dig +noall +answer %s %s 2>&1", escapeshellarg($domain), escapeshellarg($type));
$output = shell_exec($cmd);

if (!$output) {
    echo json_encode(["error" => "No output from dig"]);
    exit;
}

echo json_encode(["domain" => $domain, "type" => $type, "result" => explode(\"\\n\", trim($output))]);
