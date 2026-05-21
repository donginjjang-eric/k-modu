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

function Invoke-Native {
  param([Parameter(Mandatory = $true)][scriptblock]$Command)

  $global:LASTEXITCODE = 0
  & $Command

  if ($LASTEXITCODE -ne 0) {
    throw "Native command failed with exit code $LASTEXITCODE"
  }
}

function Test-CaseSensitiveRelativePath {
  param(
    [Parameter(Mandatory = $true)][string]$RelativePath,
    [string]$BaseDirectory = (Get-Location).Path
  )

  $projectRoot = [System.IO.Path]::GetFullPath((Get-Location).Path).TrimEnd('\', '/')
  $rawPath = $RelativePath.Split('?')[0].Split('#')[0]
  $isRootRelative = $rawPath -match '^[\\/]'
  $cleanPath = ($rawPath -replace '/', [System.IO.Path]::DirectorySeparatorChar).TrimStart('\', '/')
  $parts = $cleanPath -split '[\\/]' | Where-Object { $_ -and $_ -ne "." }
  $current = if ($isRootRelative) {
    $projectRoot
  } else {
    [System.IO.Path]::GetFullPath($BaseDirectory)
  }

  foreach ($part in $parts) {
    if ($part -eq "..") {
      $parent = [System.IO.Path]::GetFullPath((Split-Path -Parent $current)).TrimEnd('\', '/')
      $insideProject = $parent.Equals($projectRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
        $parent.StartsWith($projectRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)

      if (-not $insideProject) {
        return $false
      }

      $current = $parent
      continue
    }

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

function Test-LocalReference {
  param(
    [Parameter(Mandatory = $true)][string]$Reference,
    [string]$BaseDirectory = (Get-Location).Path
  )

  if ($Reference -match '^(#|https?:|//|mailto:|tel:|javascript:|data:)' -or $Reference -eq '#') {
    return $true
  }

  $target = $Reference.Split('#')[0].Split('?')[0]
  if ([string]::IsNullOrWhiteSpace($target)) {
    return $true
  }

  return Test-CaseSensitiveRelativePath -RelativePath $target -BaseDirectory $BaseDirectory
}

Invoke-Step "git diff whitespace check" {
  Invoke-Native { git diff --check }
  Invoke-Native { git diff --cached --check }
}

Invoke-Step "javascript syntax check" {
  $inlineCheck = @"
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
"@

  Invoke-Native { $inlineCheck | node - }

  $jsFiles = Get-ChildItem -LiteralPath . -Recurse -File -Filter "*.js" |
    Where-Object { -not $_.FullName.Contains('\.git\') }

  foreach ($file in $jsFiles) {
    Invoke-Native { node --check $file.FullName }
  }
}

Invoke-Step "local reference check" {
  $missing = @()

  $htmlFiles = Get-ChildItem -LiteralPath . -Recurse -File -Filter "*.html" |
    Where-Object { -not $_.FullName.Contains('\.git\') }

  foreach ($file in $htmlFiles) {
    $text = Get-Content -LiteralPath $file.FullName -Raw
    $baseDirectory = Split-Path -Parent $file.FullName

    foreach ($attr in @("href", "src")) {
      $pattern = $attr + '="([^"]+)"'
      foreach ($match in [regex]::Matches($text, $pattern)) {
        $ref = $match.Groups[1].Value
        if (-not (Test-LocalReference -Reference $ref -BaseDirectory $baseDirectory)) {
          $displayFile = $file.FullName.Substring((Get-Location).Path.Length + 1)
          $missing += [pscustomobject]@{ File = $displayFile; Attribute = $attr; Ref = $ref }
        }
      }
    }
  }

  if ($missing.Count -gt 0) {
    $missing | Format-Table -AutoSize
    throw "Missing local references"
  }

  Write-Host "local references ok"
}

Invoke-Step "asset reference check" {
  $missing = @()
  $textFiles = Get-ChildItem -LiteralPath . -Recurse -File |
    Where-Object { $_.Extension -in ".html", ".css", ".js" -and -not $_.FullName.Contains('\.git\') }

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
