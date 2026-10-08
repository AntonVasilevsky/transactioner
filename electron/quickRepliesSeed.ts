import type { QuickReplyTopic } from '../src/utils/quickReplies'

/**
 * First set of quick replies from dev/quick-messages.txt (owner, 2026-10-08), sorted into topics
 * and filled in RU / EN / ES. The owner's own texts are kept as written; the missing languages
 * are translations. Shipped once by migration step 4, so replies the operator edits or deletes
 * stay that way.
 */
export interface QuickReplySeed {
  topic: QuickReplyTopic
  /** Internal key against adding the reply twice; not shown to the operator. */
  title: string
  ru: string
  en: string
  es: string
}

const supportContactsRuEn = `Telegram: @Worldpokerdeals_support
WhatsApp: +420 720 618 415`

const supportLinksRuEn = `Telegram: https://telegram.me/Worldpokerdeals_support WhatsApp: https://wa.me/420720618415
Discord: https://discord.gg/ynt7YgGzcN`

// Returns (owner, 2026-10-08): one English version (with the formal Russian one) and one Spanish
// version in "tú" (with the informal Russian one).
const registrationFollowUpEn = `Hello,
How's it going? I just wanted to check in and see if you found the right options for you? What do you think about the terms? Are you planning to register?
If you have any questions or need more info, feel free to reach out.`

const chicoConverterLink = 'https://kingshands.com/handhistory-converters/chico-poker-converter/'

export const QUICK_REPLIES_2026_10: QuickReplySeed[] = [
  {
    topic: 'greeting',
    title: 'Чем могу помочь?',
    ru: 'Привет! Чем могу помочь?',
    en: 'Hi! How can I help you?',
    es: 'Hola! Cómo puedo ayudarte?',
  },
  {
    topic: 'greeting',
    title: 'Мы снова онлайн',
    ru: 'Привет. Мы снова онлайн.\nЧем могу помочь?',
    en: "Hi. We're back online.\nHow can I help you?",
    es: 'Hola. Ya estamos online de nuevo.\n¿En qué puedo ayudarte?',
  },
  {
    topic: 'bindings',
    title: 'Проверим привязку, до 48 часов',
    ru: 'Ок. Мы проверим привязку аккаунта и сообщим результат. Это может занять до 48 часов. Лучше не использовать аккаунт, пока привязка не подтверждена.',
    en: 'We’ll check the account tracking status, it might take up to 48 hours. Do not deposit until then.',
    es: 'Ok. Revisaremos el estado de tracking de la cuenta y te avisaremos. Puede tardar hasta 48 horas. No hagas ningún depósito hasta entonces.',
  },
  {
    topic: 'payments',
    title: 'Депозит зачислен',
    ru: 'Готово, депозит зачислен.',
    en: 'The deposit has been made.',
    es: 'Listo, el depósito fue acreditado.',
  },
  {
    topic: 'payments',
    title: 'Вывод обработан',
    ru: 'Готово, вывод обработан.',
    en: 'The withdrawal has been made.',
    es: 'Listo, el retiro fue procesado.',
  },
  {
    topic: 'payments',
    title: 'WPT Global: вывод переводом на наш аккаунт',
    ru: 'Для вывода переведите средства на наш аккаунт в руме: McGregorUFC / ID 90368 / alexey@worldpokerdeals.com и пришлите мне скриншот.',
    en: 'For the withdrawal, transfer to our account in the room: McGregorUFC / ID 90368 / alexey@worldpokerdeals.com and send me a screenshot.',
    es: 'Para el retiro, transfiere a nuestra cuenta en la sala: McGregorUFC / ID 90368 / alexey@worldpokerdeals.com y envíame una captura de pantalla.',
  },
  {
    topic: 'payments',
    title: 'RedStar: вывод переводом на наш аккаунт',
    ru: 'Для вывода переведите средства на наш аккаунт в руме: sugak92 и пришлите мне скриншот.',
    en: 'For the withdrawal, transfer to our account in the room: sugak92 and send me a screenshot.',
    es: 'Para el retiro, transfiere a nuestra cuenta en la sala: sugak92 y envíame una captura de pantalla.',
  },
  {
    topic: 'stats',
    title: 'Запрошу статистику',
    ru: 'Сейчас запрошу вашу статистику.',
    en: "I'll request your statistics now.",
    es: 'Ahora voy a solicitar tus estadísticas.',
  },
  {
    topic: 'stats',
    title: 'Вот статистика',
    ru: 'Вот ваша статистика.',
    en: 'Here are your statistics.',
    es: 'Aquí están tus estadísticas.',
  },
  {
    topic: 'apps',
    title: 'Создам группу с Давидом',
    ru: 'Я создам групповой чат с нашим специалистом по клубам и приложениям Давидом, он вам поможет.',
    en: "I'll create a group chat with our clubs and apps specialist, David, he will help you.",
    es: 'Voy a crear un chat grupal con nuestro especialista en clubes y aplicaciones, David, él te ayudará.',
  },
  {
    topic: 'apps',
    title: 'Не могу добавить в группу: писать Давиду',
    ru: 'Не получается добавить вас в группу. Напишите, пожалуйста, напрямую @David_wpd.',
    en: "I can't add you to the group. Please message @David_wpd directly.",
    es: 'No puedo añadirte al grupo. Escríbele directamente @David_wpd.',
  },
  {
    topic: 'apps',
    title: 'В группе: позвать Давида',
    ru: 'Всем привет. @David_wpd, помоги, пожалуйста.',
    en: 'Hello, everyone. @David_wpd please help',
    es: '',
  },
  {
    topic: 'apps',
    title: 'Контакты Давида (клубы и приложения)',
    ru: 'Пожалуйста, свяжитесь с нашим коллегой Давидом. Он отвечает за клубы и приложения.\nTelegram: @David_wpd\nWhatsApp: +7 961 288-58-78',
    en: 'Please contact our colleague David. He is responsible for the clubs and apps.\nTelegram: @David_wpd\nWhatsapp: +7 961 288-58-78',
    es: 'Por favor, contacta a nuestro compañero David. Él se encarga de los clubes y las aplicaciones.\nTelegram: @David_wpd\nWhatsApp: +7 961 288-58-78',
  },
  {
    topic: 'contacts',
    title: 'Контакты поддержки',
    ru: supportContactsRuEn,
    en: supportContactsRuEn,
    es: 'Whatsapp: +57 305 4474330\nTelegram:@Worldpokerdeals_soporte',
  },
  {
    topic: 'contacts',
    title: 'Контакты поддержки: ссылки',
    ru: supportLinksRuEn,
    en: supportLinksRuEn,
    es: 'Telegram: https://telegram.me/Worldpokerdeals_soporte WhatsApp: https://wa.me/573054474330',
  },
  {
    topic: 'returns',
    title: 'Ознакомились с условиями? (на «вы»)',
    ru: 'Здравствуйте.\nСкажите, пожалуйста, ознакомились ли вы с условиями сделки?\nПланируете ли регистрироваться?\nЕсли есть вопросы или нужна дополнительная информация - обращайтесь.',
    en: registrationFollowUpEn,
    es: '',
  },
  {
    topic: 'returns',
    title: 'Планируешь регистрироваться? (на «ты»)',
    ru: 'Привет.\nСкажи, пожалуйста, планируешь ли регистрироваться?\nЕсли есть вопросы или нужна дополнительная информация - обращайся.',
    en: '',
    es: 'Hola, ¿cómo va todo? Solo quería pasar a ver si ya encontraste las opciones que te encajan. ¿Qué te parecen las condiciones? ¿Tienes pensado registrarte? Si tienes alguna pregunta o necesitas más información, escríbeme.',
  },
  {
    topic: 'soft',
    title: 'Chico converter: лицензия',
    ru: `Скачайте конвертер по ссылке и пришлите нам ваш Hardware ID и почту. Мы оформим лицензию и отправим вам ключ.\n${chicoConverterLink}`,
    en: `Download the converter from the link and send us your Hardware ID and email. We'll arrange the license and send you the key.\n${chicoConverterLink}`,
    es: `Descargá el convertidor desde el enlace y mandanos tu Hardware ID y tu correo. Vamos a gestionar la licencia y te vamos a enviar la clave.\n${chicoConverterLink}`,
  },
  {
    topic: 'other',
    title: 'Часы работы',
    ru: 'Мы работаем ежедневно с 7:00 до 22:00 CET.',
    en: 'We work daily from 7:00 to 22:00 CET',
    es: 'Trabajamos todos los días de 7:00 a 22:00 CET.',
  },
]
