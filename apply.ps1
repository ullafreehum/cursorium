param([Parameter(Mandatory=$true)][string]$Spec)
# Cursorium bridge: applies / reads / restores Windows cursor schemes for the current user only (HKCU).
$ErrorActionPreference = 'Stop'
$s = Get-Content -Raw -LiteralPath $Spec -Encoding UTF8 | ConvertFrom-Json
$K = 'HKCU:\Control Panel\Cursors'
$Roles = 'Arrow','Help','AppStarting','Wait','Crosshair','IBeam','NWPen','No','SizeNS','SizeWE','SizeNWSE','SizeNESW','SizeAll','UpArrow','Hand','Pin','Person'

Add-Type -Namespace Cursorium -Name Native -MemberDefinition @'
[DllImport("user32.dll", SetLastError=true)]
public static extern bool SystemParametersInfo(uint a, uint b, System.IntPtr c, uint d);
'@
function Refresh { [void][Cursorium.Native]::SystemParametersInfo(0x57, 0, [IntPtr]::Zero, 0x03) }
function SetStr($name, $val) {
  if ($name -eq '(default)') { Set-ItemProperty -Path $K -Name '(default)' -Value $val; return }
  New-ItemProperty -Path $K -Name $name -Value $val -PropertyType ExpandString -Force | Out-Null
}

function Read-Current {
  $p = Get-ItemProperty -Path $K
  $o = [ordered]@{ scheme = $p.'(default)'; size = $p.CursorBaseSize }
  foreach ($r in $Roles) { $o[$r] = $p.$r }
  return $o
}

switch ($s.action) {
  'read' { Read-Current | ConvertTo-Json -Compress; break }

  'apply' {
    $dest = Join-Path $env:LOCALAPPDATA ('Cursorium\schemes\' + $s.slug)
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    $paths = @()
    foreach ($r in $Roles) {
      $src = $s.files.$r
      if ($src -and (Test-Path -LiteralPath $src)) {
        $ext = [IO.Path]::GetExtension($src)
        $dst = Join-Path $dest ($r + $ext)
        if ([IO.Path]::GetFullPath($src) -ne [IO.Path]::GetFullPath($dst)) { Copy-Item -LiteralPath $src -Destination $dst -Force }
        SetStr $r $dst; $paths += $dst
      } else { $paths += '' }
    }
    SetStr '(default)' $s.scheme
    New-ItemProperty -Path $K -Name 'Scheme Source' -Value 1 -PropertyType DWord -Force | Out-Null
    $sk = Join-Path $K 'Schemes'
    if (-not (Test-Path $sk)) { New-Item -Path $sk -Force | Out-Null }
    New-ItemProperty -Path $sk -Name $s.scheme -Value ($paths -join ',') -PropertyType ExpandString -Force | Out-Null
    if ($s.size) { New-ItemProperty -Path $K -Name 'CursorBaseSize' -Value ([int]$s.size) -PropertyType DWord -Force | Out-Null }
    Refresh; '{"ok":true}'; break
  }

  'restore' {
    # $s.values: role -> path (or "" to fall back), plus scheme/size
    foreach ($r in $Roles) { $v = $s.values.$r; if ($null -eq $v) { $v = '' }; SetStr $r $v }
    $sc = $s.values.scheme; if ($null -eq $sc) { $sc = '' }; SetStr '(default)' $sc
    if ($s.values.size) { New-ItemProperty -Path $K -Name 'CursorBaseSize' -Value ([int]$s.values.size) -PropertyType DWord -Force | Out-Null }
    Refresh; '{"ok":true}'; break
  }

  'size' {
    New-ItemProperty -Path $K -Name 'CursorBaseSize' -Value ([int]$s.size) -PropertyType DWord -Force | Out-Null
    Refresh; '{"ok":true}'; break
  }
}
