<#
  scripts/check_reference.ps1
  Verifies that Docs/CTET-App-Reference.md exists and contains Version and LastUpdated fields.
  Exit code 0 = OK, non-zero = failure.
#>
$ErrorActionPreference = 'Stop'

$docPath = Join-Path -Path $PSScriptRoot -ChildPath "..\Docs\CTET-App-Reference.md" | Resolve-Path -ErrorAction SilentlyContinue
if (-not $docPath) {
    Write-Error "Reference document not found at Docs/CTET-App-Reference.md"
    exit 2
}

$content = Get-Content -Path $docPath -Raw

if ($content -notmatch 'Version:\s*\S+') {
    Write-Error "Reference document missing a 'Version:' header. Please add 'Version: x.y' near the top of the file."
    exit 3
}

if ($content -notmatch 'LastUpdated:\s*\d{4}-\d{2}-\d{2}') {
    Write-Error "Reference document missing a valid 'LastUpdated: YYYY-MM-DD' header. Please update it before committing."
    exit 4
}

Write-Host "Docs/CTET-App-Reference.md: Version and LastUpdated fields present."
exit 0
