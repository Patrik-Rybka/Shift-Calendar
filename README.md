<div align="center">

  <img src="assets/images/icon.png" width="128" height="128" style="border-radius: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);" alt="Logo Kalendář směn" />

  # 📅 Kalendář směn (Family Shift Calendar)
  
  **Moderní, rychlá a přehledná mobilní aplikace pro plánování a sdílení pracovních směn celé rodiny.**

  <br/>

  [![Stáhnout nejnovější APK](https://img.shields.io/badge/📲_STÁHNOUT_PŘÍMO_APK-Nejnovější_verze-10B981?style=for-the-badge&logo=android&logoColor=white)](https://github.com/Patrik-Rybka/Shift-Calendar/releases/latest)
  [![Všechna vydání](https://img.shields.io/badge/📦_Všechna_vydání-Releases-3B82F6?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Patrik-Rybka/Shift-Calendar/releases)

  <br/><br/>

  [![Platform](https://img.shields.io/badge/Platforma-Android%20(Samostatné%20APK)-brightgreen?style=flat-square&logo=android)](https://github.com/Patrik-Rybka/Shift-Calendar/releases/latest)
  [![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?style=flat-square&logo=react)](https://reactnative.dev/)
  [![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-000020?style=flat-square&logo=expo)](https://expo.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Database](https://img.shields.io/badge/Databáze-Neon%20PostgreSQL-00E599?style=flat-square&logo=postgresql)](https://neon.tech/)
  [![Autoupdater](https://img.shields.io/badge/Autoupdater-GitHub%20Releases-orange?style=flat-square&logo=github)](https://github.com/Patrik-Rybka/Shift-Calendar/releases)

</div>

---

## 📥 Přímé stažení aplikace pro Android

<div align="center">

### 👉 [**KLIKNĚTE ZDE PRO STAŽENÍ INSTALAČNÍHO BALÍČKU .APK**](https://github.com/Patrik-Rybka/Shift-Calendar/releases/latest) 👈

*Stáhněte instalační soubor `kalendar-smen.apk` do svého mobilu s Androidem a otevřete jej pro instalaci.*

</div>

---

## ✨ Klíčové funkce aplikace

* 👨‍👩‍👧‍👦 **Sdílení směn v reálném čase:** Všichni členové rodiny vidí směny ostatních na jednom přehledném měsíčním kalendáři. Propojení probíhá jednoduše zadáním 6místného kódu rodiny.
* ⚡ **Blesková odezva (0 ms) & Plná Offline podpora:** Aplikace funguje i bez připojení k internetu. Vše se okamžitě ukládá do mobilu a po připojení se data automaticky synchronizují s cloudovou Neon PostgreSQL databází.
* 🎨 **5 volitelných stylů buněk kalendáře:**
  1. **Barevné bloky (Plný text)** – styl klasického kalendáře směn s celým názvem směny i jménem člena rodiny bez jakéhokoliv ořezávání.
  2. **Celé probarvení políčka** – políčko dne se zabarví barvou směny (při více směnách rozděleno napůl).
  3. **Barevný proužek** – políčko s kompaktní barevnou lištou na spodním okraji.
  4. **Barevné pilulky / odznáčky** – zaoblené moderní štítky s puntíkem a názvem směny.
  5. **Minimalistické tečky** – čisté barevné puntíky pod číslem dne pro maximální přehlednost.
* 🇨🇿 **České státní svátky & Čísla týdnů:** Automatický výpočet všech pevných i pohyblivých svátků (Velikonoce) a volitelné zobrazení ISO čísel týdnů na okraji mřížky.
* 🔒 **Bezpečnost rodiny & Správa oprávnění:** Volitelná ochrana kalendáře heslem/PINem, schvalování nových členů správcem a možnost vytvářet virtuální profily pro rodinné příslušníky bez smartphonu.
* 🔄 **Integrovaný Autoupdater:** Aplikace sama pozná, když na GitHubu vydáte novou verzi, nabídne stažení a na jedno klepnutí se sama zaktualizuje.
* 🌓 **Tmavý & Světlý režim:** Plná podpora nočního šetřícího režimu i automatického přizpůsobení systému, včetně nastavení velikosti písma a kompaktní výšky buněk.

---

## 📱 Návod k instalaci do telefonu

1. V mobilním prohlížeči otevřete odkaz **[Stáhnout nejnovější APK](https://github.com/Patrik-Rybka/Shift-Calendar/releases/latest)**.
2. Stáhněte soubor `kalendar-smen.apk`.
3. V oznámení telefonu nebo ve složce *Stažené soubory* na soubor klepněte:
   - Pokud se telefon zeptá na *„Povolit instalaci neznámých aplikací z tohoto zdroje“* (např. Chrome), potvrďte v nastavení povolení.
4. Klikněte na **Instalovat** a poté **Otevřít**.
5. Zadejte 6místný kód vaší rodinné skupiny a kalendář je připraven!

---

## 🔄 Jak fungují automatické aktualizace

Aplikace má v sobě integrovaný modul pro přímé aktualizace z tohoto GitHub repozitáře:
1. Jakmile vydáte novou verzi na GitHubu (v sekci *Releases*), aplikace ji při dalším otevření (nebo po klepnutí na *„Zkontrolovat aktualizace“* v sekci *Nastavení ➔ O aplikaci*) automaticky detekuje.
2. Zobrazí se okno s přehledem změn a tlačítkem **„Stáhnout a instalovat“**.
3. Aplikace stáhne balíček s živým ukazatelem průběhu a rovnou spustí systémový instalátor pro bleskovou aktualizaci bez ztráty dat.

---

## 🛠️ Jak sestavit nový instalační balíček .APK

Kdykoliv budete chtít vygenerovat nové APK, máte 2 možnosti:

### Možnost 1: Přímo v prohlížeči přes GitHub Actions (Bez počítače)
1. V horním menu tohoto repozitáře klikněte na záložku **Actions**.
2. V levém sloupci vyberte **Sestavit Android APK (GitHub CI)**.
3. Vpravo klikněte na **Run workflow** ➔ a potvrďte zeleným **Run workflow**.
4. Za cca 5 minut se v sekci *Artifacts* objeví hotový soubor `kalendar-smen.apk`.

### Možnost 2: V počítači na jeden dvojklik
V hlavní složce projektu stačí pouze dvakrát kliknout na:
* **`build-apk.bat`** (Windows dávkový skript) nebo spustit `build-apk.ps1` (PowerShell).

---

## 💻 Lokální vývoj (Local Development)

```bash
# 1. Klonování repozitáře
git clone https://github.com/Patrik-Rybka/Shift-Calendar.git
cd Shift-Calendar

# 2. Instalace balíčků
npm install

# 3. Spuštění vývojového serveru
npx expo start
```

---

<div align="center">
  <sub>Vytvořeno s ❤️ pro celou rodinu</sub>
</div>
