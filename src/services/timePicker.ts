import { DatePicker } from '@capgo/capacitor-date-picker'
import { langTag, tr } from '~/i18n/translate'

/** One native time picker for the whole app: iOS wheels on paper and ink instead of the compact pill in an alert. */
export async function pickTime(title: string, current: string): Promise<string | null> {
  const res = await DatePicker.present({
    mode: 'time',
    format: 'HH:mm',
    is24h: true,
    date: current,
    title,
    locale: langTag.value,
    doneText: tr('Done'),
    cancelText: tr('Cancel'),
    ios: {
      style: 'wheels',
      bgColor: '#f6f4ef',
      fontColor: '#141414',
      titleBgColor: '#f6f4ef',
      titleFontColor: '#141414',
      buttonBgColor: '#141414',
      buttonFontColor: '#f6f4ef',
    },
  }).catch(() => null)
  return res?.value ?? null
}
