# Apple Wallet Certificate Setup

This directory should contain the certificates required for generating Apple Wallet passes.

## Required Files

1. **wwdr.pem** - Apple Worldwide Developer Relations Intermediate Certificate
2. **signerCert.pem** - Your Pass Type ID certificate
3. **signerKey.pem** - Private key for your Pass Type ID certificate

## Setup Instructions

### 1. Create a Pass Type ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/passTypeId)
2. Click the "+" button to create a new identifier
3. Select "Pass Type IDs" and continue
4. Enter a description (e.g., "Etcha Event Tickets")
5. Enter an identifier (e.g., `pass.com.etcha.tickets`)
6. Register the Pass Type ID

### 2. Create a Pass Type ID Certificate

1. In the Apple Developer Portal, select your Pass Type ID
2. Click "Create Certificate"
3. Follow the instructions to create a Certificate Signing Request (CSR) using Keychain Access
4. Upload the CSR and download the certificate
5. Double-click to install it in Keychain Access

### 3. Export the Certificate and Key

1. Open Keychain Access
2. Find your Pass Type ID certificate under "My Certificates"
3. Right-click and export as .p12 file
4. Convert to PEM format:

```bash
# Extract the certificate
openssl pkcs12 -in pass.p12 -clcerts -nokeys -out signerCert.pem

# Extract the private key
openssl pkcs12 -in pass.p12 -nocerts -out signerKey.pem
```

### 4. Download WWDR Certificate

Download the Apple Worldwide Developer Relations Intermediate Certificate:

```bash
curl -o wwdr.pem https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
```

Or download directly from: https://www.apple.com/certificateauthority/

### 5. Configure Environment Variables

Add these to your `.env` file:

```env
APPLE_WALLET_CERTS_PATH=./certs/apple-wallet
APPLE_TEAM_ID=YOUR_10_CHAR_TEAM_ID
APPLE_PASS_TYPE_ID=pass.com.etcha.tickets
APPLE_WALLET_PASSPHRASE=your_passphrase_if_set
```

## Pass Model Assets

The pass model directory (`pass-models/eventTicket.pass/`) should contain:

- `pass.json` - Pass definition (already created)
- `icon.png` - 29x29 icon
- `icon@2x.png` - 58x58 icon
- `icon@3x.png` - 87x87 icon
- `logo.png` - 160x50 logo (max)
- `logo@2x.png` - 320x100 logo
- `strip.png` - 375x123 strip image (optional, for event image)
- `strip@2x.png` - 750x246 strip image

## Security Notes

- Never commit certificates to version control
- Add this directory to `.gitignore`
- Store certificates securely in production (e.g., encrypted secrets)
