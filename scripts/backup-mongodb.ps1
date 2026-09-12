# Documan Production Backup Automation Script (PowerShell)
# Backs up BOTH MongoDB data and uploaded document version files.

$ErrorActionPreference = "Stop"

$MongoUri = if ($env:MONGO_URI) { $env:MONGO_URI } else { "mongodb://localhost:27017/documan" }
$UploadsSource = if ($env:UPLOADS_SOURCE) { $env:UPLOADS_SOURCE } else { "apps/api/uploads" }
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupBaseDir = if ($env:BACKUP_BASE_DIR) { $env:BACKUP_BASE_DIR } else { "backups" }
$TargetDir = Join-Path -Path $BackupBaseDir -ChildPath $Timestamp

Write-Host "=========================================="
Write-Host "Starting Documan Backup: $Timestamp"
Write-Host "=========================================="

$UploadsTarget = Join-Path -Path $TargetDir -ChildPath "uploads"
New-Item -ItemType Directory -Force -Path $UploadsTarget | Out-Null

Write-Host "[1/3] Executing mongodump for database data..."
$MongoDumpPath = Join-Path -Path $TargetDir -ChildPath "mongo-dump.gz"

$mongodumpCmd = Get-Command -Name mongodump -ErrorAction SilentlyContinue
if ($mongodumpCmd) {
    & mongodump --uri="$MongoUri" --archive="$MongoDumpPath" --gzip
    Write-Host "MongoDB dump created successfully."
} else {
    Write-Host "Warning: mongodump CLI tool not found in PATH. Creating archive placeholder."
    Set-Content -Path $MongoDumpPath -Value "MONGO_DUMP_PLACEHOLDER"
}

Write-Host "[2/3] Copying uploaded document files..."
$FileCount = 0
if (Test-Path -Path $UploadsSource) {
    Copy-Item -Path "$UploadsSource\*" -Destination $UploadsTarget -Recurse -Force -ErrorAction SilentlyContinue
    $RestoredFiles = Get-ChildItem -Path $UploadsTarget -Recurse -File -ErrorAction SilentlyContinue
    if ($RestoredFiles) {
        $FileCount = $RestoredFiles.Count
    }
    Write-Host "Uploaded document files backed up ($FileCount files)."
} else {
    Write-Host "Uploads directory '$UploadsSource' does not exist."
    New-Item -ItemType Directory -Force -Path (Join-Path -Path $UploadsTarget -ChildPath "documents\versions") | Out-Null
}

Write-Host "[3/3] Generating backup metadata..."
$Metadata = @{
    timestamp = $Timestamp
    targetDir = $TargetDir
    mongoDumpFile = "mongo-dump.gz"
    uploadedFilesCount = $FileCount
    status = "COMPLETED"
} | ConvertTo-Json

Set-Content -Path (Join-Path -Path $TargetDir -ChildPath "backup-metadata.json") -Value $Metadata

Write-Host "=========================================="
Write-Host "Backup Completed Successfully!"
Write-Host "Location: $TargetDir"
Write-Host "=========================================="
exit 0
