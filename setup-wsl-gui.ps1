# WSL2 GUI Setup for Windows 10 Build 19045
# Run this in PowerShell as Administrator

Write-Host "Setting up GUI for WSL2 Ubuntu..." -ForegroundColor Green

# Method 1: Check if WSLg works (Windows 11 or newer Windows 10)
Write-Host "`nMethod 1: Testing WSLg native support..." -ForegroundColor Yellow
wsl -d Ubuntu -- bash -c "echo 'export DISPLAY=:0' >> ~/.bashrc"
wsl -d Ubuntu -- bash -c "source ~/.bashrc && xclock &"

# Method 2: Install VcXsrv for older Windows 10
Write-Host "`nMethod 2: Installing VcXsrv (if WSLg doesn't work)..." -ForegroundColor Yellow

# Download VcXsrv
$vcxsrvUrl = "https://sourceforge.net/projects/vcxsrv/files/latest/download"
$vcxsrvPath = "$env:TEMP\vcxsrv-installer.exe"

if (-not (Test-Path "C:\Program Files\VcXsrv\vcxsrv.exe")) {
    Write-Host "Downloading VcXsrv..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $vcxsrvUrl -OutFile $vcxsrvPath
    Start-Process -FilePath $vcxsrvPath -Wait
}

# Configure WSL2 for VcXsrv
$wslIP = wsl -d Ubuntu -- bash -c "ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}'"
Write-Host "WSL2 IP: $wslIP" -ForegroundColor Cyan

# Create XLaunch config for VcXsrv
$xlConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<XLaunch WindowMode="MultiWindow" ClientMode="NoClient" LocalClient="False" Display="0"
         LocalProgram="xclock" RemoteProgram="xterm" RemotePassword="" PrivateKey=""
         RemoteHost="" RemoteUser="" XDMCPHost="" XDMCPBroadcast="False"
         XDMCPIndirect="False" Clipboard="True" ClipboardPrimary="True"
         ExtraParams="-ac -nowgl" Wgl="False" DisableAC="False" XDMCPTerminate="False"/>
"@

$xlConfig | Out-File -FilePath "$env:USERPROFILE\Desktop\wsl2-gui.xlaunch" -Encoding UTF8

# Configure WSL2 Ubuntu
Write-Host "`nConfiguring Ubuntu for GUI..." -ForegroundColor Green

# Get host IP
$hostIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -match "vEthernet \(WSL"}).IPAddress

# Set DISPLAY variable
wsl -d Ubuntu -- bash -c "echo 'export DISPLAY=${hostIP}:0' >> ~/.bashrc"
wsl -d Ubuntu -- bash -c "echo 'export LIBGL_ALWAYS_INDIRECT=1' >> ~/.bashrc"

# Install GUI packages in Ubuntu
Write-Host "`nInstalling GUI packages in Ubuntu..." -ForegroundColor Green
wsl -d Ubuntu -- bash -c "sudo apt update && sudo apt install -y x11-apps mesa-utils gnome-terminal firefox gedit nautilus"

# Create Windows Firewall rule
Write-Host "`nConfiguring Windows Firewall..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "WSL2 GUI" -Direction Inbound -Protocol TCP -LocalPort 6000 -Action Allow

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "1. Start VcXsrv using the Desktop shortcut: wsl2-gui.xlaunch"
Write-Host "2. In WSL2 Ubuntu, test with: xclock"
Write-Host "3. For full desktop: sudo apt install ubuntu-desktop"