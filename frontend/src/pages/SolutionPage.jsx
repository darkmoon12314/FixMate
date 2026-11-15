import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiArrowLeft,
  FiCheck,
  FiDownload,
} from 'react-icons/fi'
import { AppContext } from '../App'
import { apiFetch } from '../api'
import './SolutionPage.css'

function SolutionPage() {
  const navigate = useNavigate()

  const { currentProblem } = useContext(AppContext)

  const [solutionStatus, setSolutionStatus] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Use only the report explicitly selected for this problem.
  // Never fall back to an old cached report.
    const selectedSystemReport =
    currentProblem?.useSystemReport === true
      ? currentProblem?.systemReportForDiagnosis
      : null

  const systemReport =
    selectedSystemReport?.cpu &&
    selectedSystemReport?.memory &&
    selectedSystemReport?.disk
      ? selectedSystemReport
      : null

  const selectedReportTimestamp =
    currentProblem?.systemReportTimestamp || null

  const formattedReportTimestamp = selectedReportTimestamp
    ? new Date(selectedReportTimestamp).toLocaleString()
    : ''

  if (!currentProblem) {
    return (
      <div className="solution-container">
        <div className="container">
          <div className="alert alert-error">
            <p>
              No diagnostic data available. Please start from the beginning.
            </p>

            <button
              className="btn-primary"
              onClick={() => navigate('/report-problem')}
            >
              Report a Problem
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Possible causes for all 8 categories
  const causes = {
    'slow-computer': [
      'Too many startup programs running in background',
      'Insufficient RAM or memory available',
      'Hard drive is full or nearly full',
      'Outdated or corrupted device drivers',
      'Malware or virus infection',
      'High CPU usage from background processes',
    ],

    'network-problem': [
      'Router or modem is powered off or disconnected',
      'WiFi password or connection credentials incorrect',
      'Internet service provider experiencing outages',
      'Network driver is outdated or corrupted',
      'DNS server configuration issues',
      'Router firmware needs update',
    ],

    'printer-problem': [
      'Printer driver not installed or outdated',
      'Printer is offline or not recognized by computer',
      'Paper jam or empty paper tray',
      'Ink or toner cartridge is empty or low',
      'USB or network connection loose or disconnected',
      'Print queue has stuck jobs',
    ],

    'app-crash': [
      'Application has bugs or compatibility issues',
      'Application is not compatible with your system',
      'Application files are corrupted',
      'Insufficient RAM or system memory',
      'Conflicting software or driver issues',
      'Application needs update to latest version',
    ],

    'startup-problem': [
      'Hard drive failure or bad sectors',
      'Corrupted Windows/OS installation files',
      'BIOS/UEFI settings corrupted',
      'Recently installed software preventing boot',
      'Hardware conflict or incompatibility',
      'RAM or memory module failure',
    ],

    'security-warning': [
      'Malware or adware infection on system',
      'Phishing attempt or malicious website visited',
      'Outdated antivirus or security software',
      'Unnecessary or suspicious browser extensions',
      'Insecure network connection or public WiFi',
      'System permissions or security settings compromised',
    ],

    'hardware-problem': [
      'Hardware device driver missing or outdated',
      'Hardware connection loose or damaged',
      'Device incompatible with current system',
      'Hardware controller or chipset driver issue',
      'USB port or device port not functioning',
      'Hardware device has failed or needs replacement',
    ],

    other: [
      'Multiple system issues occurring simultaneously',
      'Conflicting software or settings',
      'Recently installed software causing issues',
      'System file corruption or damage',
      'Outdated operating system or drivers',
      'Unknown or unidentified system problem',
    ],
  }

  // Existing troubleshooting solutions
  const solutions = {
    'slow-computer': [
      {
        title: 'Disable Unnecessary Startup Programs',
        steps: [
          'Press Ctrl + Shift + Esc to open Task Manager',
          'Click on the "Startup" tab at the top',
          "Look for programs you don't need to start automatically",
          'Right-click on unnecessary programs and select "Disable"',
          'Close Task Manager and restart your computer',
          'Your computer should start faster now',
        ],
      },
      {
        title: 'Clean Up Disk Space and Temporary Files',
        steps: [
          'Press Windows + E to open File Explorer',
          'Right-click your C: drive and select "Properties"',
          'Check how much free space you have',
          'Click "Disk Cleanup" and select files to delete',
          'Check the boxes for Temporary Files, Recycle Bin, and Downloads',
          'Click "Clean up system files" and confirm deletion',
          'This will free up disk space and improve performance',
        ],
      },
      {
  title: 'Check CPU and RAM Usage',
  steps: [
    'Press Ctrl + Shift + Esc to open Task Manager',
    'Click the Processes tab',
    'Click the CPU column to sort processes by CPU usage',
    'Identify applications using unusually high CPU resources',
    'Close only applications that you recognize and do not need',
    'Click the Memory column to check RAM usage',
    'Close unnecessary applications if memory usage is consistently high',
    'Restart your computer and check whether performance improves',
  ],
},
    ],

    'network-problem': [
      {
        title: 'Restart Router and Modem',
        steps: [
          'Locate your router and modem',
          'Unplug the power cable from both devices',
          'Wait for 30 seconds',
          'Plug in the modem first and wait 2 minutes',
          'Then plug in the router and wait another 2 minutes',
          'Wait for all lights to stabilize',
          'Try connecting to WiFi again',
        ],
      },
      {
        title: 'Forget and Reconnect to Your WiFi Network',
        steps: [
          'Go to Settings > Network & Internet > WiFi',
          'Click "Manage known networks"',
          'Find your WiFi network and click "Forget"',
          'Go back to WiFi settings and scan for networks',
          'Select your network from the list',
          'Enter your WiFi password',
          'Click "Connect" and wait for connection',
        ],
      },
      {
        title: 'Update Network Drivers and Reset Network Settings',
        steps: [
          'Right-click Start menu and open Device Manager',
          'Expand "Network adapters"',
          'Right-click your network adapter and select "Update driver"',
          'Choose "Search automatically for updated driver software"',
          'After update, restart your computer',
          'Open Command Prompt as Administrator if the issue continues',
          'Type: ipconfig /all and press Enter',
        ],
      },
    ],

    'printer-problem': [
      {
        title: 'Reinstall Printer Driver',
        steps: [
          'Go to Settings > Devices > Printers & scanners',
          'Find your printer in the list',
          'Click on it and select "Remove device"',
          'Confirm removal',
          "Visit your printer manufacturer's website",
          'Download the latest driver for your printer model',
          'Run the installer and follow the setup wizard',
          'Restart your computer when complete',
        ],
      },
      {
        title: 'Clear Print Queue and Reset Printer',
        steps: [
          'Go to Settings > Devices > Printers & scanners',
          'Click "Open queue" under your printer',
          'Remove any stuck print jobs',
          'Open Command Prompt as Administrator',
          'Type: net stop spooler and press Enter',
          'Type: net start spooler and press Enter',
          'Try printing again',
        ],
      },
      {
        title: 'Check Connection and Supplies',
        steps: [
          'Verify the printer is powered ON',
          'Check that the USB cable or network is properly connected',
          "For WiFi printers, verify it's connected to the same network",
          'Check that paper is loaded',
          'Check ink or toner levels',
          'Look for error messages on the printer display',
          'Replace ink or toner if required',
          'Try a test print',
        ],
      },
    ],

    'app-crash': [
      {
        title: 'Update or Reinstall the Application',
        steps: [
          'Open the application and look for Settings or Help',
          'Look for "Check for Updates"',
          'Install available updates and restart the app',
          'If updates do not help, uninstall the application',
          'Go to Control Panel > Programs > Programs and Features',
          'Find the application and click "Uninstall"',
          'Restart your computer',
          'Download and install the latest version from the official website',
        ],
      },
      {
        title: 'Run in Compatibility Mode',
        steps: [
          'Right-click the application shortcut',
          'Select "Properties"',
          'Click the "Compatibility" tab',
          'Enable compatibility mode',
          'Select an earlier version of Windows',
          'Click "Apply" and then "OK"',
          'Run the application again',
        ],
      },
      {
        title: 'Disable Hardware Acceleration and Extensions',
        steps: [
          'Open the application settings',
          'Look for Advanced or Graphics settings',
          'Find Hardware Acceleration and turn it OFF',
          'Save settings and restart the application',
          'Disable unnecessary browser extensions if applicable',
          'Restart the browser and test the application',
          'Close unnecessary background programs',
        ],
      },
    ],

    'startup-problem': [
      {
        title: 'Boot into Safe Mode and Diagnose',
        steps: [
          'Turn off your computer completely',
          'Turn it back on and open Windows Recovery options',
          'Select Safe Mode',
          'If Safe Mode boots successfully, a software conflict may exist',
          'Try booting normally again',
          'If still stuck, use Safe Mode to uninstall recent programs',
          'Go to Settings > Apps > Installed Apps',
          'Select the recent application and uninstall it',
        ],
      },
      {
        title: 'Run System File Repairs',
        steps: [
          'Open Windows Recovery or Safe Mode',
          'Open Command Prompt as Administrator',
          'Type: sfc /scannow and press Enter',
          'Wait for the scan to complete',
          'Restart your computer',
          'If the issue continues, run DISM /Online /Cleanup-Image /RestoreHealth',
          'Restart the computer after the repair',
        ],
      },
      {
        title: 'Check BIOS Settings and Hardware',
        steps: [
          'Turn off your computer',
          'Turn it back on and open BIOS/UEFI',
          'Look for Boot Order or Boot Sequence',
          'Make sure your system drive is listed correctly',
          'Check hardware settings',
          'Save changes and exit',
          'If hardware is not detected, further hardware diagnosis may be required',
        ],
      },
    ],
        'security-warning': [
      {
        title: 'Run Full System Scan with Antivirus',
        steps: [
          'Open Windows Security or your antivirus software',
          'Click "Virus & threat protection"',
          'Click "Scan options"',
          'Select "Full scan"',
          'Click "Scan now"',
          'Wait for the scan to complete',
          'If threats are found, follow the security software recommendations',
          'Restart your computer if required',
        ],
      },
      {
        title: 'Remove Suspicious Browser Extensions',
        steps: [
          'Open your web browser',
          'Open Extensions or Add-ons',
          'Look for unknown or suspicious extensions',
          'Remove extensions you do not recognize',
          'Check your browser homepage',
          'Clear browser cache using Ctrl + Shift + Delete',
          'Restart your browser',
        ],
      },
      {
        title: 'Update Antivirus and Reset Browser Settings',
        steps: [
          'Open Windows Security or your antivirus software',
          'Update virus definitions',
          'Open browser Settings',
          'Look for Reset settings',
          'Restore browser settings if required',
          'Restart your browser',
          'Consider changing passwords if you suspect account compromise',
        ],
      },
    ],

    'hardware-problem': [
      {
        title: 'Update Hardware Drivers',
        steps: [
          'Right-click the Start button and open Device Manager',
          'Look for devices with yellow warning triangles',
          'Right-click the problematic device',
          'Select "Update driver"',
          'Choose automatic driver search',
          'Install the available driver',
          "If needed, visit the manufacturer's official website",
          'Restart your computer',
        ],
      },
      {
        title: 'Check Device Connections and Settings',
        steps: [
          'If using a USB device, unplug it',
          'Try another USB port',
          'If possible, test the device on another computer',
          'For internal devices, power off the computer',
          'Check cable connections',
          'Power on and check whether the device is recognized',
          'Use Device Manager to check the device status',
          'Restart the computer',
        ],
      },
      {
        title: 'Reset Device and Troubleshoot Hardware',
        steps: [
          'Open Device Manager',
          'Right-click the problematic device',
          'Select "Uninstall device"',
          'Confirm the action',
          'Restart your computer',
          'Windows may reinstall the driver automatically',
          'If the device is still not recognized, further hardware diagnosis may be required',
        ],
      },
    ],

    other: [
      {
        title: 'Perform System Update and Check Drivers',
        steps: [
          'Go to Windows Update',
          'Click "Check for updates"',
          'Install available updates',
          'Restart your computer',
          'Open Device Manager',
          'Look for devices with yellow warning marks',
          'Update required drivers',
          'Restart the computer',
        ],
      },
      {
        title: 'Uninstall Recently Installed Programs',
        steps: [
          'Go to Settings > Apps > Installed Apps',
          'Sort applications by install date',
          'Look for recently installed programs',
          'Select the application',
          'Click "Uninstall"',
          'Restart your computer',
          'Check if the issue is resolved',
          'Reinstall the application from an official source if required',
        ],
      },
      {
        title: 'Run Disk Cleanup and Check Storage',
        steps: [
          'Press Windows + E to open File Explorer',
          'Right-click your main drive',
          'Select "Properties"',
          'Click "Disk Cleanup"',
          'Select appropriate temporary files',
          'Click "Clean up system files"',
          'Confirm deletion',
          'Check available disk space',
          'Back up important files',
        ],
      },
    ],
  }

  // Category names
  const categoryName = {
    'slow-computer': 'Slow Computer',
    'network-problem': 'Network Problem',
    'printer-problem': 'Printer Problem',
    'app-crash': 'Application Crash',
    'startup-problem': 'Startup Problem',
    'security-warning': 'Security/Warning',
    'hardware-problem': 'Hardware Problem',
    other: 'Other Problem',
  }

  // Decode accidental numeric hexadecimal entities in displayed labels.
  // React renders the resulting text safely without innerHTML.
  const decodeDisplayText = (value) => {
    if (typeof value !== 'string') return ''

    return value.replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
  }

  const displayedCategory = decodeDisplayText(
    categoryName[currentProblem.category] ||
      currentProblem.category ||
      'Other Problem'
  )

  // Ensure symptoms are rendered as separate, non-empty labels.
  const displayedSymptoms = Array.isArray(currentProblem.symptoms)
    ? currentProblem.symptoms
        .filter((symptom) => typeof symptom === 'string' && symptom.trim())
        .map((symptom) => decodeDisplayText(symptom.trim()))
    : []

  const possibleCauses =
    causes[currentProblem.category] || causes.other

  const possibleSolutions =
    solutions[currentProblem.category] || solutions.other

  // User answers from DiagnosticQuestions.jsx
  const diagnosticAnswers = currentProblem.diagnosticAnswers || {}

  // Keep the combined answer text for checking conflicting user/system evidence.
  const answerText = Object.values(diagnosticAnswers)
    .join(' ')
    .toLowerCase()

  // Use only the selected Python Agent report.
  const cpuUsage = Number(systemReport?.cpu?.usagePercent ?? 0)
  const ramUsage = Number(systemReport?.memory?.usagePercent ?? 0)
  const diskFree = Number(systemReport?.disk?.freeGB ?? 999)
  const diskUsage = Number(systemReport?.disk?.usagePercent ?? 0)

  const cpuHigh = cpuUsage >= 75
  const ramHigh = ramUsage >= 80
  const diskLow = diskFree < 15 || diskUsage >= 90

  // Exact question IDs and answer options from DiagnosticQuestions.jsx.
  // causeIndex refers to the matching item in the category's causes array.
  const diagnosisRules = {
    'slow-computer': [
      { q: 'q2', answer: 'All programs slow', causeIndex: 0, points: 1, reason: 'Slowness affects all programs.' },
      { q: 'q3', answer: 'CPU usage is very high', causeIndex: 5, points: 3, reason: 'You reported very high CPU usage.' },
      { q: 'q3', answer: 'Memory usage is very high', causeIndex: 1, points: 3, reason: 'You reported very high memory usage.' },
      { q: 'q3', answer: 'Disk usage is very high', causeIndex: 2, points: 3, reason: 'You reported very high disk usage.' },
      { q: 'q4', answer: 'Yes, new software installed', causeIndex: 0, points: 1, reason: 'New software was recently installed.' },
      { q: 'q4', answer: 'Yes, system updates installed', causeIndex: 3, points: 2, reason: 'System updates may be related to driver issues.' },
      { q: 'q5', answer: 'Less than 5%', causeIndex: 2, points: 3, reason: 'You reported critically low available disk space.' },
      { q: 'q5', answer: '5-10%', causeIndex: 2, points: 2, reason: 'You reported limited available disk space.' },
      { q: 'q5', answer: '10-20%', causeIndex: 2, points: 1, reason: 'Available disk space may be limited.' },
    ],

    'network-problem': [
      { q: 'q2', answer: 'Yes, all devices affected', causeIndex: 0, points: 3, reason: 'Multiple devices are affected, suggesting a shared network problem.' },
      { q: 'q2', answer: 'Yes, all devices affected', causeIndex: 2, points: 3, reason: 'Multiple devices are affected, which may indicate an ISP issue.' },
      { q: 'q2', answer: 'No, only this device', causeIndex: 3, points: 3, reason: 'Only this computer is affected, suggesting a device-specific network issue.' },
      { q: 'q2', answer: 'No, only this device', causeIndex: 4, points: 2, reason: 'Only this computer is affected, so DNS configuration may need checking.' },
      { q: 'q3', answer: 'No, no lights', causeIndex: 0, points: 3, reason: 'The router or modem shows no lights.' },
      { q: 'q3', answer: 'Lights are red', causeIndex: 0, points: 3, reason: 'The router or modem is showing red indicator lights.' },
      { q: 'q4', answer: "Yes, but can't connect", causeIndex: 1, points: 2, reason: 'The network is visible, but the computer cannot connect.' },
      { q: 'q4', answer: 'Yes, and connected but no internet', causeIndex: 4, points: 2, reason: 'The device connects to Wi-Fi but has no internet access.' },
      { q: 'q4', answer: 'Yes, and connected but no internet', causeIndex: 2, points: 2, reason: 'A connected network without internet may indicate an ISP problem.' },
      { q: 'q4', answer: 'Network not visible', causeIndex: 0, points: 2, reason: 'The Wi-Fi network is not visible.' },
      { q: 'q4', answer: 'Network not visible', causeIndex: 3, points: 2, reason: 'The missing network may be related to the network adapter or driver.' },
      { q: 'q5', answer: 'Yes, still not working', causeIndex: 0, points: 1, reason: 'Restarting the router did not resolve the issue.' },
      { q: 'q5', answer: 'Yes, it worked temporarily', causeIndex: 0, points: 2, reason: 'The issue returned after a temporary improvement.' },
    ],

    'printer-problem': [
      { q: 'q1', answer: 'Shows error light', causeIndex: 1, points: 1, reason: 'The printer is displaying an error indicator.' },
      { q: 'q3', answer: 'No, not showing', causeIndex: 0, points: 3, reason: 'The printer is not detected by the computer.' },
      { q: 'q3', answer: 'No, not showing', causeIndex: 4, points: 2, reason: 'The printer may have a connection problem.' },
      { q: 'q3', answer: 'Showing but offline', causeIndex: 1, points: 3, reason: 'The printer appears in the device list but is offline.' },
      { q: 'q4', answer: 'Nothing happens', causeIndex: 5, points: 2, reason: 'Print requests do not appear to be processed.' },
      { q: 'q4', answer: 'Error message appears', causeIndex: 0, points: 1, reason: 'The printer displays an error during printing.' },
      { q: 'q4', answer: 'Prints but quality is poor', causeIndex: 3, points: 2, reason: 'Poor print quality may be related to ink or toner.' },
      { q: 'q4', answer: 'Printer shows offline', causeIndex: 1, points: 3, reason: 'The printer reports an offline state.' },
      { q: 'q5', answer: 'Out of paper', causeIndex: 2, points: 3, reason: 'The printer has run out of paper.' },
      { q: 'q5', answer: 'No ink/toner', causeIndex: 3, points: 3, reason: 'The printer has no ink or toner.' },
      { q: 'q5', answer: 'Low on supplies', causeIndex: 3, points: 2, reason: 'The printer reports low supplies.' },
      { q: 'q5', answer: 'Paper jam', causeIndex: 2, points: 3, reason: 'You reported a paper jam.' },
    ],

    'app-crash': [
      { q: 'q1', answer: 'On startup/opening', causeIndex: 0, points: 2, reason: 'The application crashes while opening.' },
      { q: 'q1', answer: 'During a specific action', causeIndex: 0, points: 2, reason: 'The crash occurs during a particular application operation.' },
      { q: 'q1', answer: 'Randomly', causeIndex: 4, points: 2, reason: 'The application crashes at unpredictable times.' },
      { q: 'q1', answer: 'When system is low on resources', causeIndex: 3, points: 3, reason: 'The crash occurs when system resources are low.' },
      { q: 'q2', answer: 'No, outdated', causeIndex: 5, points: 3, reason: 'The application is not up to date.' },
      { q: 'q2', answer: "Can't find updates", causeIndex: 5, points: 1, reason: 'You could not locate application updates.' },
      { q: 'q3', answer: 'Yes, specific error code', causeIndex: 2, points: 2, reason: 'The application reports a specific error code.' },
      { q: 'q3', answer: 'Generic error message', causeIndex: 2, points: 1, reason: 'The application displays an error message before crashing.' },
      { q: 'q3', answer: 'No error, just closes', causeIndex: 4, points: 2, reason: 'The application closes without displaying an error.' },
      { q: 'q3', answer: 'Freezes without message', causeIndex: 3, points: 2, reason: 'The application freezes without an error message.' },
      { q: 'q4', answer: 'Yes, still crashes', causeIndex: 0, points: 2, reason: 'Reinstallation did not resolve the crash.' },
      { q: 'q5', answer: 'Only this account', causeIndex: 4, points: 2, reason: 'The problem is limited to one user account.' },
      { q: 'q5', answer: 'All accounts affected', causeIndex: 2, points: 2, reason: 'The application crashes across user accounts.' },
    ],
        'startup-problem': [
      { q: 'q1', answer: "Nothing, won't start", causeIndex: 4, points: 2, reason: 'The computer does not start.' },
      { q: 'q1', answer: 'Stuck on loading screen', causeIndex: 1, points: 3, reason: 'The operating system gets stuck during loading.' },
      { q: 'q1', answer: 'Shows Windows logo then freezes', causeIndex: 1, points: 3, reason: 'Windows freezes during the boot process.' },
      { q: 'q1', answer: 'Restart loops', causeIndex: 1, points: 3, reason: 'The computer repeatedly restarts during startup.' },
      { q: 'q2', answer: 'Unusual beeping sounds', causeIndex: 5, points: 3, reason: 'Unusual startup beeps may indicate a hardware or memory problem.' },
      { q: 'q2', answer: 'Unusual beeping sounds', causeIndex: 4, points: 2, reason: 'Unusual beeps may indicate a hardware issue.' },
      { q: 'q2', answer: 'No sounds at all', causeIndex: 4, points: 1, reason: 'The computer produces no startup sounds.' },
      { q: 'q3', answer: 'Yes, BIOS works', causeIndex: 1, points: 2, reason: 'BIOS is accessible, but the operating system may not be starting.' },
      { q: 'q3', answer: 'Yes, safe mode works', causeIndex: 3, points: 3, reason: 'Safe Mode works, suggesting a possible software conflict.' },
      { q: 'q3', answer: "No, can't access", causeIndex: 4, points: 2, reason: 'Neither BIOS nor Safe Mode can be accessed.' },
      { q: 'q4', answer: 'Yes, new hardware added', causeIndex: 4, points: 3, reason: 'New hardware was added before the startup problem.' },
      { q: 'q4', answer: 'Yes, removed hardware', causeIndex: 4, points: 2, reason: 'Hardware was removed before the startup problem.' },
      { q: 'q5', answer: 'Power off immediately', causeIndex: 4, points: 3, reason: 'The computer powers off immediately.' },
      { q: 'q5', answer: 'Black screen completely', causeIndex: 4, points: 2, reason: 'The monitor displays a completely black screen.' },
      { q: 'q5', answer: 'Only fan runs', causeIndex: 4, points: 2, reason: 'The fan runs, but the computer does not complete startup.' },
    ],

    'security-warning': [
      { q: 'q1', answer: 'Antivirus warning', causeIndex: 0, points: 3, reason: 'An antivirus warning is being displayed.' },
      { q: 'q1', answer: 'Windows Defender alert', causeIndex: 0, points: 3, reason: 'Windows Defender is displaying an alert.' },
      { q: 'q1', answer: 'Browser security warning', causeIndex: 1, points: 3, reason: 'A security warning is appearing in the browser.' },
      { q: 'q1', answer: 'Suspicious popup', causeIndex: 3, points: 2, reason: 'You reported a suspicious popup.' },
      { q: 'q1', answer: 'Suspicious popup', causeIndex: 0, points: 1, reason: 'The popup may be related to adware or malware.' },
      { q: 'q2', answer: 'In web browser', causeIndex: 3, points: 2, reason: 'The warning appears inside the browser.' },
      { q: 'q2', answer: 'Full-screen warning', causeIndex: 1, points: 1, reason: 'A full-screen security warning is being displayed.' },
      { q: 'q3', answer: 'Yes, after downloading', causeIndex: 0, points: 3, reason: 'The warning appeared after downloading something.' },
      { q: 'q3', answer: 'Yes, after website visit', causeIndex: 1, points: 3, reason: 'The warning appeared after visiting a website.' },
      { q: 'q3', answer: 'Appeared randomly', causeIndex: 0, points: 1, reason: 'The security warning appeared without a known trigger.' },
      { q: 'q4', answer: 'No, outdated', causeIndex: 2, points: 3, reason: 'Your security software is outdated.' },
      { q: 'q4', answer: 'No antivirus installed', causeIndex: 2, points: 2, reason: 'No antivirus software is installed.' },
    ],

    'hardware-problem': [
      { q: 'q1', answer: 'USB device', causeIndex: 1, points: 1, reason: 'The affected device uses a USB connection.' },
      { q: 'q1', answer: 'USB device', causeIndex: 4, points: 1, reason: 'The affected device may involve a USB port.' },
      { q: 'q1', answer: 'Mouse/Keyboard', causeIndex: 1, points: 1, reason: 'The affected device is a mouse or keyboard.' },
      { q: 'q1', answer: 'Monitor/Display', causeIndex: 1, points: 1, reason: 'The affected device is a monitor or display.' },
      { q: 'q1', answer: 'Audio/Speakers', causeIndex: 0, points: 1, reason: 'The audio device may require a driver check.' },
      { q: 'q1', answer: 'Network card', causeIndex: 0, points: 2, reason: 'The affected device is a network adapter.' },
      { q: 'q2', answer: 'After an update', causeIndex: 0, points: 2, reason: 'The hardware problem began after an update.' },
      { q: 'q2', answer: 'After an update', causeIndex: 3, points: 2, reason: 'A driver or chipset issue may have followed the update.' },
      { q: 'q2', answer: 'Just now suddenly', causeIndex: 1, points: 2, reason: 'The hardware stopped working suddenly.' },
      { q: 'q2', answer: 'Gradually over time', causeIndex: 5, points: 2, reason: 'The hardware problem developed gradually.' },
      { q: 'q3', answer: 'No, not showing', causeIndex: 0, points: 2, reason: 'The device is not detected by the system.' },
      { q: 'q3', answer: 'No, not showing', causeIndex: 1, points: 1, reason: 'A connection or device issue may prevent detection.' },
      { q: 'q3', answer: 'Shows with error mark', causeIndex: 0, points: 3, reason: 'Device Manager displays an error indicator.' },
      { q: 'q4', answer: 'No drivers installed', causeIndex: 0, points: 3, reason: 'The required device driver is not installed.' },
      { q: 'q4', answer: 'Outdated drivers', causeIndex: 0, points: 3, reason: 'The device drivers are outdated.' },
      { q: 'q5', answer: 'Yes, works on other PC', causeIndex: 4, points: 2, reason: 'The device works on another computer, suggesting a local port or connection issue.' },
      { q: 'q5', answer: 'Yes, works on other PC', causeIndex: 0, points: 1, reason: 'The device may have a driver issue on this computer.' },
      { q: 'q5', answer: "Yes, doesn't work anywhere", causeIndex: 5, points: 3, reason: 'The device fails on another computer as well.' },
    ],

    other: [
      { q: 'q2', answer: 'Installed new software', causeIndex: 2, points: 3, reason: 'New software was installed before the problem.' },
      { q: 'q2', answer: 'Updated system/drivers', causeIndex: 4, points: 2, reason: 'A system or driver update preceded the problem.' },
      { q: 'q2', answer: 'Made hardware changes', causeIndex: 1, points: 2, reason: 'Hardware changes preceded the problem.' },
      { q: 'q3', answer: 'Severely blocking work', causeIndex: 0, points: 1, reason: 'The issue is severely affecting normal computer use.' },
      { q: 'q4', answer: 'Yes, already tried fixes', causeIndex: 5, points: 1, reason: 'Previous troubleshooting attempts did not resolve the issue.' },
      { q: 'q4', answer: 'Only basic restart', causeIndex: 1, points: 1, reason: 'Only a basic restart has been attempted.' },
    ],
  }

  // Score each possible cause and retain the matching evidence.
  const scoreUserCause = (cause, causeIndex) => {
    const rules =
      diagnosisRules[currentProblem.category] || diagnosisRules.other

    const matchedRules = rules.filter(
      (rule) =>
        rule.causeIndex === causeIndex &&
        diagnosticAnswers[rule.q] === rule.answer
    )

    return {
      score: matchedRules.reduce(
        (total, rule) => total + rule.points,
        0
      ),
      reasons: matchedRules.map((rule) => rule.reason),
    }
  }

  // Evaluate system measurements separately from user-reported answers.
  // The Python Agent currently measures CPU, RAM and disk only.
  const getSystemEvidence = (cause) => {
    const text = cause.toLowerCase()

    const hasSystemReport = Boolean(
      systemReport?.cpu &&
      systemReport?.memory &&
      systemReport?.disk
    )

    if (!hasSystemReport) {
      return {
        systemVerified: false,
        conflicting: false,
        systemScore: 0,
        systemChecked: false,
      }
    }

    const isResourceCategory =
      ['slow-computer', 'app-crash'].includes(currentProblem.category)

    if (!isResourceCategory) {
      return {
        systemVerified: false,
        conflicting: false,
        systemScore: 0,
        systemChecked: false,
      }
    }

    const isCpuCause =
      text.includes('cpu') || text.includes('processor')

    const isRamCause =
      text.includes('ram') || text.includes('memory')

    // Corrected: "drivers" must not be classified as a disk cause.
    const isDiskCause =
      text.includes('disk') ||
      text.includes('hard drive') ||
      text.includes('storage')

    const userClaimsCpu =
      answerText.includes('cpu usage is very high')

    const userClaimsRam =
      answerText.includes('memory usage is very high')

    const userClaimsDisk =
      answerText.includes('disk usage is very high') ||
      answerText.includes('less than 5%') ||
      answerText.includes('5-10%')

    const relevantCpu = isCpuCause
    const relevantRam = isRamCause
    const relevantDisk = isDiskCause

    const systemVerified =
      (relevantCpu && cpuHigh) ||
      (relevantRam && ramHigh) ||
      (relevantDisk && diskLow)

    const conflicting =
      (relevantCpu && userClaimsCpu && !cpuHigh) ||
      (relevantRam && userClaimsRam && !ramHigh) ||
      (relevantDisk && userClaimsDisk && !diskLow)

    return {
      systemVerified,
      conflicting,
      systemScore: systemVerified ? 3 : 0,
      systemChecked: relevantCpu || relevantRam || relevantDisk,
    }
  }

  // Rank causes using user answers and separate system evidence.
  // Rank causes while keeping user and system evidence separate.
const rankedCauses = possibleCauses
  .map((cause, index) => {
    const userEvidence = scoreUserCause(cause, index)
    const systemEvidence = getSystemEvidence(cause)

    return {
      cause,
      userScore: userEvidence.score,
      userReasons: userEvidence.reasons,
      systemScore: systemEvidence.systemScore,
      systemVerified: systemEvidence.systemVerified,
      conflicting: systemEvidence.conflicting,
      systemChecked: systemEvidence.systemChecked,

      // User answers determine the primary ranking.
      // System readings provide separate supporting evidence.
      score: userEvidence.score,
    }
  })
  .sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }

    // When user scores are equal, prefer system-supported evidence.
    if (b.systemVerified !== a.systemVerified) {
      return Number(b.systemVerified) - Number(a.systemVerified)
    }

    return 0
  })

  // Prioritize solutions based on all top user-reported causes.
const rankedSolutions = [...possibleSolutions]

if (currentProblem.category === 'slow-computer') {
  const topCauses = rankedCauses
    .filter((item) => item.userScore > 0)
    .slice(0, 3)

  const solutionPriority = (solution) => {
    const title = solution.title.toLowerCase()
    let priority = 0

    topCauses.forEach((item) => {
      const cause = item.cause.toLowerCase()

      if (
        cause.includes('startup') &&
        title.includes('startup')
      ) {
        priority += item.userScore
      }

      if (
        (cause.includes('hard drive') ||
          cause.includes('disk') ||
          cause.includes('storage')) &&
        title.includes('disk')
      ) {
        priority += item.userScore
      }

      if (
        (cause.includes('cpu') ||
          cause.includes('processor')) &&
        title.includes('cpu')
      ) {
        priority += item.userScore
      }

      if (
        (cause.includes('ram') ||
          cause.includes('memory')) &&
        title.includes('ram')
      ) {
        priority += item.userScore
      }
    })

    return priority
  }

  rankedSolutions.sort(
    (a, b) => solutionPriority(b) - solutionPriority(a)
  )
}
  const severity = currentProblem.severity || 'medium'

  // Save issue to backend.
  const saveIssue = async (status) => {
    if (saving) return

    setSaving(true)
    setSaveError('')

    try {
      const response = await apiFetch('/issues', {
        method: 'POST',
        body: JSON.stringify({
          category:
            categoryName[currentProblem.category] ||
            currentProblem.category,

          description: currentProblem.description || '',

          severity: currentProblem.severity || 'medium',

          diagnosis:
            status === 'Resolved'
              ? rankedCauses[0]?.cause || 'Issue diagnosed'
              : 'Issue not resolved after troubleshooting',

          solution:
            status === 'Resolved'
              ? rankedSolutions[0]?.title || 'Solution applied'
              : 'Requires further assistance',

          status,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.message || `Could not save issue (HTTP ${response.status})`
        )
      }

      setSolutionStatus(
        status === 'Resolved' ? 'solved' : 'pending'
      )

      setTimeout(() => {
        navigate('/history')
      }, 1500)
    } catch (error) {
      setSaveError(
        error.message || 'Could not save your issue. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleProblemSolved = () => saveIssue('Resolved')

  const handleStillNotSolved = () => saveIssue('Pending')

  if (solutionStatus === 'solved') {
    return (
      <div className="solution-container">
        <div className="container">
          <div className="alert alert-success">
            <div
              style={{
                fontSize: '24px',
                marginBottom: '10px',
              }}
            >
              <FiCheck /> Great! Your issue has been marked as resolved.
            </div>

            Redirecting to Issue History...
          </div>
        </div>
      </div>
    )
  }

  if (solutionStatus === 'pending') {
    return (
      <div className="solution-container">
        <div className="container">
          <div className="alert alert-info">
            <div
              style={{
                fontSize: '18px',
                marginBottom: '10px',
              }}
            >
              Your issue has been saved to history. We recommend contacting
              support for further assistance.
            </div>

            Redirecting to Issue History...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="solution-page">
      <div className="container">

        <button
          className="back-btn"
          onClick={() => navigate('/diagnostic')}
        >
          <FiArrowLeft /> Back
        </button>

        <div className="solution-header card">
          <h1>Diagnosis Result</h1>

          <p>
            Based on your responses, we've identified possible causes and
            recommended solutions:
          </p>
        </div>

        <div className="solution-grid">

          {/* Evidence-ranked Possible Causes */}
          <div className="causes-section card">
            <h2>Possible Causes</h2>

            <p>
              User answers and local measurements are shown separately.
              System readings only verify CPU, memory, and storage thresholds;
              they do not prove a hardware fault.
            </p>

            <ul className="causes-list">
              {rankedCauses.map((item, index) => (
                <li className="cause-item" key={item.cause}>
                  <strong className="cause-title">
                   {item.userScore > 0 && index === 0
  ? 'Top user-reported possibility: '
  : item.systemVerified
    ? 'System-supported possibility: '
    : ''}
                    {item.cause}
                  </strong>

                  {item.userReasons.length > 0 && (
                    <ul className="cause-reasons">
                      {item.userReasons.map((reason, reasonIndex) => (
                        <li key={reasonIndex}>{reason}</li>
                      ))}
                    </ul>
                  )}

                  <div
                    className="cause-evidence"
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
                  >
                    {item.userScore > 0 && (
                      <span className="severity-badge severity-medium">
                       User-reported score: {item.userScore}
                      </span>
                    )}

                    {item.systemVerified && (
                      <span className="severity-badge severity-high">
                        System-verified
                      </span>
                    )}

                    {item.conflicting && (
                      <span className="severity-badge severity-medium">
                        Conflicting evidence
                      </span>
                    )}

                    {item.userScore === 0 &&
                      !item.systemVerified &&
                      !item.conflicting && (
                        <span className="severity-badge">
                          {item.systemChecked
                            ? 'Not supported by current measurement'
                            : 'Not yet verified'}
                        </span>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Problem Details */}
          <div className="severity-section card">
            <h2>Problem Details</h2>

            <div className="detail-item">
              <span className="detail-label">Category:</span>

              <span className="detail-value">
                {displayedCategory}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Severity:</span>

              <span
                className={`severity-badge severity-${severity}`}
              >
                {severity.charAt(0).toUpperCase() +
                  severity.slice(1)}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Symptoms:</span>

              <div className="symptoms-tags">
                {displayedSymptoms.length > 0 ? (
                  displayedSymptoms.map((symptom, index) => (
                    <span
                      key={`${symptom}-${index}`}
                      className="symptom-tag"
                    >
                      {symptom}
                    </span>
                  ))
                ) : (
                  <span className="symptom-tag">
                    No specific symptoms selected
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic Evidence */}
        <div className="card diagnostic-evidence">
          <h2>Diagnostic Evidence</h2>

          <p>
            The following answers were provided during diagnosis. Local
            readings are included only when a system report is available.
          </p>

          {Object.keys(diagnosticAnswers).length > 0 ? (
            <ul className="answer-list">
              {Object.entries(diagnosticAnswers).map(
                ([questionId, answer]) => (
                  <li key={questionId}>
                    <strong>{questionId.toUpperCase()}:</strong>{' '}
                    {answer}
                  </li>
                )
              )}
            </ul>
          ) : (
            <p>No diagnostic answers were saved for this report.</p>
          )}

          {systemReport ? (
            <div className="system-measurements">
              <h3>Selected Local System Measurements</h3>

              {selectedReportTimestamp && (
                <p>
                  <strong>Scan time:</strong>{' '}
                  {formattedReportTimestamp}
                </p>
              )}

              <p>
                <strong>CPU:</strong> {systemReport.cpu.usagePercent}% (
                {systemReport.cpu.status})
              </p>

              <p>
                <strong>RAM:</strong> {systemReport.memory.usagePercent}% (
                {systemReport.memory.status})
              </p>

              <p>
                <strong>Disk:</strong> {systemReport.disk.usagePercent}% used,{' '}
                {systemReport.disk.freeGB} GB free
              </p>

              <small>
                These readings are from the report selected for this problem.
                They do not directly test network, printer, malware, or
                physical hardware faults.
              </small>
            </div>
          ) : (
            <p className="no-system-report">
              No system report was selected for this problem. Guidance is
              based only on your diagnostic answers.
            </p>
          )}

          {/* Evidence Differences */}
          {systemReport && (
            <div className="evidence-differences">
              <h3>Evidence Differences</h3>

              {rankedCauses.some((item) => item.conflicting) ? (
                <>
                  <p>
                    Your answers and the selected system scan show different
                    results for the following possible causes:
                  </p>

                  {rankedCauses
                    .filter((item) => item.conflicting)
                    .map((item) => (
                      <div key={item.cause}>
                        <p>
                          <strong>{item.cause}:</strong>
                        </p>
                        <p>
                          Your answer indicates a possible issue, but the
                          selected system scan did not detect it at the time
                          of scanning.
                        </p>
                      </div>
                    ))}

                  <p>
                    <strong>Important:</strong> System measurements are
                    snapshots. CPU, RAM and disk usage can change over time.
                    {selectedReportTimestamp && (
                      <>
                        {' '}This report was scanned on{' '}
                        {formattedReportTimestamp}.
                      </>
                    )}
                  </p>

                  <p>
                    If the problem is still occurring, run a new system scan
                    to check the latest resource usage.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    No conflicting evidence was detected between your answers
                    and the selected system measurements.
                  </p>
                  <p>
                    <strong>Note:</strong> The system scan checks CPU, RAM and
                    disk usage only. It does not verify every possible cause.
                    These measurements are snapshots and may change over time.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Recommended Solutions */}
        <div className="solutions-section">
          <h2>Recommended Solutions</h2>

          <div className="solutions-list">
            {rankedSolutions.map((solution, index) => (
              <div
                key={index}
                className="solution-card card"
              >
                <h3>
                  Solution {index + 1}: {solution.title}
                </h3>

                <ol className="steps-list">
                  {solution.steps.map((step, stepIndex) => (
                    <li key={stepIndex}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="solution-actions">

          {saveError && (
            <p className="error-text" role="alert">
              {saveError}
            </p>
          )}

          <button
            className="btn-primary"
            onClick={handleProblemSolved}
            disabled={saving}
          >
            <FiCheck /> {saving ? 'Saving...' : 'Problem Solved'}
          </button>

          <button
            className="btn-secondary"
            onClick={handleStillNotSolved}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Still Not Solved'}
          </button>

          <button
            className="btn-outline"
            onClick={() => window.print()}
          >
            <FiDownload /> Print Solutions
          </button>

        </div>

      </div>
    </div>
  )
}

export default SolutionPage