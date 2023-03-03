<?php
$query = $_POST['qry'];
$token = ''; //<-- mavenlink token

$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $query);
	$headr = array();
	$headr[] = 'Content-length: 0';
	$headr[] = 'Content-type: application/json';
	$headr[] = 'Authorization: Bearer '.$token;
	curl_setopt($ch, CURLOPT_HTTPHEADER,$headr);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);

$result = curl_exec($ch);
print $result;
curl_close($ch);
?>