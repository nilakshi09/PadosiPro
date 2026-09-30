/**
 * withNetworkSecurityConfig — Expo Config Plugin
 *
 * This plugin injects a custom Android network_security_config.xml into the
 * native Android project during prebuild (CNG). It also patches the
 * AndroidManifest.xml to reference this config.
 *
 * WHY THIS IS NEEDED:
 * -------------------
 * The `usesCleartextTraffic: true` flag in app.json only sets
 * `android:usesCleartextTraffic="true"` on the <application> tag in the
 * manifest. While this *should* allow HTTP (non-HTTPS) traffic, it can be
 * insufficient on:
 *
 *   1. Android 9+ (API 28+): Some OEM skins and security modules override the
 *      blanket flag and still block cleartext to non-localhost destinations.
 *
 *   2. Android 10+ (API 29+): Network security defaults changed; the OS may
 *      enforce its own default network_security_config that takes precedence
 *      over the manifest attribute when no explicit config file is provided.
 *
 *   3. React Native's OkHttp layer: On some builds, OkHttp reads the network
 *      security config XML directly and ignores the manifest attribute.
 *
 * By providing an explicit network_security_config.xml with domain rules, we
 * bypass all of these edge cases. The XML is the authoritative source of truth
 * for Android's network security policy.
 *
 * PRODUCTION NOTE:
 * ----------------
 * This config broadly allows cleartext traffic for development/testing on LAN.
 * For production, you should either:
 *   - Remove this plugin entirely (use HTTPS everywhere), or
 *   - Restrict <domain-config> to only your production domain with HTTPS pins.
 */

const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');
const {
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * The network_security_config.xml content.
 *
 * This config:
 *   - Sets cleartextTrafficPermitted="true" as the base (global) default
 *   - Explicitly allows cleartext for common LAN IP ranges (10.x, 192.168.x,
 *     172.16-31.x) and localhost/emulator aliases
 *   - Trusts the system CA certificates
 *
 * In production, you would set the base-config to cleartextTrafficPermitted="false"
 * and only whitelist your production domain with certificate pins.
 */
const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<!--
  Network Security Configuration for PadosiPro

  DEVELOPMENT CONFIG: Allows cleartext (HTTP) traffic broadly.
  This is required for connecting to a local backend over LAN (e.g., http://192.168.x.x:3000).

  PRODUCTION: Replace this with a restrictive config that disables cleartext
  and pins certificates for your production domain.
-->
<network-security-config>

    <!-- Base config: allow cleartext globally as a fallback -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <!-- Trust the default system CAs -->
            <certificates src="system" />
        </trust-anchors>
    </base-config>

    <!--
      Explicit domain configs for common development/LAN scenarios.
      These are belt-and-suspenders — the base-config above already allows
      cleartext, but some Android versions/OEMs respect domain-config rules
      more reliably than the base-config.
    -->

    <!-- Android Emulator special alias for host machine -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>

    <!-- Localhost -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
    </domain-config>

    <!--
      Private/LAN IP ranges (RFC 1918).
      Android's domain matching treats these as literal domain strings,
      which works for IP addresses entered in the URL.
    -->

    <!-- 10.0.0.0/8 — common in corporate/VPN networks -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.0.0</domain>
    </domain-config>

    <!-- 192.168.0.0/16 — most home routers -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">192.168.0.0</domain>
    </domain-config>

    <!-- 172.16.0.0/12 — less common, but still RFC 1918 -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">172.16.0.0</domain>
    </domain-config>

</network-security-config>
`;

/**
 * Dangerous mod: writes the network_security_config.xml file into
 * android/app/src/main/res/xml/ during prebuild.
 */
function withNetworkSecurityConfigFile(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      // android/app/src/main/res/xml/
      const xmlDir = path.join(projectRoot, 'app', 'src', 'main', 'res', 'xml');
      const xmlPath = path.join(xmlDir, 'network_security_config.xml');

      // Create the directory if it doesn't exist
      fs.mkdirSync(xmlDir, { recursive: true });

      // Write the XML file
      fs.writeFileSync(xmlPath, NETWORK_SECURITY_CONFIG_XML, 'utf-8');
      console.log(
        `[withNetworkSecurityConfig] Wrote ${xmlPath}`
      );

      return config;
    },
  ]);
}

/**
 * Manifest mod: adds android:networkSecurityConfig="@xml/network_security_config"
 * to the <application> tag in AndroidManifest.xml.
 *
 * This tells Android to use our custom XML file instead of the default policy.
 * We keep usesCleartextTraffic="true" as well (belt and suspenders).
 */
function withNetworkSecurityConfigManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];

    if (application) {
      // Set the networkSecurityConfig attribute
      application.$['android:networkSecurityConfig'] =
        '@xml/network_security_config';

      // Also ensure usesCleartextTraffic is set (belt and suspenders)
      application.$['android:usesCleartextTraffic'] = 'true';

      console.log(
        '[withNetworkSecurityConfig] Added android:networkSecurityConfig to AndroidManifest.xml'
      );
    }

    return config;
  });
}

/**
 * Main plugin export — composes both mods.
 */
function withNetworkSecurityConfig(config) {
  config = withNetworkSecurityConfigFile(config);
  config = withNetworkSecurityConfigManifest(config);
  return config;
}

module.exports = withNetworkSecurityConfig;
