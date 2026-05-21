$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][scriptblock]$Body
  )

  Write-Host "==> $Name"
  $global:LASTEXITCODE = 0
  & $Body

  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }

  Write-Host "OK: $Name"
}

function Test-CaseSensitiveRelativePath {
  param([Parameter(Mandatory = $true)][string]$RelativePath)

  $cleanPath = $RelativePath.Split('?')[0].Split('#')[0] -replace '/', [System.IO.Path]::DirectorySeparatorChar
  $parts = $cleanPath -split '[\\/]' | Where-Object { $_ -and $_ -ne "." }

  if ($parts | Where-Object { $_ -eq ".." }) {
    return $false
  }

  $current = (Get-Location).Path

  foreach ($part in $parts) {
    $match = Get-ChildItem -LiteralPath $current -Force |
      Where-Object { $_.Name -ceq $part } |
      Select-Object -First 1

    if (-not $match) {
      return $false
    }

    $current = $match.FullName
  }

  return $true
}

Invoke-Step "git diff whitespace check" {
  git diff --check
  git diff --cached --check
}

Invoke-Step "inline script syntax check" {
  $scriptCheck = @'
const fs = require("fs");
const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

for (const file of fs.readdirSync(".").filter((name) => name.endsWith(".html"))) {
  const html = fs.readFileSync(file, "utf8");

  for (const match of html.matchAll(scriptRe)) {
    const attrs = match[1] || "";
    const body = match[2] || "";

    if (/\bsrc\s*=/.test(attrs)) continue;

    const type = (attrs.match(/\btype\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (type && !/^(module|text\/javascript|application\/javascript)$/i.test(type)) continue;

    new Function(body);
  }
}

console.log("inline scripts ok");
'@

  $scriptCheck | node -
}

Invoke-Step "local link check" {
  $missing = @()

  foreach ($file in Get-ChildItem -LiteralPath . -File -Filter "*.html") {
    $text = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($match in [regex]::Matches($text, 'href="([^"]+)"')) {
      $href = $match.Groups[1].Value
      if ($href -match '^(#|https?:|mailto:|tel:|javascript:)' -or $href -eq '#') { continue }

      $target = $href.Split('#')[0]
      if ([string]::IsNullOrWhiteSpace($target)) { continue }

      if (-not (Test-CaseSensitiveRelativePath $target)) {
        $missing += [pscustomobject]@{ File = $file.Name; Href = $href }
      }
    }
  }

  if ($missing.Count -gt 0) {
    $missing | Format-Table -AutoSize
    throw "Missing local html links"
  }

  Write-Host "local links ok"
}

Invoke-Step "asset reference check" {
  $missing = @()
  $textFiles = Get-ChildItem -LiteralPath . -File | Where-Object { $_.Extension -in ".html", ".css" }

  foreach ($file in $textFiles) {
    $text = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($match in [regex]::Matches($text, 'assets/[^"'')\s>]+')) {
      if (-not (Test-CaseSensitiveRelativePath $match.Value)) {
        $missing += [pscustomobject]@{ File = $file.Name; Ref = $match.Value }
      }
    }
  }

  if ($missing.Count -gt 0) {
    $missing | Format-Table -AutoSize
    throw "Missing asset references"
  }

  Write-Host "asset refs ok"
}

Invoke-Step "workspace size check" {
  $size = Get-ChildItem -LiteralPath . -Recurse -File |
    Where-Object { -not $_.FullName.Contains('\.git\') } |
    Measure-Object -Property Length -Sum

  $mb = [math]::Round($size.Sum / 1MB, 2)
  Write-Host "files: $($size.Count), size: ${mb}MB"

  if ($mb -gt 15) {
    throw "Workspace is larger than expected. Check for unused assets."
  }
}

Write-Host "Preflight complete."
