# Copies Claude Code memory files from the repo into your local Claude data directory.
# Run this once after cloning on a new machine, and again after any session
# where new memories were saved (to keep the repo in sync).
#
# Usage (run from repo root in PowerShell):
#   Load into Claude:     .\setup-claude-memory.ps1
#   Save back to repo:    .\setup-claude-memory.ps1 -Save

param([switch]$Save)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MemorySrc = Join-Path $ScriptDir "_claude-memory"

# Claude Code on Windows stores data in %APPDATA%\Claude
$ClaudeDir = Join-Path $env:APPDATA "Claude"

# Claude Code derives the memory folder name by replacing every non-alphanumeric
# character in the project path with a dash.
function Encode-Path($p) { $p -replace '[^a-zA-Z0-9]', '-' }

# The memory key is whichever directory you open in your IDE. Try both the
# repo root and its parent (in case you opened the parent workspace folder).
$MemoryDest = $null
foreach ($candidate in @($ScriptDir, (Split-Path -Parent $ScriptDir))) {
    $encoded = Encode-Path $candidate
    $path = Join-Path $ClaudeDir "projects\$encoded\memory"
    if (Test-Path $path) { $MemoryDest = $path; break }
}

# If neither exists yet, default to the repo root encoding
if (-not $MemoryDest) {
    $MemoryDest = Join-Path $ClaudeDir "projects\$(Encode-Path $ScriptDir)\memory"
}

if ($Save) {
    Write-Host "Saving local Claude memory -> repo (_claude-memory/)..."
    New-Item -ItemType Directory -Force -Path $MemorySrc | Out-Null
    Copy-Item "$MemoryDest\*.md" -Destination $MemorySrc -Force
    Write-Host "Done. Review changes, then: git add _claude-memory/ && git commit && git push"
} else {
    Write-Host "Installing Claude Code memory..."
    Write-Host "  Source:      $MemorySrc"
    Write-Host "  Destination: $MemoryDest"
    Write-Host ""
    New-Item -ItemType Directory -Force -Path $MemoryDest | Out-Null
    Copy-Item "$MemorySrc\*.md" -Destination $MemoryDest -Force
    Write-Host "Memory files installed. Open the project in Claude Code and they'll be active."
}
