import platform
import re
import socket
import subprocess
import time

import psutil


def _default_gateway():
    """Read the IPv4 default gateway from the Windows routing table."""
    try:
        result = subprocess.run(
            ["route", "print", "-4"],
            capture_output=True,
            text=True,
            timeout=5,
            shell=False,
        )
        for line in result.stdout.splitlines():
            parts = line.split()
            if len(parts) >= 3 and parts[0] == "0.0.0.0" and parts[1] == "0.0.0.0":
                return parts[2]
    except (OSError, subprocess.SubprocessError):
        pass
    return None


def run_network_diagnostics():
    """Run read-only local network checks. No network settings are changed."""
    if platform.system() != "Windows":
        raise RuntimeError("Network diagnostics currently support Windows only.")

    interfaces = []
    for name, stats in psutil.net_if_stats().items():
        if not stats.isup:
            continue
        addresses = psutil.net_if_addrs().get(name, [])
        ipv4_addresses = [
            address.address
            for address in addresses
            if address.family == socket.AF_INET
            and not address.address.startswith("127.")
        ]
        if ipv4_addresses:
            interfaces.append({
                "name": name,
                "ipv4Addresses": ipv4_addresses,
                "speedMbps": stats.speed or None,
                "isUp": stats.isup,
            })

    gateway = _default_gateway()

    gateway_check = {
        "target": gateway,
        "reachable": None,
        "message": "Default gateway was not detected.",
    }
    if gateway:
        try:
            ping = subprocess.run(
                ["ping", "-n", "1", "-w", "1500", gateway],
                capture_output=True,
                text=True,
                timeout=3,
                shell=False,
            )
            gateway_check["reachable"] = ping.returncode == 0
            gateway_check["message"] = (
                "Default gateway responded to ping."
                if ping.returncode == 0
                else "Default gateway did not respond to ping. ICMP may be blocked."
            )
        except (OSError, subprocess.SubprocessError) as error:
            gateway_check["message"] = f"Gateway check could not complete: {error}"

    dns_check = {
        "host": "example.com",
        "success": False,
        "resolvedAddresses": [],
        "durationMs": None,
        "message": "",
    }
    dns_start = time.perf_counter()
    try:
        results = socket.getaddrinfo("example.com", 443, type=socket.SOCK_STREAM)
        addresses = sorted({item[4][0] for item in results})
        dns_check.update({
            "success": bool(addresses),
            "resolvedAddresses": addresses,
            "durationMs": round((time.perf_counter() - dns_start) * 1000, 2),
            "message": "DNS resolution succeeded." if addresses else "DNS returned no addresses.",
        })
    except socket.gaierror as error:
        dns_check.update({
            "durationMs": round((time.perf_counter() - dns_start) * 1000, 2),
            "message": f"DNS resolution failed: {error}",
        })

    internet_check = {
        "target": "1.1.1.1:443",
        "reachable": False,
        "durationMs": None,
        "message": "",
    }
    internet_start = time.perf_counter()
    try:
        with socket.create_connection(("1.1.1.1", 443), timeout=3):
            internet_check.update({
                "reachable": True,
                "durationMs": round((time.perf_counter() - internet_start) * 1000, 2),
                "message": "External HTTPS connection succeeded.",
            })
    except OSError as error:
        internet_check.update({
            "durationMs": round((time.perf_counter() - internet_start) * 1000, 2),
            "message": f"External connection failed: {error}",
        })

    return {
        "success": True,
        "message": "Network diagnostics completed. No settings were changed.",
        "checkedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "activeInterfaces": interfaces,
        "gateway": gateway_check,
        "dns": dns_check,
        "internet": internet_check,
        "note": (
            "Ping or connection tests can be blocked by firewalls. "
            "A failed check is evidence to investigate, not proof that the network is down."
        ),
    }


def flush_dns_cache():
    """Clear the Windows DNS resolver cache; call only after explicit user confirmation."""
    if platform.system() != "Windows":
        raise RuntimeError("DNS cache flush currently supports Windows only.")

    try:
        result = subprocess.run(
            ["ipconfig", "/flushdns"],
            capture_output=True,
            text=True,
            timeout=10,
            shell=False,
        )
    except (OSError, subprocess.SubprocessError) as error:
        raise RuntimeError(f"DNS cache flush could not run: {error}") from error

    output = (result.stdout or result.stderr or "").strip()
    if result.returncode != 0:
        raise RuntimeError(output or "Windows could not flush the DNS cache.")

    return {
        "success": True,
        "message": output or "Windows DNS resolver cache was flushed.",
        "action": "flush_dns",
        "note": "This clears cached DNS lookups; it does not change network adapter settings.",
    }
