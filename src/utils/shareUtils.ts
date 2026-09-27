import { Share } from 'react-native';

export const LATEST_RELEASE_APK_URL =
  'https://github.com/Patrik-Rybka/Shift-Calendar/releases/latest/download/kalendar-smen.apk';

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
  msg += `Stáhni si ji jedním klikem zde:\n${LATEST_RELEASE_APK_URL}\n\n`;
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
