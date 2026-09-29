$ErrorActionPreference = 'Continue'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$logPath = Join-Path $env:TEMP 'my-jee-mentor-auto-sync.log'
Set-Location -LiteralPath $repoRoot

function Write-SyncLog([string]$message) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $message"
    Add-Content -LiteralPath $logPath -Value $line
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $repoRoot
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, DirectoryName, LastWrite, Size'
$watcher.InternalBufferSize = 32768
$watcher.EnableRaisingEvents = $true
$quietSince = Get-Date
$ignored = '^(\.git|node_modules|data|\.vercel)(/|$)|(^|/)\.env($|/)|(^|/)auto-sync\.ps1$'

Write-SyncLog "Watcher started for $repoRoot; waiting for changes."
try {
    while ($true) {
        $change = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::All, 1000)
        if (-not $change.TimedOut -and $change.Name) {
            $relativePath = $change.Name.Replace('\', '/')
            if ($relativePath -notmatch $ignored) {
                $quietSince = Get-Date
            }
        }

        if ($quietSince -and ((Get-Date) - $quietSince).TotalSeconds -ge 15) {
            $quietSince = $null
            $status = git status --porcelain
            if ($LASTEXITCODE -ne 0) {
                Write-SyncLog 'Could not read Git status; will retry after another file change.'
                continue
            }
            if (-not $status) { continue }

            git add -A
            if ($LASTEXITCODE -ne 0) {
                Write-SyncLog 'git add failed; will retry after another file change.'
                continue
            }
            git diff --cached --quiet
            if ($LASTEXITCODE -eq 0) { continue }

            $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
            git commit -m "Auto-sync website updates ($stamp)"
            if ($LASTEXITCODE -ne 0) {
                Write-SyncLog 'git commit failed; inspect Git output and resolve the issue.'
                continue
            }
            git push origin HEAD:main
            if ($LASTEXITCODE -eq 0) {
                Write-SyncLog 'Committed and pushed website updates to origin/main.'
            } else {
                Write-SyncLog 'git push failed; check authentication/network or whether origin/main has new commits.'
            }
        }
    }
}
finally {
    $watcher.Dispose()
    Write-SyncLog 'Watcher stopped.'
}
