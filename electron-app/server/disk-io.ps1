$counters = Get-Counter -Counter "\PhysicalDisk(_Total)\Disk Read Bytes/sec","\PhysicalDisk(_Total)\Disk Write Bytes/sec"
$samples = $counters.CounterSamples
$read = ($samples | Where-Object { $_.Path -like "*read*" }).CookedValue
$write = ($samples | Where-Object { $_.Path -like "*write*" }).CookedValue
Write-Output "$read,$write"
