# 🛡️ Zásady ochrany osobních údajů / Privacy Policy

**Aplikace:** Kalendář směn (Family Shift Calendar)  
**Vývojář:** Patrik Rybka  
**Datum účinnosti / Effective Date:** 6. října 2026 / October 6, 2026  
**Kontakt / Contact:** patrik.rybka.dev@gmail.com  
**Repozitář / Repository:** [github.com/Patrik-Rybka/Shift-Calendar](https://github.com/Patrik-Rybka/Shift-Calendar)

---

## 🇨🇿 Česky

### 1. Úvodní ustanovení
Tento dokument popisuje, jak mobilní aplikace **Kalendář směn** nakládá s osobními a provozními údaji svých uživatelů. Aplikace slouží výhradně pro soukromé rodinné plánování a sdílení pracovních směn.

Aplikace:
- **Nezobrazuje žádné reklamy.**
- **Nesleduje polohu zařízení.**
- **Nepředává ani neprodává žádná uživatelská data třetím stranám.**
- **Neshromažďuje marketingová ani analytická data.**

### 2. Jaké údaje aplikace zpracovává
1. **Uživatelský profil:** Jméno či přezdívka, přihlašovací údaj (e-mail nebo telefonní číslo) a kryptograficky zahashované heslo.
2. **Rozpis směn:** Názvy směn, časy směn, data v kalendáři a poznámky, které uživatel sám do kalendáře zadá.
3. **Rodinná skupina:** Název skupiny a seznam členů, kteří mají do dané rodinné skupiny přístup.
4. **Technická data:** Informace o stavu sítě (online/offline) a verze aplikace pro zajištění synchronizace a aktualizací.

### 3. Zabezpečení a cloudové úložiště
Data jsou uložena v zabezpečené cloudové databázi Neon (Serverless PostgreSQL). Veškerá komunikace mezi aplikací a serverem probíhá šifrovaně přes protokol TLS/HTTPS. Hesla jsou chráněna jednosměrným kryptografickým hashem.

### 4. Oprávnění v zařízení (Android)
Aplikace vyžaduje pouze dvě nezbytná systémová oprávnění:
- `android.permission.INTERNET` – pro synchronizaci směn s rodinnou databází.
- `android.permission.ACCESS_NETWORK_STATE` – pro rozpoznání dostupnosti internetového připojení.

Aplikace nevyžaduje přístup k fotoaparátu, poloze, kontaktům ani k obecnému úložišti souborů.

### 5. Výmaz údajů a práva uživatelů
Uživatelé mohou své záznamy směn a poznámek kdykoliv upravit nebo smazat přímo v aplikaci. Pro kompletní odstranění profilu nebo rodinné skupiny kontaktujte vývojáře na výše uvedeném e-mailu.

---

## 🇬🇧 English

### 1. Overview
This Privacy Policy governs the use of the mobile application **Kalendář směn (Family Shift Calendar)**. The application is designed as a secure private utility for families to coordinate work shifts.

The application:
- **Displays no advertisements.**
- **Does not track user location.**
- **Does not sell or share user data with third-party brokers.**
- **Does not employ commercial marketing analytics.**

### 2. Information Collected
- **Account Credentials:** Display name, identifier (email or phone), and hashed password.
- **Schedule Entries:** Shift presets, scheduled dates, work hours, and notes entered by authorized family members.
- **Family Group:** Group identifier and associated family member profiles.
- **Technical Diagnostics:** Network connectivity state and client app version.

### 3. Storage and Encryption
All application data is securely stored within Neon Database (PostgreSQL). Communication is encrypted in transit using industry-standard TLS/HTTPS protocols. User passwords are stored strictly as cryptographic hashes.

### 4. Android Device Permissions
The application requires only two standard Android permissions:
- `android.permission.INTERNET` – Required for cloud schedule synchronization.
- `android.permission.ACCESS_NETWORK_STATE` – Required to determine network availability.

No sensitive permissions (Camera, Location, Contacts, Audio, Storage) are required or requested.

### 5. Data Deletion and Retention
Users may modify or delete any scheduled entry or member directly within the application. For complete account or group deletion requests, please contact the developer via the email listed above.
