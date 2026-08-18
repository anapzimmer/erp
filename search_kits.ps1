
$files = Get-ChildItem -Path "src/app/(calculos)" -Recurse -Filter "page.tsx" | Where-Object { $_.FullName -match "-kit\\page\.tsx$" }
$patterns = @("useEffect\(", "setMateriais\(", "kitSelecionado", "kitAutomatico")

foreach ($file in $files) {
    Write-Output "========================================"
    Write-Output "FILE: $($file.FullName)"
    Write-Output "========================================"
    $lines = Get-Content $file.FullName
    $matchedIndices = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        foreach ($pattern in $patterns) {
            if ($lines[$i] -match $pattern) {
                $matchedIndices += $i
                break
            }
        }
    }
    
    # Merge indices and context
    $printedLines = @{}
    foreach ($idx in $matchedIndices) {
        $start = [Math]::Max(0, $idx - 3)
        $end = [Math]::Min($lines.Count - 1, $idx + 3)
        for ($j = $start; $j -le $end; $j++) {
            $printedLines[$j] = $true
        }
    }
    
    # Print sorted
    $sortedKeys = $printedLines.Keys | Sort-Object
    $lastIdx = -2
    foreach ($idx in $sortedKeys) {
        if ($idx -ne ($lastIdx + 1) -and $lastIdx -ne -2) {
            Write-Output "  ..."
        }
        $lineNum = $idx + 1
        $marker = if ($matchedIndices -contains $idx) { "*" } else { " " }
        Write-Output "$($lineNum.ToString().PadLeft(5))$marker| $($lines[$idx])"
        $lastIdx = $idx
    }
}

