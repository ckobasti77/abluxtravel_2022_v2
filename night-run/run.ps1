#Requires -Version 5.1
<#
  ABLux Travel — noćni run (Claude Code, headless).
  Pokreće promptove iz night-run/prompts jedan za drugim, sa kapijom (convex dev --once + build) i commitom posle svakog.
  Radi u Windows PowerShell 5.1 (ugrađen u Windows) i u PowerShell 7.

  Pokretanje: dvoklik na night-run\POKRENI.cmd, ili iz foldera projekta:
    powershell -NoProfile -ExecutionPolicy Bypass -File .\night-run\run.ps1              # ceo run
    powershell -NoProfile -ExecutionPolicy Bypass -File .\night-run\run.ps1 -From 7      # nastavak od koraka 7
    powershell -NoProfile -ExecutionPolicy Bypass -File .\night-run\run.ps1 -Only 11     # samo jedan korak
    powershell -NoProfile -ExecutionPolicy Bypass -File .\night-run\run.ps1 -DryRun -SkipPreflight
#>
param(
  [int]$From = 1,
  [int]$To = 16,
  [string]$Only = '',
  [switch]$DryRun,
  [switch]$SkipPreflight,
  [int]$StepTimeoutMinutes = 240,
  [int]$HeroWaitMinutes = 90,
  [int]$MaxLimitRetries = 12,
  [string]$Model = 'claude-opus-5-5'
)

$ErrorActionPreference = 'Stop'
$OnlyList = @(@($Only -split '[,;\s]+') | Where-Object { $_ -match '^\d+$' } | ForEach-Object { [int]$_ })
# Without -From/-Only a start continues: steps that already finished OK are skipped.
$AutoContinue = (-not $PSBoundParameters.ContainsKey('From')) -and ($OnlyList.Count -eq 0) -and (-not $DryRun)
$script:Utf8 = New-Object System.Text.UTF8Encoding($false)
try { [Console]::OutputEncoding = $script:Utf8 } catch {}
try { [Console]::InputEncoding = $script:Utf8 } catch {}
$OutputEncoding = $script:Utf8

$script:ModelId = $Model
$script:EffortCap = $null
$RunDir     = $PSScriptRoot
$Root       = Split-Path -Parent $RunDir
$LogDir     = Join-Path $RunDir 'logs'
$PlanDir    = Join-Path $Root 'docs\plans'
$StatePath  = Join-Path $RunDir 'state.json'
$StatusPath = Join-Path $RunDir 'status.json'
$ReportPath = Join-Path $RunDir 'NIGHT_REPORT.md'
$HeroReady  = Join-Path $Root 'design\hero\READY'
foreach ($d in @($LogDir, $PlanDir, (Join-Path $RunDir 'backups'))) {
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
}

# ---------------------------------------------------------------- steps
$Steps = @(
  @{ N=1;  File='01-setup.md';              Mode='auto'; Effort='high';   Session='S1'; Resume=$false; Plan=$false; Deps=@() }
  @{ N=2;  File='02-security-plan.md';      Mode='plan'; Effort='max';    Session='S2'; Resume=$false; Plan=$true;  Deps=@(); PlanOut='02-security.md' }
  @{ N=3;  File='03-security-execute.md';   Mode='auto'; Effort='high';   Session='S2'; Resume=$true;  Plan=$false; Deps=@(2) }
  @{ N=4;  File='04-design-system.md';      Mode='auto'; Effort='high';   Session='S3'; Resume=$false; Plan=$false; Deps=@() }
  @{ N=5;  File='05-global-chrome.md';      Mode='auto'; Effort='high';   Session='S3'; Resume=$true;  Plan=$false; Deps=@(4) }
  @{ N=6;  File='06-sync-plan.md';          Mode='plan'; Effort='max';    Session='S4'; Resume=$false; Plan=$true;  Deps=@(); PlanOut='06-partner-sync.md' }
  @{ N=7;  File='07-sync-core.md';          Mode='auto'; Effort='xhigh';  Session='S4'; Resume=$true;  Plan=$false; Deps=@(6) }
  @{ N=8;  File='08-sync-adapters.md';      Mode='auto'; Effort='xhigh';  Session='S4'; Resume=$true;  Plan=$false; Deps=@(7) }
  @{ N=9;  File='09-sync-orchestration.md'; Mode='auto'; Effort='xhigh';  Session='S4'; Resume=$true;  Plan=$false; Deps=@(7) }
  @{ N=10; File='10-catalog.md';            Mode='auto'; Effort='high';   Session='S5'; Resume=$false; Plan=$false; Deps=@(7) }
  @{ N=11; File='11-homepage.md';           Mode='auto'; Effort='high';   Session='S6'; Resume=$false; Plan=$false; Deps=@(); WaitHero=$true }
  @{ N=12; File='12-public-pages.md';       Mode='auto'; Effort='high';   Session='S6'; Resume=$true;  Plan=$false; Deps=@() }
  @{ N=13; File='13-admin.md';              Mode='auto'; Effort='high';   Session='S7'; Resume=$false; Plan=$false; Deps=@() }
  @{ N=14; File='14-qa.md';                 Mode='auto'; Effort='high';   Session='S8'; Resume=$false; Plan=$false; Deps=@() }
  @{ N=15; File='15-review.md';             Mode='auto'; Effort='xhigh';  Session='S9'; Resume=$false; Plan=$false; Deps=@() }
  @{ N=16; File='16-finish.md';             Mode='auto'; Effort='medium'; Session='S9'; Resume=$true;  Plan=$false; Deps=@() }
)

# ---------------------------------------------------------------- file + text helpers (UTF-8 without BOM in 5.1 and 7)
function Now { (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') }
function Write-Utf8([string]$path, [string]$text) { [System.IO.File]::WriteAllText($path, $text, $script:Utf8) }
function Append-Utf8([string]$path, [string]$text) { [System.IO.File]::AppendAllText($path, $text, $script:Utf8) }
function Read-Utf8([string]$path) { return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8) }
function Read-TailUtf8([string]$path, [int]$n) {
  if (-not (Test-Path $path)) { return @() }
  return @(Get-Content -Path $path -Tail $n -Encoding UTF8 -ErrorAction SilentlyContinue)
}

function Log([string]$msg) {
  $line = "[$(Now)] $msg"
  Write-Host $line
  Append-Utf8 (Join-Path $LogDir 'run.log') ($line + "`r`n")
}

function ConvertTo-HashtableDeep($obj) {
  if ($null -eq $obj) { return $null }
  if ($obj -is [System.Collections.IDictionary]) {
    $h = @{}; foreach ($k in @($obj.Keys)) { $h[[string]$k] = ConvertTo-HashtableDeep $obj[$k] }; return $h
  }
  if ($obj -is [System.Management.Automation.PSCustomObject]) {
    $h = @{}; foreach ($p in $obj.PSObject.Properties) { $h[$p.Name] = ConvertTo-HashtableDeep $p.Value }; return $h
  }
  if (($obj -is [System.Collections.IEnumerable]) -and -not ($obj -is [string])) {
    $list = New-Object System.Collections.ArrayList
    foreach ($i in $obj) { [void]$list.Add((ConvertTo-HashtableDeep $i)) }
    return ,($list.ToArray())
  }
  return $obj
}

function ConvertFrom-JsonSafe([string]$text) {
  try { return ($text | ConvertFrom-Json) } catch { return $null }
}

# Runs a native command without letting stderr become a terminating error (Windows PowerShell 5.1 quirk).
function Invoke-Quiet([scriptblock]$sb) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $global:LASTEXITCODE = 0
    $out = & $sb 2>&1 | ForEach-Object { "$_" } | Out-String
    return @{ Code = $global:LASTEXITCODE; Out = $out }
  } finally { $ErrorActionPreference = $prev }
}

# ---------------------------------------------------------------- state
function Load-State {
  if (Test-Path $StatePath) {
    $obj = ConvertFrom-JsonSafe (Read-Utf8 $StatePath)
    $raw = ConvertTo-HashtableDeep $obj
    if (-not ($raw -is [hashtable])) { $raw = @{} }
    if (-not $raw.ContainsKey('sessions') -or -not ($raw.sessions -is [hashtable])) { $raw.sessions = @{} }
    if (-not $raw.ContainsKey('steps') -or -not ($raw.steps -is [hashtable])) { $raw.steps = @{} }
    if (-not $raw.ContainsKey('started') -or -not ($raw.started -is [hashtable])) { $raw.started = @{} }
    return $raw
  }
  return @{ sessions = @{}; steps = @{}; started = @{} }
}
function Save-State { Write-Utf8 $StatePath (($script:State | ConvertTo-Json -Depth 8) + "`n") }

function Set-Status([int]$N, [string]$phase, [string]$detail = '') {
  $keys = @($script:State.steps.Keys)
  $done   = @($keys | Where-Object { $script:State.steps[$_].status -eq 'ok' } | Sort-Object { [int]$_ })
  $failed = @($keys | Where-Object { @('failed', 'skipped') -contains $script:State.steps[$_].status } | Sort-Object { [int]$_ })
  $obj = @{ step = $N; phase = $phase; detail = $detail; updatedAt = (Now); done = $done; failedOrSkipped = $failed }
  Write-Utf8 $StatusPath (($obj | ConvertTo-Json -Depth 5) + "`n")
}

function Add-ReportLine([string]$line) {
  if (-not (Test-Path $ReportPath)) { Write-Utf8 $ReportPath "# Noćni izveštaj — ABLux Travel 2.0`n" }
  $content = Read-Utf8 $ReportPath
  if ($content -notmatch '## Tok noći \(skripta\)') { Append-Utf8 $ReportPath "`n## Tok noći (skripta)`n`n" }
  Append-Utf8 $ReportPath "- $line`n"
}

# ---------------------------------------------------------------- claude process
function Resolve-Claude {
  $cmd = Get-Command claude -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $cmd) { throw 'Claude Code CLI (claude) nije pronađen u PATH-u.' }
  $src = $cmd.Source
  if (-not $src) { $src = $cmd.Path }
  if ($src -like '*.ps1') {
    $cmdShim = [System.IO.Path]::ChangeExtension($src, '.cmd')
    if (Test-Path $cmdShim) { $src = $cmdShim }
  }
  return $src
}

function ConvertTo-WinArg([string]$a) {
  if ($a -eq '') { return '""' }
  if ($a -notmatch '[\s"]') { return $a }
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append('"')
  $bs = 0
  foreach ($ch in $a.ToCharArray()) {
    if ($ch -eq [char]'\') { $bs++; continue }
    if ($ch -eq [char]'"') { [void]$sb.Append(('\' * ($bs * 2 + 1))); [void]$sb.Append('"'); $bs = 0; continue }
    if ($bs -gt 0) { [void]$sb.Append(('\' * $bs)); $bs = 0 }
    [void]$sb.Append($ch)
  }
  if ($bs -gt 0) { [void]$sb.Append(('\' * ($bs * 2))) }
  [void]$sb.Append('"')
  return $sb.ToString()
}

function Stop-Tree([int]$processId) {
  if ($env:OS -eq 'Windows_NT') { Invoke-Quiet { taskkill.exe /PID $processId /T /F } | Out-Null }
  else { try { (Get-Process -Id $processId -ErrorAction Stop).Kill() } catch {} }
}

function Invoke-Native([string]$exe, [string[]]$argv, [string]$logPath, [int]$timeoutMinutes) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $allArgs = @($argv)
  if ($exe -like '*.ps1') {
    $allArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $exe) + $allArgs
    $exe = (Get-Process -Id $PID).Path
  }
  $psi.FileName = $exe
  $psi.Arguments = (@($allArgs | ForEach-Object { ConvertTo-WinArg $_ }) -join ' ')
  $psi.WorkingDirectory = $Root
  $psi.UseShellExecute = $false
  $psi.RedirectStandardInput  = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError  = $true
  $psi.EnvironmentVariables['PYTHONIOENCODING'] = 'utf-8'
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  $fs = New-Object System.IO.FileStream($logPath, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
  $errPath = "$logPath.stderr.txt"
  $fe = New-Object System.IO.FileStream($errPath, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
  [void]$p.Start()
  $p.StandardInput.Close()
  $t1 = $p.StandardOutput.BaseStream.CopyToAsync($fs)
  $t2 = $p.StandardError.BaseStream.CopyToAsync($fe)
  $timedOut = $false
  if (-not $p.WaitForExit([int]($timeoutMinutes * 60 * 1000))) {
    $timedOut = $true
    Stop-Tree $p.Id
    try { $p.WaitForExit(60000) | Out-Null } catch {}
  }
  try { [void][System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]@($t1, $t2), 60000) } catch {}
  try { $fs.Flush(); $fs.Dispose() } catch {}
  try { $fe.Flush(); $fe.Dispose() } catch {}
  $code = -1
  try { $code = $p.ExitCode } catch {}
  return @{ ExitCode = $code; TimedOut = $timedOut; ErrPath = $errPath }
}

function Read-Result([string]$logPath) {
  $lines = Read-TailUtf8 $logPath 400
  for ($i = $lines.Count - 1; $i -ge 0; $i--) {
    $l = [string]$lines[$i]
    if ($l -match '"type"\s*:\s*"result"') { return (ConvertFrom-JsonSafe $l) }
  }
  return $null
}

function Get-PlanText([string]$logPath, $res) {
  # Prefer the plan passed to ExitPlanMode; fall back to the final result text.
  $plan = $null
  if (Test-Path $logPath) {
    foreach ($l in @(Get-Content -Path $logPath -Encoding UTF8 -ErrorAction SilentlyContinue)) {
      if ([string]$l -notmatch 'ExitPlanMode') { continue }
      $o = ConvertFrom-JsonSafe ([string]$l)
      if (-not $o -or -not $o.message) { continue }
      foreach ($c in @($o.message.content)) {
        if ($c -and $c.type -eq 'tool_use' -and $c.name -eq 'ExitPlanMode' -and $c.input -and $c.input.plan) { $plan = [string]$c.input.plan }
      }
    }
  }
  $resText = $null
  if ($res -and $res.result) { $resText = [string]$res.result }
  if (-not $plan -and $resText) { $plan = $resText }
  if ($plan -and $plan.Length -lt 400 -and $resText -and $resText.Length -gt $plan.Length) { $plan = $resText }
  return $plan
}

function Get-FailureText([string]$logPath) {
  # Only stderr and the final result line: tool output in the stream can mention anything (rate limits, models, modes).
  $text = (Read-TailUtf8 "$logPath.stderr.txt" 60) -join "`n"
  $res = Read-Result $logPath
  if ($res) {
    if ($res.result) { $text += "`n" + [string]$res.result }
    if ($res.error) { $text += "`n" + [string]$res.error }
    if ($res.subtype) { $text += "`n" + [string]$res.subtype }
    if ($res.api_error_status) { $text += "`napi status " + [string]$res.api_error_status }
  }
  foreach ($l in (Read-TailUtf8 $logPath 40)) {
    if ([string]$l -match '"subtype"\s*:\s*"api_error"|"type"\s*:\s*"error"|"is_api_error_message"\s*:\s*true') { $text += "`n" + [string]$l }
  }
  return $text
}

function Get-LimitWaitMinutes([string]$logPath) {
  $text = Get-FailureText $logPath
  $pattern = '(?i)(usage limit|session limit|weekly limit|limit reached|hit your (\w+ )?limit|rate[ _-]?limit|resets? at|resets?\s+\d|try again later|overloaded|api status (429|529)|"status"\s*:\s*(429|529))'
  if ($text -notmatch $pattern) { return 0 }
  $m = [regex]::Match($text, '(?i)resets?\s*(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?')
  if ($m.Success) {
    $h = [int]$m.Groups[1].Value
    $min = 0; if ($m.Groups[2].Success) { $min = [int]$m.Groups[2].Value }
    $ampm = $m.Groups[3].Value.ToLower()
    if ($ampm -eq 'pm' -and $h -lt 12) { $h += 12 }
    if ($ampm -eq 'am' -and $h -eq 12) { $h = 0 }
    if ($h -gt 23) { return 30 }
    $target = (Get-Date).Date.AddHours($h).AddMinutes($min)
    if ($target -le (Get-Date)) {
      # the reset time has just passed (the error arrived around the reset): try again soon instead of waiting a day
      if (((Get-Date) - $target).TotalMinutes -lt 30) { return 5 }
      $target = $target.AddDays(1)
    }
    return [int]([math]::Ceiling(($target - (Get-Date)).TotalMinutes) + 3)
  }
  return 30
}

function Try-ConfigFallback([string]$logPath) {
  # Handles CLI option problems. Returns 'retry' after a safe adjustment, 'stop' when the run must stop, '' otherwise.
  $text = Get-FailureText $logPath
  if ($text -match '(?i)(permission[- ]?mode|auto mode).{0,80}(not available|not supported|invalid|unknown|not enabled|unavailable)|(invalid|unknown|unsupported).{0,40}permission[- ]?mode') {
    Log 'GREŠKA: auto mod nije dostupan u ovoj verziji ili na ovom nalogu. Run se zaustavlja; odluku o načinu dozvola donosi vlasnik.'
    return 'stop'
  }
  if (-not $script:EffortCap -and $text -match '(?i)effort.{0,80}(invalid|not supported|unknown|allowed values|must be one of)|(invalid|unknown|unsupported).{0,40}effort') {
    $script:EffortCap = 'high'
    Log 'UPOZORENJE: effort max/xhigh nije prihvaćen — koristim high.'
    return 'retry'
  }
  if ($script:ModelId -ne 'opus' -and $text -match '(?i)model.{0,80}(not found|invalid|unknown|not available|does not exist)|(invalid|unknown).{0,40}model') {
    $script:ModelId = 'opus'
    Log 'UPOZORENJE: model id nije prihvaćen — koristim alias opus.'
    return 'retry'
  }
  return ''
}

function Invoke-Gate([int]$N) {
  $gateLog = Join-Path $LogDir ('{0:D2}-gate.txt' -f $N)
  Write-Utf8 $gateLog "Gate for step $N at $(Now)`r`n"
  $ok = $true
  Push-Location $Root
  try {
    Append-Utf8 $gateLog "`r`n=== npx convex dev --once ===`r`n"
    $r = Invoke-Quiet { npx convex dev --once }
    Append-Utf8 $gateLog ($r.Out + "`r`nexit code: $($r.Code)`r`n")
    if ($r.Code -ne 0) { $ok = $false }
    Append-Utf8 $gateLog "`r`n=== npm run build ===`r`n"
    $r = Invoke-Quiet { npm run build }
    Append-Utf8 $gateLog ($r.Out + "`r`nexit code: $($r.Code)`r`n")
    if ($r.Code -ne 0) { $ok = $false }
  } finally { Pop-Location }
  return $ok
}

function Save-Checkpoint([int]$N, [string]$label) {
  Push-Location $Root
  try {
    Invoke-Quiet { git add -A } | Out-Null
    $st = Invoke-Quiet { git status --porcelain }
    if ($st.Out.Trim()) {
      $msg = ('[{0:D2}] night-run checkpoint: {1}' -f $N, $label)
      Invoke-Quiet { git commit -m $msg } | Out-Null
    }
  } finally { Pop-Location }
}

function Get-SessionId([string]$key) {
  if (-not $script:State.sessions[$key]) { $script:State.sessions[$key] = [guid]::NewGuid().ToString(); Save-State }
  return $script:State.sessions[$key]
}

function Build-Prompt($s, [string]$kind) {
  $file = "night-run/prompts/$($s.File)"
  switch ($kind) {
    'first'   { return "You are running step $($s.N) of the ABLux overnight run. Nobody can answer questions tonight. First read night-run/NIGHT_RULES.md, then read $file and carry it out completely. Record decisions in night-run/DECISIONS.md. Finish with the gate, a commit, and your section in night-run/NIGHT_REPORT.md." }
    'plan'    { return "You are running step $($s.N) of the ABLux overnight run in plan mode. Nobody can answer questions tonight. Read night-run/NIGHT_RULES.md, then read $file and produce the complete plan it asks for as your final message." }
    'retry'   { return "Continue step $($s.N) from $file. The previous attempt was interrupted by a time limit, a usage limit or a crash. Check git status, git log and night-run/NIGHT_REPORT.md to see what is done, finish the remaining parts efficiently, then run the gate, commit, and update your report section." }
    'gatefix' { return "The run script gate check failed after step $($s.N). Read night-run/logs/$('{0:D2}' -f $s.N)-gate.txt and fix the causes so that npx convex dev --once and npm run build both succeed. Run the gate again, commit, and note the fix in night-run/NIGHT_REPORT.md." }
  }
}

function Run-Claude($s, [string]$kind, [bool]$resume) {
  if (-not $resume -and $script:State.started[$s.Session]) {
    $script:State.sessions[$s.Session] = [guid]::NewGuid().ToString()
    $script:State.started[$s.Session] = $false
    Save-State
  }
  $sid = Get-SessionId $s.Session
  $useResume = $resume -and [bool]$script:State.started[$s.Session]
  $mode = 'auto'; if ($kind -eq 'plan') { $mode = 'plan' }
  $effort = $s.Effort
  if ($script:EffortCap -and (@('max', 'xhigh') -contains $effort)) { $effort = $script:EffortCap }
  $prompt = Build-Prompt $s $kind
  $argv = @('-p', $prompt, '--model', $script:ModelId, '--effort', $effort, '--permission-mode', $mode,
            '--output-format', 'stream-json', '--verbose')
  if ($useResume) { $argv += @('--resume', $sid) } else { $argv += @('--session-id', $sid) }
  $log = Join-Path $LogDir ('{0:D2}-{1}.jsonl' -f $s.N, $kind)
  $how = 'new'; if ($useResume) { $how = 'resume' }
  Log ("step {0} [{1}] mode={2} effort={3} model={4} session={5} {6}" -f $s.N, $kind, $mode, $effort, $script:ModelId, $s.Session, $how)
  if ($DryRun) { return @{ Ok = $true; Result = $null; Log = $log; TimedOut = $false; ExitCode = 0 } }
  $script:State.started[$s.Session] = $true; Save-State
  $r = Invoke-Native $script:ClaudeExe $argv $log $StepTimeoutMinutes
  $res = Read-Result $log
  if (-not $useResume -and -not $res) {
    $errTail = (Read-TailUtf8 "$log.stderr.txt" 20) -join "`n"
    if ($errTail -match '(?i)session id .{0,60}already in use') {
      Log "step $($s.N): sesija $($s.Session) već postoji — nastavljam je"
      $script:State.started[$s.Session] = $true; Save-State
      $k2 = $kind; if ($kind -eq 'first') { $k2 = 'retry' }
      return (Run-Claude $s $k2 $true)
    }
  }
  if ($useResume -and -not $res) {
    $tail = ((Read-TailUtf8 "$log.stderr.txt" 20) -join "`n") + "`n" + ((Read-TailUtf8 $log 5) -join "`n")
    if ($tail -match '(?i)no conversation found|session.{0,40}not found') {
      Log "step $($s.N): sesija $($s.Session) ne postoji — nastavljam u novoj sesiji"
      $script:State.sessions[$s.Session] = [guid]::NewGuid().ToString()
      $script:State.started[$s.Session] = $false
      Save-State
      return (Run-Claude $s $kind $false)
    }
  }
  $isErr = $true
  if ($res) { $isErr = [bool]$res.is_error }
  $ok = (-not $r.TimedOut) -and ($r.ExitCode -eq 0) -and ($null -ne $res) -and (-not $isErr)
  return @{ Ok = $ok; Result = $res; Log = $log; TimedOut = $r.TimedOut; ExitCode = $r.ExitCode }
}

# ---------------------------------------------------------------- preflight
$script:State = Load-State
if ($DryRun) {
  $script:ClaudeExe = 'claude'
  try { $script:ClaudeExe = Resolve-Claude } catch { $script:ClaudeExe = 'claude (nije pronađen)' }
} else {
  $script:ClaudeExe = Resolve-Claude
}

# keep the PC awake while this window runs (no admin rights needed)
$script:CanKeepAwake = $false
if ($env:OS -eq 'Windows_NT') {
  try {
    Add-Type -Namespace AbluxWin32 -Name Power -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("kernel32.dll")]
public static extern uint SetThreadExecutionState(uint esFlags);
'@ -ErrorAction Stop
    $script:CanKeepAwake = $true
  } catch {}
  if ($script:CanKeepAwake) {
    try { [void][AbluxWin32.Power]::SetThreadExecutionState([uint32]2147483649) } catch { Log 'UPOZORENJE: ne mogu da sprečim sleep; isključi ga ručno.' }
  }
}

Log "=== ABLux night run start (od $From do $To) — PowerShell $($PSVersionTable.PSVersion) — claude: $script:ClaudeExe ==="
if ($AutoContinue) { Log 'nastavak: koraci koji su već gotovi se preskaču (za ponovni prolaz kroz sve koristi -From 1)' }

if (-not $SkipPreflight -and -not $DryRun) {
  Push-Location $Root
  try {
    foreach ($c in @('git', 'node', 'npm', 'npx')) { if (-not (Get-Command $c -ErrorAction SilentlyContinue)) { throw "Nedostaje $c u PATH-u." } }
    $exe = $script:ClaudeExe
    $ver = Invoke-Quiet { & $exe --version }
    Log "claude version: $($ver.Out.Trim())"
    $envLocal = Join-Path $Root '.env.local'
    if (-not (Test-Path $envLocal)) { throw '.env.local ne postoji (potreban je CONVEX_DEPLOYMENT=dev:...)' }
    $depLine = @(Get-Content -Path $envLocal -Encoding UTF8 | Where-Object { $_ -match '^\s*CONVEX_DEPLOYMENT\s*=' }) | Select-Object -First 1
    $dep = ''
    if ($depLine) { $dep = (($depLine -split '=', 2)[1]).Trim().Trim('"').Trim("'") }
    if ($dep -notlike 'dev:*') { throw "CONVEX_DEPLOYMENT nije DEV ($dep). Prekidam da ne bih dirao produkciju." }
    Log 'Convex deployment: DEV ok'
    foreach ($f in @('hostinger-recovery-codes.txt', 'payoneer-recovery-code.txt')) {
      if (Test-Path (Join-Path $Root $f)) {
        $ci = Invoke-Quiet { git check-ignore -q $f }
        if ($ci.Code -ne 0) { throw "$f nije u .gitignore — prekidam." }
        Log "UPOZORENJE: $f je i dalje u folderu projekta (ignorisan u gitu, blokiran za čitanje u .claude/settings.json)."
      }
    }
    $branch = (Invoke-Quiet { git rev-parse --abbrev-ref HEAD }).Out.Trim()
    if ($branch -ne 'ablux-2.0') {
      $has = Invoke-Quiet { git show-ref --verify --quiet refs/heads/ablux-2.0 }
      if ($has.Code -eq 0) { $sw = Invoke-Quiet { git switch ablux-2.0 } } else { $sw = Invoke-Quiet { git switch -c ablux-2.0 } }
      if ($sw.Code -ne 0) { throw "Ne mogu da pređem na granu ablux-2.0: $($sw.Out.Trim())" }
      Log 'git branch: ablux-2.0'
    }
    Invoke-Quiet { git add -A } | Out-Null
    $st = Invoke-Quiet { git status --porcelain }
    if ($st.Out.Trim()) {
      $bmsg = '[00] baseline: lokalno stanje pre noćnog runa'
      $cm = Invoke-Quiet { git commit -m $bmsg }
      if ($cm.Code -ne 0) { throw "Baseline commit nije uspeo: $($cm.Out.Trim())" }
      Log 'baseline commit napravljen'
    }
    Log 'convex dev --once (provera pristupa DEV bazi)...'
    $cx = Invoke-Quiet { npx convex dev --once }
    if ($cx.Code -ne 0) {
      Write-Utf8 (Join-Path $LogDir '00-preflight-convex.txt') $cx.Out
      throw 'npx convex dev --once ne prolazi (vidi night-run/logs/00-preflight-convex.txt). Uradi npx convex login i pokreni ponovo.'
    }
    Log 'preflight ok'
  } finally { Pop-Location }
}

if (-not (Test-Path $ReportPath)) { Write-Utf8 $ReportPath "# Noćni izveštaj — ABLux Travel 2.0`n" }
if (-not $DryRun) { Add-ReportLine "$(Now) — start runa (koraci $From–$To)" }

# ---------------------------------------------------------------- main loop
foreach ($s in $Steps) {
  if ($OnlyList.Count -gt 0 -and ($OnlyList -notcontains $s.N)) { continue }
  if ($OnlyList.Count -eq 0 -and ($s.N -lt $From -or $s.N -gt $To)) { continue }
  $key = [string]$s.N
  if ($AutoContinue) {
    $prevDone = $script:State.steps[$key]
    if ($prevDone -and ($prevDone -is [hashtable]) -and $prevDone.status -eq 'ok') { Log "step $($s.N): već gotov — preskačem"; continue }
  }

  $blockedBy = @($s.Deps | Where-Object { $script:State.steps["$_"] -and $script:State.steps["$_"].status -ne 'ok' })
  if ($blockedBy.Count -gt 0) {
    $reason = "zavisi od koraka $($blockedBy -join ', ') koji nije uspeo"
    $script:State.steps[$key] = @{ status = 'skipped'; reason = $reason; at = (Now) }
    Save-State; Set-Status $s.N 'skipped' $reason
    if (-not $DryRun) { Add-ReportLine ("korak {0:D2} PRESKOČEN — {1}" -f $s.N, $reason) }
    Log "step $($s.N) skipped"
    continue
  }

  if ($s.WaitHero -and -not $DryRun) {
    $deadline = (Get-Date).AddMinutes($HeroWaitMinutes)
    while (-not (Test-Path $HeroReady) -and (Get-Date) -lt $deadline) {
      Set-Status $s.N 'waiting-hero' "čekam design/hero/READY do $($deadline.ToString('HH:mm'))"
      Start-Sleep -Seconds 120
    }
    Log ("hero assets ready: {0}" -f (Test-Path $HeroReady))
  }

  $interrupted = $false
  $prev = $script:State.steps[$key]
  if ($prev -and ($prev -is [hashtable]) -and $prev.status -eq 'running' -and $script:State.sessions[$s.Session]) {
    $interrupted = $true
    $script:State.started[$s.Session] = $true
  }
  $started = Get-Date
  $script:State.steps[$key] = @{ status = 'running'; startedAt = (Now); attempts = 0 }
  Save-State; Set-Status $s.N 'running' $s.File

  $kind = 'first'; if ($s.Plan) { $kind = 'plan' }
  $resume = [bool]$s.Resume
  if ($interrupted) {
    if (-not $s.Plan) { $kind = 'retry' }
    $resume = $true
    Log "step $($s.N): prethodni pokušaj je prekinut — nastavljam u istoj sesiji ($($s.Session))"
  }
  $attempt = 0; $limitRetries = 0; $configFixes = 0; $ok = $false; $res = $null; $r = $null
  while ($true) {
    $attempt++
    $script:State.steps[$key].attempts = $attempt; Save-State
    $r = Run-Claude $s $kind $resume
    $res = $r.Result
    if ($r.Ok) { $ok = $true; break }
    if (-not $DryRun -and $configFixes -lt 3) {
      $fix = Try-ConfigFallback $r.Log
      if ($fix -eq 'stop') { Set-Status $s.N 'stopped' 'auto mod nije dostupan'; Add-ReportLine 'RUN ZAUSTAVLJEN: auto mod nije dostupan (vidi logs/run.log)'; exit 2 }
      if ($fix -eq 'retry') { $configFixes++; $attempt--; continue }
    }
    $wait = 0; if (-not $DryRun) { $wait = Get-LimitWaitMinutes $r.Log }
    if ($wait -gt 0 -and $limitRetries -lt $MaxLimitRetries) {
      $limitRetries++
      $until = (Get-Date).AddMinutes($wait)
      Log "step $($s.N): limit/overload — čekam $wait min (do $($until.ToString('HH:mm')))"
      Set-Status $s.N 'waiting-limit' "do $($until.ToString('HH:mm'))"
      Start-Sleep -Seconds ([int]($wait * 60))
      if ($s.Plan) { $kind = 'plan' } else { $kind = 'retry' }; $resume = $true
      continue
    }
    if ($attempt -lt 2) {
      Log "step $($s.N): pokušaj $attempt nije uspeo (exit $($r.ExitCode), timeout $($r.TimedOut)) — nastavljam u istoj sesiji"
      if ($s.Plan) { $kind = 'plan' } else { $kind = 'retry' }; $resume = $true
      continue
    }
    break
  }

  if ($s.Plan) {
    $planText = $null
    if ($ok -and -not $DryRun) { $planText = Get-PlanText $r.Log $res }
    if ($planText) {
      $planFile = Join-Path $PlanDir $s.PlanOut
      Write-Utf8 $planFile ("# Plan iz koraka {0:D2} ({1})`n`n{2}`n" -f $s.N, (Now), $planText)
      Log "plan saved: $planFile"
    } elseif (-not $DryRun) { $ok = $false }
  } else {
    if (-not $DryRun) {
      Set-Status $s.N 'gate' ''
      $gateOk = Invoke-Gate $s.N
      if (-not $gateOk) {
        Log "step $($s.N): gate pao — jedan pokušaj popravke"
        $r2 = Run-Claude $s 'gatefix' $true
        $gateOk = Invoke-Gate $s.N
      }
      if (-not $gateOk) { $ok = $false; Log "step $($s.N): gate i dalje pada" }
      $label = 'nedovršeno'; if ($ok) { $label = 'ok' }
      Save-Checkpoint $s.N $label
    }
  }

  $mins = [int][math]::Round(((Get-Date) - $started).TotalMinutes)
  $status = 'failed'; if ($ok) { $status = 'ok' }
  $script:State.steps[$key].status = $status
  $script:State.steps[$key].endedAt = (Now)
  $script:State.steps[$key].minutes = $mins
  if ($res -and $res.session_id) { $script:State.steps[$key].sessionId = [string]$res.session_id }
  Save-State
  Set-Status $s.N $status "$mins min"
  $word = 'NIJE USPEO'; if ($ok) { $word = 'OK' }
  if (-not $DryRun) { Add-ReportLine ("korak {0:D2} {1} — {2} min, pokušaja {3}" -f $s.N, $word, $mins, $attempt) }
  Log "step $($s.N) -> $status ($mins min)"
}

Set-Status 0 'finished' ''
if (-not $DryRun) { Add-ReportLine "$(Now) — kraj runa" }
Log '=== ABLux night run finished ==='
if ($script:CanKeepAwake) { try { [void][AbluxWin32.Power]::SetThreadExecutionState([uint32]2147483648) } catch {} }
