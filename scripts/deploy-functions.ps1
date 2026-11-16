<#
.SYNOPSIS
    Deploy the scholarship edge functions and set their secrets.

.DESCRIPTION
    One command for the two things that cannot be done from the app:
      1. push the TAVILY_API_KEY secret to the project,
      2. deploy public-data (draft-leak fix) and discover-scholarships (web search).

    The key is never passed as a command-line argument. It is read with a secure
    prompt, written to a short-lived file in the OS temp directory, consumed by
    `supabase secrets set --env-file`, and deleted in a finally block.

    If TAVILY_API_KEY is already in your environment, that value is used and you
    are not prompted.

.PARAMETER ProjectRef
    Supabase project ref. Defaults to the production project.

.PARAMETER SkipSecret
    Deploy only; leave existing secrets untouched.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-functions.ps1

.EXAMPLE
    # Non-interactive: set the secret elsewhere first
    $env:TAVILY_API_KEY = "tvly-..."
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-functions.ps1 -SkipSecret
#>
[CmdletBinding()]
param(
    [string]$ProjectRef = "tobclczszdikmgvkvngf",
    [switch]$SkipSecret
)

$ErrorActionPreference = "Stop"

function Get-SupabaseCli {
    $onPath = Get-Command supabase -ErrorAction SilentlyContinue
    if ($onPath) { return @($onPath.Source) }
    # Fall back to a pinned CLI through npx so this works on a fresh machine.
    return @("npx", "--yes", "supabase@2")
}

function Invoke-Supabase {
    param([string[]]$Arguments)
    & $script:Cli @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "supabase $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
}

$script:Cli = Get-SupabaseCli
Write-Host "Using CLI: $($script:Cli -join ' ')" -ForegroundColor Cyan

# --- 1. Auth ---------------------------------------------------------------
Write-Host "`n[1/3] Checking Supabase login…" -ForegroundColor Cyan
try {
    Invoke-Supabase @("projects", "list")
} catch {
    Write-Host "Not logged in. Run 'supabase login' first, or set SUPABASE_ACCESS_TOKEN." -ForegroundColor Yellow
    throw
}

# --- 2. Secret -------------------------------------------------------------
if (-not $SkipSecret) {
    Write-Host "`n[2/3] Setting TAVILY_API_KEY…" -ForegroundColor Cyan

    $key = $env:TAVILY_API_KEY
    if ([string]::IsNullOrWhiteSpace($key)) {
        $secure = Read-Host -Prompt "Paste the Tavily API key (input is hidden)" -AsSecureString
        $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try {
            $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        } finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }

    if ([string]::IsNullOrWhiteSpace($key)) { throw "No key provided." }

    $tempFile = Join-Path $env:TEMP ("supabase-secrets-" + [guid]::NewGuid().ToString("N") + ".env")
    try {
        # Write with no BOM; the CLI parses KEY=VALUE lines.
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($tempFile, "TAVILY_API_KEY=$key`n", $utf8NoBom)
        Invoke-Supabase @("secrets", "set", "--env-file", $tempFile, "--project-ref", $ProjectRef)
        Write-Host "Secret set. Key value was not printed or logged." -ForegroundColor Green
    } finally {
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
        $key = $null
    }
} else {
    Write-Host "`n[2/3] Skipping secret (-SkipSecret)." -ForegroundColor Yellow
}

# --- 3. Deploy -------------------------------------------------------------
Write-Host "`n[3/3] Deploying functions…" -ForegroundColor Cyan
foreach ($fn in @("public-data", "discover-scholarships")) {
    Write-Host "  → $fn" -ForegroundColor Cyan
    Invoke-Supabase @("functions", "deploy", $fn, "--project-ref", $ProjectRef)
}

Write-Host "`nDeployed. Current functions:" -ForegroundColor Green
Invoke-Supabase @("functions", "list", "--project-ref", $ProjectRef)

Write-Host @"

Next checks
  1. Student dashboard → open the Scholarships widget → "Found online" strip should
     either list leads or say nothing surfaced (never "not switched on").
  2. Admin → /admin/scholarships/candidates → leads should appear for triage.
  3. If the strip says search is unavailable, the secret did not attach:
       supabase secrets list --project-ref $ProjectRef

Security
  The key you pasted into chat is in the transcript. Rotate it in Tavily once this
  deploy is verified, then re-run with the new key:
       powershell -File scripts/deploy-functions.ps1
"@ -ForegroundColor Yellow
