import { Share } from 'react-native';
import Constants from 'expo-constants';

export const APP_VERSION = Constants.expoConfig?.version || '1.0.7';

// Přímý odkaz ke stažení pojmenovaného balíčku s verzí (např. kalendar-smen-v1.0.7.apk)
export const LATEST_RELEASE_APK_URL =
  `https://github.com/Patrik-Rybka/Shift-Calendar/releases/download/v${APP_VERSION}/kalendar-smen-v${APP_VERSION}.apk`;

// Odkaz na oficiální stránku se všemi verzemi
export const GITHUB_RELEASES_PAGE_URL =
  'https://github.com/Patrik-Rybka/Shift-Calendar/releases/latest';

export interface GroupInviteOptions {
  groupName: string;
  joinCode: string;
  password?: string | null;
  requireApproval?: boolean;
}

/**
 * Vytvoří přátelskou a srozumitelnou zprávu pro pozvání člena do rodinného kalendáře
 */
export function formatGroupInviteMessage(options: GroupInviteOptions): string {
  const { groupName, joinCode, password, requireApproval } = options;

  let msg = `📅 Připoj se k nám do Kalendáře směn: „${groupName}“!\n\n`;
  msg += `Všechny naše pracovní směny a rodinné plány máme přehledně na jednom místě.\n\n`;
  msg += `🔑 Kód pro připojení:\n${joinCode}\n\n`;

  if (password && password.trim()) {
    msg += `🔒 Heslo / PIN skupiny: ${password.trim()}\n\n`;
  }

  msg += `📲 Nemáš ještě aplikaci v telefonu?\n`;
  msg += `Stáhni si balíček verze v${APP_VERSION} přímo zde:\n${LATEST_RELEASE_APK_URL}\n\n`;
  msg += `(Seznam všech verzí a novinek: ${GITHUB_RELEASES_PAGE_URL})\n\n`;
  msg += `(Pokud už aplikaci máš, stačí ji otevřít, zadat kód výše a jsi s námi propojen/a!)`;

  if (requireApproval) {
    msg += `\n\n🛡️ Po odeslání žádosti ti správce schválí přístup.`;
  }

  return msg;
}

/**
 * Otevře systémový dialog sdílení (WhatsApp, SMS, Messenger, atd.)
 */
export async function shareGroupInvite(options: GroupInviteOptions): Promise<void> {
  const message = formatGroupInviteMessage(options);
  try {
    await Share.share({
      title: `Pozvánka do Kalendáře směn: ${options.groupName}`,
      message,
    });
  } catch (error) {
    console.error('Chyba při sdílení pozvánky:', error);
  }
}
