<?php
$content = $_POST['value'];
$file = 'cache.txt';
$handle = fopen($file, 'w') or die('Cannot open file:  '.$file);
fwrite($handle, $content);
fclose($handle);
?>